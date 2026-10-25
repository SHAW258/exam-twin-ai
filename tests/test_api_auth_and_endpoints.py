"""Comprehensive automated API integration tests for Phase 9 FastAPI web layer.

Covers:
- Student registration, scrypt password hashing, and login
- JWT token generation, signature validation, and expiration
- Protected endpoints and current student principal retrieval
- Document upload, size validation, and signature verification
- Grounded AI Tutor endpoint (qa, hint, practice modes with mocked responses)
- Error diagnosis, learner state, and adaptive intervention endpoints
- Assessment submission and score normalization
- Learning measurement and normalized learning gain calculation
- Cross-student data isolation and tenant security
"""

from datetime import datetime, timedelta, timezone
import io
import pytest
from fastapi.testclient import TestClient

from src.api.app import app, create_app
from src.api.auth import create_access_token, hash_password, verify_password
from src.database.connection import DatabaseManager, get_db_manager
from src.database.models import AccessLevel, Document
from src.database.schema import create_tables, drop_tables
from src.learner_state.models import Student
from src.learning_measurement.models import AssessmentType, GainClassification


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


@pytest.fixture
def auth_headers_alice(client):
    """Register and authenticate Student Alice, returning Authorization headers."""
    client.post(
        "/api/v1/auth/register",
        json={
            "username": "student_alice",
            "password": "SecurePassword123!",
            "email": "alice@university.edu",
            "full_name": "Alice Smith",
        },
    )
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "student_alice", "password": "SecurePassword123!"},
    )
    if login_res.status_code != 200:
        raise RuntimeError(f"Login failed for student_alice: {login_res.status_code} {login_res.text}")
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers_bob(client):
    """Register and authenticate Student Bob, returning Authorization headers."""
    client.post(
        "/api/v1/auth/register",
        json={
            "username": "student_bob",
            "password": "AnotherSecurePassword456!",
            "email": "bob@university.edu",
            "full_name": "Bob Jones",
        },
    )
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username": "student_bob", "password": "AnotherSecurePassword456!"},
    )
    if login_res.status_code != 200:
        raise RuntimeError(f"Login failed for student_bob: {login_res.status_code} {login_res.text}")
    token = login_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


# =============================================================================
# 1. System & Authentication Tests
# =============================================================================

