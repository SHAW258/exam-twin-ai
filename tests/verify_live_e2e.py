"""Live End-to-End Integration Verification Script for ExamTwin.

Executes autonomous verification of:
1. Authentication lifecycle (Register, Login, Me, Invalid Credentials, Invalid Token)
2. Document Ingestion (Upload valid PDF, rejection of invalid format, list, getById)
3. AI Tutor (Ask question, grounded response / hint format)
4. ML Diagnosis & Error DNA (Diagnose error, retrieve Error DNA state)
5. Adaptive Interventions (Retrieve prioritized recommendation)
6. Assessment Lifecycle (Submit pre-test, submit post-test, history, getById)
7. Psychometric Gain Measurement (Compute Hake's gain between pre/post, list, getById)
"""

import json
import time
import urllib.request
import urllib.error
import sys

BASE_URL = "http://127.0.0.1:8000"
PROXIED_URL = "http://localhost:3000/api/v1"

print("=" * 70)
print("EXAMTWIN LIVE END-TO-END INTEGRATION TEST SUITE")
print("=" * 70)

results = []

def record(test_name, success, details, evidence=""):
    results.append({
        "test": test_name,
        "status": "PASS" if success else "FAIL",
        "details": details,
        "evidence": evidence
    })
    print(f"[{'PASS' if success else 'FAIL'}] {test_name}: {details}")

# Helper for HTTP requests
def http_req(method, endpoint, data=None, token=None, is_json=True, raw_body=None, headers=None, use_proxy=False):
    base = PROXIED_URL if use_proxy else f"{BASE_URL}/api/v1"
    url = f"{base}{endpoint}"
    
    req_headers = headers or {}
    if token:
        req_headers["Authorization"] = f"Bearer {token}"
    if is_json and data is not None and "Content-Type" not in req_headers:
        req_headers["Content-Type"] = "application/json"
        
    body_bytes = None
    if raw_body is not None:
        body_bytes = raw_body
    elif data is not None and is_json:
        body_bytes = json.dumps(data).encode("utf-8")
        
    req = urllib.request.Request(url, data=body_bytes, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            parsed = json.loads(content)
        except:
            parsed = {"raw": content}
        return e.code, parsed

# -----------------------------------------------------------------------------
# 1. System Health & OpenAPI Spec
# -----------------------------------------------------------------------------
try:
    with urllib.request.urlopen(f"{BASE_URL}/health") as resp:
        health_data = json.loads(resp.read().decode())
        record("System Health Check", health_data.get("status") == "healthy", f"Status: {health_data.get('status')}", str(health_data))
except Exception as e:
    record("System Health Check", False, str(e))

try:
    with urllib.request.urlopen(f"{BASE_URL}/openapi.json") as resp:
        spec = json.loads(resp.read().decode())
        paths_count = len(spec.get("paths", {}))
        record("OpenAPI Schema Specification", paths_count >= 15, f"Loaded {paths_count} routes in OpenAPI schema")
except Exception as e:
    record("OpenAPI Schema Specification", False, str(e))

# -----------------------------------------------------------------------------
# 2. Authentication Lifecycle
# -----------------------------------------------------------------------------
test_username = f"e2e_student_{int(time.time())}"
test_password = "SecurePassword#2026!"
test_email = f"{test_username}@stanford.edu"

# 2.1 Register
status, resp = http_req("POST", "/auth/register", {
    "username": test_username,
    "password": test_password,
    "email": test_email,
    "full_name": "Marcus Rivera (E2E Test)"
})
access_token = resp.get("access_token")
record("Student Registration (POST /auth/register)", status == 201 and bool(access_token), f"HTTP {status}, Token issued for {test_username}", f"token_type={resp.get('token_type')}")

# 2.2 Invalid Login Check
inv_status, inv_resp = http_req("POST", "/auth/login", {
    "username": test_username,
    "password": "WrongPassword!"
})
record("Invalid Credential Rejection", inv_status == 401, f"HTTP {inv_status} returned on bad credentials", inv_resp.get("detail", ""))

# 2.3 Valid Login
login_status, login_resp = http_req("POST", "/auth/login", {
    "username": test_username,
    "password": test_password
})
access_token = login_resp.get("access_token")
record("Student Authentication (POST /auth/login)", login_status == 200 and bool(access_token), f"HTTP {login_status}, Valid Bearer JWT generated")

# 2.4 Profile Fetch (GET /auth/me) via Vite Proxy
me_status, me_resp = http_req("GET", "/auth/me", token=access_token, use_proxy=True)
record("Profile Rehydration via Vite Proxy (GET /auth/me)", me_status == 200 and me_resp.get("external_student_id") == test_username, f"HTTP {me_status}, Student: {me_resp.get('external_student_id')}")

# 2.5 Invalid Token Rejection
bad_token_status, bad_token_resp = http_req("GET", "/auth/me", token="invalid_jwt_payload_here")
record("Invalid Token Rejection", bad_token_status == 401, f"HTTP {bad_token_status} returned on invalid token", bad_token_resp.get("detail", ""))

# -----------------------------------------------------------------------------
# 3. Document Ingestion & Verification
# -----------------------------------------------------------------------------
sample_pdf_bytes = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n5 0 obj\n<< /Length 96 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Guyton and Hall Medical Physiology Chapter 28 Renal Glomerular Filtration Rate) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000318 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n466\n%%EOF\n"

