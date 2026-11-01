"""Tests for AI Tutor WebSocket and persistent chat history."""

import json
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient

from src.api.app import app
from src.database.connection import DatabaseManager, get_db_manager
from src.database.schema import create_tables, drop_tables


@pytest.fixture(scope="module")
def api_db_manager():
    """Isolated in-memory SQLite database for FastAPI integration tests."""
    mgr = DatabaseManager(database_url="sqlite:///:memory:")
    create_tables(mgr)
    yield mgr
    drop_tables(mgr)
    mgr.dispose()


@pytest.fixture(scope="module")
def client(api_db_manager):
    """TestClient bound to isolated database manager via dependency overrides."""
    app.dependency_overrides[get_db_manager] = lambda: api_db_manager
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="module")
def alice_auth(client):
    """Register and authenticate Alice, returning token and auth header."""
    client.post(
        "/api/v1/auth/register",
        json={
            "username": "alice_ws",
            "password": "SecurePassword123!",
            "email": "alice_ws@university.edu",
            "full_name": "Alice WebSocket",
        },
    )
    res = client.post(
        "/api/v1/auth/login",
        json={"username": "alice_ws", "password": "SecurePassword123!"},
    )
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {
        "token": token,
        "headers": {"Authorization": f"Bearer {token}"},
        "student_id": "alice_ws",
    }


def test_tutor_chat_history_lifecycle(client, alice_auth):
    """Test getting and clearing chat history via HTTP."""
    headers = alice_auth["headers"]

    # 1. Initially history is empty
    res = client.get("/api/v1/tutor/history", headers=headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)

    # 2. Mock RAG service and ask a question via HTTP
    mock_result = MagicMock()
    mock_result.question = "What is authentication?"
    mock_result.answer = "Authentication verifies identity."
    mock_result.is_grounded = True
    mock_result.sources = []

    with patch("src.api.routers.tutor.get_rag_service") as mock_get_rag:
        mock_rag_inst = MagicMock()
        mock_rag_inst.answer_question.return_value = mock_result
        mock_get_rag.return_value = mock_rag_inst

        res_ask = client.post(
            "/api/v1/tutor/ask",
            headers=headers,
            json={"question": "What is authentication?", "mode": "qa"},
        )
        assert res_ask.status_code == 200

    # 3. History now has student question and tutor answer
    res_history = client.get("/api/v1/tutor/history", headers=headers)
    assert res_history.status_code == 200
    history = res_history.json()
    assert len(history) >= 2
    assert history[-2]["sender"] == "student"
    assert history[-2]["text"] == "What is authentication?"
    assert history[-1]["sender"] == "tutor"
    assert history[-1]["text"] == "Authentication verifies identity."

    # 4. Clear history
    res_clear = client.delete("/api/v1/tutor/history", headers=headers)
    assert res_clear.status_code == 200

    # 5. History is empty again
    res_empty = client.get("/api/v1/tutor/history", headers=headers)
    assert res_empty.status_code == 200
    assert len(res_empty.json()) == 0


def test_tutor_websocket_connection_and_interaction(client, alice_auth):
    """Test WebSocket connection, history reception, and ping/pong."""
    token = alice_auth["token"]

    with client.websocket_connect(f"/api/v1/tutor/ws?token={token}") as ws:
        # 1. First message is connected acknowledgment
        msg1 = ws.receive_json()
        assert msg1["type"] == "connected"
        assert msg1["student_id"] == "alice_ws"

        # 2. Second message is previous history
        msg2 = ws.receive_json()
        assert msg2["type"] == "history"
        assert isinstance(msg2["messages"], list)

        # 3. Ping/pong heartbeat
        ws.send_json({"type": "ping"})
        msg_pong = ws.receive_json()
        assert msg_pong["type"] == "pong"
