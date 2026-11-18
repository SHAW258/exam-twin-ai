"""Tests for Administrator account, RBAC isolation, full DB table explorer, and cross-student PDF visibility."""

import pytest
from fastapi.testclient import TestClient

from src.api.app import create_app
from src.api.auth import hash_password
from src.database.connection import DatabaseManager, get_db_manager
from src.database.models import AccessLevel, Document, DocumentChunk, DocumentPage, ProcessingStatus
from src.database.schema import create_tables, ensure_default_admin
from src.learner_state.models import Student


@pytest.fixture
def admin_client(tmp_path):
    db_file = tmp_path / "test_admin.db"
    db_mgr = DatabaseManager(database_url=f"sqlite:///{db_file.as_posix()}")
    create_tables(db_mgr)
    ensure_default_admin(db_mgr)

    # Seed two regular students + PDFs belonging to each
    with db_mgr.get_session() as session:
        s1 = Student(
            external_student_id="alice_stud",
            email="alice@codeknot.ai",
            full_name="Alice Learner",
            hashed_password=hash_password("AlicePass123"),
            is_active=True,
            is_admin=False,
        )
        s2 = Student(
            external_student_id="bob_stud",
            email="bob@codeknot.ai",
            full_name="Bob Learner",
            hashed_password=hash_password("BobPass123"),
            is_active=True,
            is_admin=False,
        )
        session.add_all([s1, s2])
        session.flush()

        d1 = Document(
            owner_user_id="alice_stud",
            filename="alice_os.pdf",
            original_filename="OS_Notes.pdf",
            access_level=AccessLevel.PRIVATE.value,
            processing_status=ProcessingStatus.PROCESSED.value,
        )
        d2 = Document(
            owner_user_id="bob_stud",
            filename="bob_dbms.pdf",
            original_filename="DBMS_Guide.pdf",
            access_level=AccessLevel.PRIVATE.value,
            processing_status=ProcessingStatus.PROCESSED.value,
        )
        session.add_all([d1, d2])
        session.flush()

        p1 = DocumentPage(document_id=d1.id, page_number=1, text="Virtual memory allows execution of processes.")
        p2 = DocumentPage(document_id=d2.id, page_number=1, text="ACID properties ensure reliable transactions.")
        session.add_all([p1, p2])
        session.flush()

        c1 = DocumentChunk(
            document_id=d1.id,
            page_id=p1.id,
            page_number=1,
            chunk_index=0,
            text="Virtual memory allows execution of processes.",
            embedding="[0.1, 0.2, 0.3]",
        )
        session.add(c1)

    app = create_app()
    app.dependency_overrides[get_db_manager] = lambda: db_mgr
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()
    db_mgr.dispose()


def _login(client: TestClient, username: str, password: str) -> dict:
    resp = client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_admin_login_same_endpoint_by_email_and_username(admin_client: TestClient):
    res_email = _login(admin_client, "admin@codeknot.ai", "Admin1234")
    assert res_email["is_admin"] is True
    assert res_email["student_id"] == "admin"

    res_user = _login(admin_client, "admin", "Admin1234")
    assert res_user["is_admin"] is True

    me = admin_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {res_email['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["is_admin"] is True


def test_student_blocked_from_admin_endpoints(admin_client: TestClient):
    alice = _login(admin_client, "alice@codeknot.ai", "AlicePass123")
    assert alice["is_admin"] is False
    headers = {"Authorization": f"Bearer {alice['access_token']}"}

    assert admin_client.get("/api/v1/admin/overview", headers=headers).status_code == 403
    assert admin_client.get("/api/v1/admin/tables/students", headers=headers).status_code == 403

    # Alice only sees her own PDF on /api/v1/documents
    docs = admin_client.get("/api/v1/documents", headers=headers)
    assert docs.status_code == 200
    assert len(docs.json()) == 1
    assert docs.json()[0]["title"] == "OS_Notes.pdf"


def test_admin_sees_all_pdfs_and_all_database_tables_with_redaction(admin_client: TestClient):
    admin = _login(admin_client, "admin@codeknot.ai", "Admin1234")
    headers = {"Authorization": f"Bearer {admin['access_token']}"}

    # 1. Overview includes all PDFs across Alice & Bob + all tables + chart datasets
    overview_resp = admin_client.get("/api/v1/admin/overview", headers=headers)
    assert overview_resp.status_code == 200
    data = overview_resp.json()

    assert data["summary"]["total_pdfs"] == 2
    assert data["summary"]["total_pages"] == 2
    assert data["summary"]["total_chunks"] == 1
    assert data["summary"]["total_users"] == 3
    assert data["summary"]["total_admins"] == 1
    assert data["summary"]["total_tables"] >= 11

    pdf_titles = {p["title"] for p in data["pdfs"]}
    assert pdf_titles == {"OS_Notes.pdf", "DBMS_Guide.pdf"}

    # 2. Admin also sees all PDFs on /api/v1/documents
    docs = admin_client.get("/api/v1/documents", headers=headers)
    assert docs.status_code == 200
    assert len(docs.json()) == 2

    # 3. Inspect `students` table: password hashes must be redacted
    students_tbl = admin_client.get("/api/v1/admin/tables/students", headers=headers)
    assert students_tbl.status_code == 200
    s_data = students_tbl.json()
    assert s_data["total_rows"] == 3
    for row in s_data["rows"]:
        assert row["hashed_password"] == "[REDACTED]"

    # 4. Inspect `document_chunks` table: embeddings summarized cleanly
    chunks_tbl = admin_client.get("/api/v1/admin/tables/document_chunks", headers=headers)
    assert chunks_tbl.status_code == 200
    assert chunks_tbl.json()["rows"][0]["embedding"] == "[Vector: 3 dims]"

    # 5. Unknown table name rejected with 404
    assert admin_client.get("/api/v1/admin/tables/nonexistent_table", headers=headers).status_code == 404

    # 6. Inspect specific PDF pages & delete PDF
    target_pdf_id = data["pdfs"][0]["id"]
    detail = admin_client.get(f"/api/v1/admin/pdfs/{target_pdf_id}", headers=headers)
    assert detail.status_code == 200
    assert len(detail.json()["pages"]) == 1

    deleted = admin_client.delete(f"/api/v1/admin/pdfs/{target_pdf_id}", headers=headers)
    assert deleted.status_code == 200
    overview_after = admin_client.get("/api/v1/admin/overview", headers=headers).json()
    assert overview_after["summary"]["total_pdfs"] == 1