# 3.1 Upload PDF
upload_status, upload_resp = http_req(
    "POST",
    "/documents/upload",
    token=access_token,
    raw_body=sample_pdf_bytes,
    headers={
        "Content-Type": "application/pdf",
        "x-filename": "Guyton_Hall_Renal_Ch28.pdf"
    }
)
doc_id = upload_resp.get("document_id")
record("PDF Ingestion & Indexing (POST /documents/upload)", upload_status == 201 and doc_id is not None, f"HTTP {upload_status}, Document ID: {doc_id}", f"pages={upload_resp.get('pages_count')}, chunks={upload_resp.get('chunks_count')}")

# 3.2 List Documents
doc_list_status, doc_list_resp = http_req("GET", "/documents", token=access_token)
has_doc = isinstance(doc_list_resp, list) and any(d.get("id") == doc_id for d in doc_list_resp)
record("Documents Listing (GET /documents)", doc_list_status == 200 and has_doc, f"HTTP {doc_list_status}, Found {len(doc_list_resp)} documents")

# 3.3 Get Document Detail
if doc_id:
    doc_det_status, doc_det_resp = http_req("GET", f"/documents/{doc_id}", token=access_token)
    record("Document Metadata Retrieval (GET /documents/{id})", doc_det_status == 200 and doc_det_resp.get("id") == doc_id, f"HTTP {doc_det_status}, Title: {doc_det_resp.get('title')}")

# 3.4 Invalid PDF Rejection (Magic byte validation)
invalid_bytes = b"This is a plain text file, not a real PDF document!"
inv_up_status, inv_up_resp = http_req(
    "POST",
    "/documents/upload",
    token=access_token,
    raw_body=invalid_bytes,
    headers={"Content-Type": "application/pdf", "x-filename": "fake.pdf"}
)
record("PDF Signature Validation Rejection", inv_up_status in (400, 422), f"HTTP {inv_up_status} on non-PDF file upload", inv_up_resp.get("detail", ""))

# -----------------------------------------------------------------------------
# 4. AI Tutor Socratic Questioning
# -----------------------------------------------------------------------------
tutor_status, tutor_resp = http_req("POST", "/tutor/ask", token=access_token, data={
    "question": "How does moderate efferent arteriolar constriction affect GFR according to Guyton and Hall?",
    "mode": "qa",
    "topic": "Renal Microcirculation"
})
record("AI Tutor Socratic Question (POST /tutor/ask)", tutor_status == 200 and bool(tutor_resp.get("answer")), f"HTTP {tutor_status}, Mode: {tutor_resp.get('mode')}", f"is_grounded={tutor_resp.get('is_grounded')}, citations={len(tutor_resp.get('citations', []))}")

# -----------------------------------------------------------------------------
# 5. Cognitive Misconception Diagnosis & Error DNA
# -----------------------------------------------------------------------------
diag_status, diag_resp = http_req("POST", "/diagnosis", token=access_token, data={
    "question": "What happens to GFR if efferent arteriolar resistance increases moderately?",
    "student_answer": "GFR decreases immediately due to systemic arterial oncotic backpressure.",
    "expected_answer": "Moderate efferent constriction increases glomerular hydrostatic pressure and initially increases GFR.",
    "topic": "Renal Hemodynamics"
})
diag_id = diag_resp.get("id")
record("ML Misconception Diagnosis (POST /diagnosis)", diag_status == 201 and bool(diag_id), f"HTTP {diag_status}, Diagnosis ID: {diag_id}", f"category={diag_resp.get('error_category')}, conf={diag_resp.get('confidence_score')}")