class TestSystemAndAuthEndpoints:
    """Tests verifying registration, password hashing, JWT life-cycle, and /me endpoint."""

    def test_health_check(self, client):
        """Verify GET /health returns 200 OK and system status."""
        res = client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert "ExamTwin" in data["service"]

    def test_root_endpoint(self, client):
        """Verify GET / returns API welcome and docs link."""
        res = client.get("/")
        assert res.status_code == 200
        assert "docs" in res.json()

    def test_scrypt_password_hashing_and_verification(self):
        """Verify scrypt hashing produces non-reversible salt-hash format."""
        pwd = "MySecretPassword_2026!"
        hashed = hash_password(pwd)
        assert hashed.startswith("scrypt$")
        assert verify_password(pwd, hashed) is True
        assert verify_password("WrongPassword", hashed) is False

    def test_registration_success(self, client):
        """Verify successful student registration returns JWT bearer token."""
        res = client.post(
            "/api/v1/auth/register",
            json={
                "username": "charlie_brown",
                "password": "CharliePassword789!",
                "email": "charlie@school.edu",
                "full_name": "Charlie Brown",
            },
        )
        assert res.status_code == 201
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["student_id"] == "charlie_brown"

    def test_registration_duplicate_username_fails(self, client):
        """Verify registering an existing username returns 400 Bad Request."""
        res1 = client.post(
            "/api/v1/auth/register",
            json={
                "username": "duplicate_student_test",
                "password": "PasswordAlice123!",
            },
        )
        assert res1.status_code == 201
        res2 = client.post(
            "/api/v1/auth/register",
            json={
                "username": "duplicate_student_test",
                "password": "PasswordAlice123!",
            },
        )
        assert res2.status_code == 400
        assert "already registered" in res2.json()["detail"]

    def test_registration_short_password_fails(self, client):
        """Verify registering with password < 8 characters fails with 422."""
        res = client.post(
            "/api/v1/auth/register",
            json={"username": "short_pw_user", "password": "123"},
        )
        assert res.status_code == 422

    def test_login_success(self, client):
        """Verify valid login returns signed JWT bearer access token."""
        client.post(
            "/api/v1/auth/register",
            json={"username": "login_test_student", "password": "SecurePassword123!"},
        )
        res = client.post(
            "/api/v1/auth/login",
            json={"username": "login_test_student", "password": "SecurePassword123!"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["student_id"] == "login_test_student"
        assert "access_token" in data

    def test_login_wrong_password_fails(self, client):
        """Verify wrong password returns 401 Unauthorized."""
        client.post(
            "/api/v1/auth/register",
            json={"username": "wrong_pw_user", "password": "CorrectPassword123!"},
        )
        res = client.post(
            "/api/v1/auth/login",
            json={"username": "wrong_pw_user", "password": "IncorrectPassword!"},
        )
        assert res.status_code == 401
        assert "Invalid username or password" in res.json()["detail"]

    def test_login_nonexistent_user_fails(self, client):
        """Verify login with unknown user returns 401 Unauthorized."""
        res = client.post(
            "/api/v1/auth/login",
            json={"username": "ghost_user", "password": "SomePassword123!"},
        )
        assert res.status_code == 401

    def test_current_student_me_success(self, client, auth_headers_alice):
        """Verify GET /api/v1/auth/me returns student profile for valid JWT token."""
        res = client.get("/api/v1/auth/me", headers=auth_headers_alice)
        assert res.status_code == 200
        data = res.json()
        assert data["external_student_id"] == "student_alice"
        assert data["email"] == "alice@university.edu"
        assert data["full_name"] == "Alice Smith"

    def test_current_student_me_unauthenticated_fails(self, client):
        """Verify GET /api/v1/auth/me without token returns 401 Unauthorized."""
        res = client.get("/api/v1/auth/me")
        assert res.status_code == 401

    def test_current_student_me_invalid_token_fails(self, client):
        """Verify GET /api/v1/auth/me with corrupted token signature returns 401."""
        res = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer invalid.token.payload"})
        assert res.status_code == 401

    def test_current_student_me_expired_token_fails(self, client):
        """Verify expired JWT token returns 401 Unauthorized."""
        expired_token = create_access_token(
            data={"sub": "student_alice"},
            expires_delta=timedelta(seconds=-10),  # expired 10 seconds ago
        )
        res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
        assert res.status_code == 401
        assert "expired" in res.json()["detail"].lower()


# =============================================================================
# 2. Document Upload & Catalog Endpoints
# =============================================================================

class TestDocumentEndpoints:
    """Tests verifying document upload security, magic byte validation, and catalog listing."""

    def test_upload_valid_pdf_stream(self, client, auth_headers_alice):
        """Verify uploading valid PDF binary via raw binary stream."""
        from tests.test_pdf_loader import _generate_synthetic_pdf
        pdf_content = _generate_synthetic_pdf([
            "Binary Search Tree lecture notes. A binary search tree is a rooted binary tree data structure.",
        ])

        res = client.post(
            "/api/v1/documents/upload?title=BST_Notes&access_level=COURSE_SHARED",
            content=pdf_content,
            headers={**auth_headers_alice, "Content-Type": "application/pdf", "x-filename": "bst_notes.pdf"},
        )
        assert res.status_code == 201
        data = res.json()
        assert data["status"] == "SUCCESS"
        assert data["filename"] == "bst_notes.pdf"
        assert data["pages_count"] >= 1

    def test_upload_empty_0_byte_pdf_fails(self, client, auth_headers_alice):
        """Verify uploading 0-byte file returns 400 Bad Request."""
        res = client.post(
            "/api/v1/documents/upload",
            content=b"",
            headers={**auth_headers_alice, "Content-Type": "application/pdf"},
        )
        assert res.status_code == 400
        assert "empty" in res.json()["detail"].lower()

    def test_upload_invalid_signature_pdf_fails(self, client, auth_headers_alice):
        """Verify uploading file lacking %PDF- header returns 400 Bad Request."""
        bad_content = b"NOT_A_PDF_FILE_HEADER_TEXT_STREAM"
        res = client.post(
            "/api/v1/documents/upload",
            content=bad_content,
            headers={**auth_headers_alice, "Content-Type": "application/pdf", "x-filename": "bad.pdf"},
        )
        assert res.status_code == 400
        assert "magic-byte" in res.json()["detail"].lower()

    def test_list_and_get_document_details(self, client, auth_headers_alice):
        """Verify listing documents returns ingested documents."""
        res = client.get("/api/v1/documents", headers=auth_headers_alice)
        assert res.status_code == 200
        docs = res.json()
        assert len(docs) >= 1
        doc_id = docs[0]["id"]

        detail_res = client.get(f"/api/v1/documents/{doc_id}", headers=auth_headers_alice)
        assert detail_res.status_code == 200
        assert detail_res.json()["id"] == doc_id


# =============================================================================
# 3. AI Tutor Grounded Q&A Endpoints
# =============================================================================

class TestAITutorEndpoints:
    """Tests verifying AI tutor modes with grounded responses and citations."""

    def test_tutor_ask_qa_mode(self, client, auth_headers_alice):
        """Verify asking question in QA mode returns answer and citations list."""
        res = client.post(
            "/api/v1/tutor/ask",
            json={
                "question": "What is an inorder tree traversal?",
                "mode": "qa",
            },
            headers=auth_headers_alice,
        )
        assert res.status_code == 200
        data = res.json()
        assert data["question"] == "What is an inorder tree traversal?"
        assert data["mode"] == "qa"
        assert "answer" in data
        assert isinstance(data["citations"], list)

    def test_tutor_ask_hint_mode(self, client, auth_headers_alice):
        """Verify asking question in hint mode."""
        res = client.post(
            "/api/v1/tutor/ask",
            json={
                "question": "How do I balance an AVL tree after left-heavy insertion?",
                "mode": "hint",
            },
            headers=auth_headers_alice,
        )
        assert res.status_code == 200
        data = res.json()
        assert data["mode"] == "hint"
        assert len(data["answer"]) > 0

    def test_tutor_ask_practice_mode(self, client, auth_headers_alice):
        """Verify generating a practice question."""
        res = client.post(
            "/api/v1/tutor/ask",
            json={
                "question": "Graph Cycle Detection",
                "topic": "Graph Algorithms",
                "mode": "practice",
            },
            headers=auth_headers_alice,
        )
        assert res.status_code == 200
        data = res.json()
        assert data["mode"] == "practice"
        assert len(data["answer"]) > 0


# =============================================================================
# 4. Learning & Diagnosis Endpoints
# =============================================================================

class TestLearningEndpoints:
    """Tests verifying ML error classification, Error DNA summary, and adaptive recommendations."""

    def test_diagnose_error_endpoint(self, client, auth_headers_alice):
        """Verify automated ML error diagnosis persists and returns classified event."""
        res = client.post(
            "/api/v1/diagnosis",
            json={
                "question": "What is a queue data structure?",
                "student_answer": "A LIFO stack where last item comes out first.",
                "expected_answer": "A FIFO structure where first item in is first out.",
                "topic": "Queues",
            },
            headers=auth_headers_alice,
        )
        assert res.status_code == 201
        data = res.json()
        assert data["student_id"] == "student_alice"
        assert data["topic"] == "Queues"
        assert "confidence_score" in data
        assert "needs_review" in data

    def test_learning_state_endpoint(self, client, auth_headers_alice):
        """Verify retrieving persistent Error DNA summary for authenticated student."""
        res = client.get("/api/v1/learning/state?window_days=30", headers=auth_headers_alice)
        assert res.status_code == 200
        data = res.json()
        assert data["student_id"] == "student_alice"
        assert data["total_diagnoses"] >= 1
        assert "temporal_trend" in data
        assert "most_affected_topics" in data

    def test_adaptive_interventions_endpoint(self, client, auth_headers_alice):
        """Verify generating prioritized adaptive intervention recommendation."""
        res = client.get(
            "/api/v1/learning/interventions?include_grounded_content=false",
            headers=auth_headers_alice,
        )
        assert res.status_code == 200
        data = res.json()
        assert data["student_id"] == "student_alice"
        assert "selected_topic" in data
        assert "selected_strategy" in data
        assert "priority_score" in data
        assert "student_explanation" in data


# =============================================================================
# 5. Assessment Lifecycle Endpoints
# =============================================================================

class TestAssessmentEndpoints:
    """Tests verifying assessment submission, score normalization, listing, and validation."""

    def test_submit_assessment_success(self, client, auth_headers_alice):
        """Verify submitting an assessment normalizes score (15/20 = 0.75)."""
        res = client.post(
            "/api/v1/assessments",
            json={
                "topic": "Dynamic Programming",
                "learning_objective_id": "LO-DP-KNAPSACK",
                "assessment_type": "PRE_INTERVENTION",
                "obtained_score": 15.0,
                "max_score": 20.0,
                "evidence": "Student worked 0/1 knapsack recurrence.",
            },
            headers=auth_headers_alice,
        )
        assert res.status_code == 201
        data = res.json()
        assert data["student_id"] == "student_alice"
        assert data["normalized_score"] == 0.75
        assert data["verification_status"] == "VERIFIED"

    def test_submit_assessment_score_exceeding_max_rejected(self, client, auth_headers_alice):
        """Verify score > max_score is rejected with 422 Unprocessable Entity."""
        res = client.post(
            "/api/v1/assessments",
            json={
                "topic": "Dynamic Programming",
                "learning_objective_id": "LO-DP-KNAPSACK",
                "assessment_type": "PRE_INTERVENTION",
                "obtained_score": 25.0,
                "max_score": 20.0,
                "evidence": "Score exceeding max.",
            },
            headers=auth_headers_alice,
        )
        assert res.status_code == 422

    def test_list_and_get_single_assessment(self, client, auth_headers_alice):
        """Verify listing assessments and fetching single assessment by ID."""
        list_res = client.get("/api/v1/assessments", headers=auth_headers_alice)
        assert list_res.status_code == 200
        items = list_res.json()
        assert len(items) >= 1

        asmt_id = items[0]["id"]
        get_res = client.get(f"/api/v1/assessments/{asmt_id}", headers=auth_headers_alice)
        assert get_res.status_code == 200
        assert get_res.json()["id"] == asmt_id


# =============================================================================
# 6. Learning Measurements & Cross-Student Isolation Endpoints
# =============================================================================

class TestLearningMeasurementEndpoints:
    """Tests verifying learning gain calculation, listing, and cross-student security isolation."""

    def test_compute_learning_measurement_endpoint_success(self, client, auth_headers_alice):
        """Verify paired pre- and post-tests compute normalized learning gain via API."""
        # 1. Pre-test: 4/10 = 0.40
        pre_res = client.post(
            "/api/v1/assessments",
            json={
                "topic": "Binary Search",
                "learning_objective_id": "LO-BS-BOUNDS",
                "assessment_type": "PRE_INTERVENTION",
                "obtained_score": 4.0,
                "max_score": 10.0,
                "evidence": "Pre-test off-by-one error on right bound.",
            },
            headers=auth_headers_alice,
        )
        pre_id = pre_res.json()["id"]

        # 2. Post-test: 8/10 = 0.80
        post_res = client.post(
            "/api/v1/assessments",
            json={
                "topic": "Binary Search",
                "learning_objective_id": "LO-BS-BOUNDS",
                "assessment_type": "POST_INTERVENTION",
                "obtained_score": 8.0,
                "max_score": 10.0,
                "evidence": "Post-test correct boundary condition while (low <= high).",
            },
            headers=auth_headers_alice,
        )
        post_id = post_res.json()["id"]

        # 3. Compute measurement: g = (0.80 - 0.40)/(1 - 0.40) = 0.40 / 0.60 = 0.6667 (+66.67%)
        meas_res = client.post(
            "/api/v1/learning/measurements",
            json={
                "pre_assessment_id": pre_id,
                "post_assessment_id": post_id,
                "require_verified": True,
                "update_topic_mastery": True,
            },
            headers=auth_headers_alice,
        )
        assert meas_res.status_code == 201
        data = meas_res.json()
        assert data["student_id"] == "student_alice"
        assert data["topic"] == "Binary Search"
        assert pytest.approx(data["normalized_gain"], rel=1e-3) == 0.6667
        assert data["gain_classification"] == "POSITIVE"

    def test_cross_student_data_isolation(self, client, auth_headers_alice, auth_headers_bob):
        """Verify Student Bob cannot access Student Alice's assessments or compute gain on them."""
        # Alice creates an assessment
        alice_asmt = client.post(
            "/api/v1/assessments",
            json={
                "topic": "Graph Algorithms",
                "learning_objective_id": "LO-GRAPH-DFS",
                "assessment_type": "PRE_INTERVENTION",
                "obtained_score": 5.0,
                "max_score": 10.0,
                "evidence": "Alice DFS test.",
            },
            headers=auth_headers_alice,
        ).json()

        # Bob attempts to fetch Alice's assessment
        bob_try_get = client.get(
            f"/api/v1/assessments/{alice_asmt['id']}",
            headers=auth_headers_bob,
        )
        assert bob_try_get.status_code == 404

        # Bob creates his own assessment
        bob_asmt = client.post(
            "/api/v1/assessments",
            json={
                "topic": "Graph Algorithms",
                "learning_objective_id": "LO-GRAPH-DFS",
                "assessment_type": "POST_INTERVENTION",
                "obtained_score": 8.0,
                "max_score": 10.0,
                "evidence": "Bob DFS test.",
            },
            headers=auth_headers_bob,
        ).json()

        # Bob attempts to compute gain pairing Alice's pre-test with his post-test
        bob_try_meas = client.post(
            "/api/v1/learning/measurements",
            json={
                "pre_assessment_id": alice_asmt["id"],
                "post_assessment_id": bob_asmt["id"],
            },
            headers=auth_headers_bob,
        )
        assert bob_try_meas.status_code in [400, 403]
        assert "different students" in bob_try_meas.json()["detail"].lower()
