"""Tests for support ticket endpoints."""

import pytest
from fastapi.testclient import TestClient

from src.api.app import app
from src.database.connection import DatabaseManager, get_db_manager
from src.database.schema import create_tables, drop_tables


@pytest.fixture(scope="module")
def support_db_manager():
    mgr = DatabaseManager(database_url="sqlite:///:memory:")
    create_tables(mgr)
    yield mgr
    drop_tables(mgr)
    mgr.dispose()


@pytest.fixture(scope="module")
def client(support_db_manager):
    app.dependency_overrides[get_db_manager] = lambda: support_db_manager
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def auth_header(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "username": "support_student",
            "password": "SecurePassword123!",
            "email": "student@support.edu",
            "full_name": "Support Student",
        },
    )
    res = client.post(
        "/api/v1/auth/login",
        json={"username": "support_student", "password": "SecurePassword123!"},
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_and_list_support_tickets(client, auth_header):
    # Initially no tickets
    res0 = client.get("/api/v1/support/tickets", headers=auth_header)
    assert res0.status_code == 200
    assert res0.json() == []

    # Create ticket
    payload = {
        "category": "Course Syllabus",
        "subject": "Missing Lecture 4 notes in PDF",
        "message": "When I upload my PDF, Lecture 4 pages seem to have low OCR clarity.",
    }
    res = client.post("/api/v1/support/tickets", json=payload, headers=auth_header)
    assert res.status_code == 201
    data = res.json()
    assert data["subject"] == "Missing Lecture 4 notes in PDF"
    assert data["status"] == "OPEN"
    assert data["student_id"] == "support_student"

    # List tickets
    res2 = client.get("/api/v1/support/tickets", headers=auth_header)
    assert res2.status_code == 200
    tickets = res2.json()
    assert len(tickets) == 1
    assert tickets[0]["id"] == data["id"]