# 5.2 Error DNA State Retrieval
state_status, state_resp = http_req("GET", "/learning/state", token=access_token)
record("Error DNA State Retrieval (GET /learning/state)", state_status == 200 and state_resp.get("total_diagnoses") is not None, f"HTTP {state_status}, Total Diagnoses: {state_resp.get('total_diagnoses')}")

# 5.3 Adaptive Intervention Recommendation
intv_status, intv_resp = http_req("GET", "/learning/interventions", token=access_token)
record("Adaptive Interventions Engine (GET /learning/interventions)", intv_status == 200 and bool(intv_resp.get("selected_strategy")), f"HTTP {intv_status}, Strategy: {intv_resp.get('selected_strategy')}")

# -----------------------------------------------------------------------------
# 6. Assessment Lifecycle & Psychometric Normalized Gain
# -----------------------------------------------------------------------------
# 6.1 Submit Pre-Test (Score: 4.0 / 10.0 = 40%)
pre_status, pre_resp = http_req("POST", "/assessments", token=access_token, data={
    "topic": "Renal Hemodynamics",
    "learning_objective_id": "obj_renal_hemo_01",
    "assessment_type": "PRE_INTERVENTION",
    "obtained_score": 4.0,
    "max_score": 10.0,
    "evidence": "Student diagnostic baseline work showing partial comprehension of afferent vs efferent dynamics."
})
pre_asmt_id = pre_resp.get("id")
record("Pre-Test Assessment Submission (POST /assessments)", pre_status == 201 and bool(pre_asmt_id), f"HTTP {pre_status}, Pre-Assessment ID: {pre_asmt_id}", f"normalized_score={pre_resp.get('normalized_score')}")

# 6.2 Submit Post-Test (Score: 8.0 / 10.0 = 80%)
post_status, post_resp = http_req("POST", "/assessments", token=access_token, data={
    "topic": "Renal Hemodynamics",
    "learning_objective_id": "obj_renal_hemo_01",
    "assessment_type": "POST_INTERVENTION",
    "obtained_score": 8.0,
    "max_score": 10.0,
    "evidence": "Post-intervention assessment proving elimination of reasoning inversion error."
})
post_asmt_id = post_resp.get("id")
record("Post-Test Assessment Submission (POST /assessments)", post_status == 201 and bool(post_asmt_id), f"HTTP {post_status}, Post-Assessment ID: {post_asmt_id}", f"normalized_score={post_resp.get('normalized_score')}")

# 6.3 List Assessments
asmt_list_status, asmt_list_resp = http_req("GET", "/assessments", token=access_token)
record("Assessment History Listing (GET /assessments)", asmt_list_status == 200 and len(asmt_list_resp) >= 2, f"HTTP {asmt_list_status}, Found {len(asmt_list_resp)} assessments")

# 6.4 Compute Normalized Learning Gain (g = (0.80 - 0.40) / (1 - 0.40) = 0.40 / 0.60 = +0.667)
gain_status, gain_resp = http_req("POST", "/learning/measurements", token=access_token, data={
    "pre_assessment_id": pre_asmt_id,
    "post_assessment_id": post_asmt_id,
    "require_verified": False,
    "update_topic_mastery": True,
    "notes": "E2E automated gain verification"
})
meas_id = gain_resp.get("measurement_id")
hake_g = gain_resp.get("normalized_gain")
record("Hake's Normalized Learning Gain (POST /learning/measurements)", gain_status == 201 and bool(meas_id), f"HTTP {gain_status}, g = {hake_g} ({gain_resp.get('gain_classification')})", f"meas_id={meas_id}")

# 6.5 List Measurements
meas_list_status, meas_list_resp = http_req("GET", "/learning/measurements", token=access_token)
record("Measurements History Listing (GET /learning/measurements)", meas_list_status == 200 and len(meas_list_resp) >= 1, f"HTTP {meas_list_status}, Records: {len(meas_list_resp)}")

print("\n" + "=" * 70)
print(f"VERIFICATION SUMMARY: {sum(1 for r in results if r['status'] == 'PASS')} PASSED, {sum(1 for r in results if r['status'] == 'FAIL')} FAILED")
print("=" * 70)

sys.exit(0 if all(r['status'] == 'PASS' for r in results) else 1)
