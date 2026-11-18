"""Tests for AI Tutor WebSocket and persistent chat history."""

import json
from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from src.api.app import app
from src.database.connection import DatabaseManager, get_db_manager
from src.database.models import AIPracticeRecord
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


def test_practice_drills_stay_out_of_tutor_chat(client, alice_auth, api_db_manager):
    """Practice MCQs must never appear in tutor chat history; no-PDF practice is logged instead."""
    headers = alice_auth["headers"]
    client.delete("/api/v1/tutor/history", headers=headers)

    drill = json.dumps({
        "questions": [{
            "question": "What is a deadlock?",
            "options": ["A) Waiting cycle", "B) Other"],
            "correct_option_index": 0,
            "explanation": "Processes block each other.",
        }],
        "insufficient": False,
        "message": "",
    })
    mock_result = MagicMock()
    mock_result.question = "Operating systems"
    mock_result.answer = drill
    mock_result.is_grounded = False
    mock_result.sources = []
    mock_result.source_kind = "general_ai"

    with patch("src.api.routers.tutor.get_rag_service") as mock_get_rag:
        mock_rag_inst = MagicMock()
        mock_rag_inst.generate_practice_question.return_value = mock_result
        mock_get_rag.return_value = mock_rag_inst
        res = client.post(
            "/api/v1/tutor/ask",
            headers=headers,
            json={"question": "Operating systems", "mode": "practice", "topic": "Operating systems"},
        )

    assert res.status_code == 200
    body = res.json()
    assert body["source_kind"] == "general_ai"
    assert body["practice_record_id"]

    assert client.get("/api/v1/tutor/history", headers=headers).json() == []

    with api_db_manager.get_session() as session:
        records = session.execute(select(AIPracticeRecord)).scalars().all()
        assert any(r.student_id == "alice_ws" and r.topic == "Operating systems" for r in records)


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


def test_tutor_websocket_preserves_exact_bubble_order_and_ack(client, alice_auth):
    """Verify student_ack, monotonic seq, in_reply_to anchoring, and exact order across WS reconnects."""
    token = alice_auth["token"]
    client.delete("/api/v1/tutor/history", headers=alice_auth["headers"])

    def _fake_answer(question, **_kwargs):
        r = MagicMock()
        r.question = question
        r.answer = f"Answer for: {question}"
        r.is_grounded = False
        r.sources = []
        r.source_kind = "general_ai"
        return r

    with patch("src.api.routers.tutor.get_rag_service") as mock_get_rag:
        mock_rag = MagicMock()
        mock_rag.answer_question.side_effect = _fake_answer
        mock_get_rag.return_value = mock_rag

        with client.websocket_connect(f"/api/v1/tutor/ws?token={token}") as ws:
            assert ws.receive_json()["type"] == "connected"
            assert ws.receive_json()["type"] == "history"

            # Turn 1
            ws.send_json({"type": "question", "client_msg_id": "c-1", "question": "First Q", "mode": "qa"})
            ack1 = ws.receive_json()
            assert ack1["type"] == "student_ack"
            assert ack1["client_msg_id"] == "c-1"
            assert ack1["seq"] == 1

            status1 = ws.receive_json()
            assert status1["type"] == "status"

            ans1 = ws.receive_json()
            assert ans1["type"] == "answer"
            assert ans1["seq"] == 2
            assert ans1["in_reply_to"] == ack1["id"]
            assert ans1["text"] == "Answer for: First Q"

            # Turn 2
            ws.send_json({"type": "question", "client_msg_id": "c-2", "question": "Second Q", "mode": "qa"})
            ack2 = ws.receive_json()
            assert ack2["type"] == "student_ack"
            assert ack2["client_msg_id"] == "c-2"
            assert ack2["seq"] == 3

            assert ws.receive_json()["type"] == "status"

            ans2 = ws.receive_json()
            assert ans2["type"] == "answer"
            assert ans2["seq"] == 4
            assert ans2["in_reply_to"] == ack2["id"]

        # Reconnect and confirm exact bubble positions are preserved
        with client.websocket_connect(f"/api/v1/tutor/ws?token={token}") as ws2:
            assert ws2.receive_json()["type"] == "connected"
            hist = ws2.receive_json()
            assert hist["type"] == "history"
            msgs = hist["messages"]
            assert [(m["seq"], m["sender"], m["text"]) for m in msgs] == [
                (1, "student", "First Q"),
                (2, "tutor", "Answer for: First Q"),
                (3, "student", "Second Q"),
                (4, "tutor", "Answer for: Second Q"),
            ]
