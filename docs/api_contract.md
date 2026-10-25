# ExamTwin Web API Contract (Phase 9)

> **Specification for Future React & TypeScript Web Frontend Integration**
> Version: 1.0.0
> Base Prefix: `/api/v1`

---

## 1. Overview & Architecture

ExamTwin exposes a RESTful HTTP service layer built with FastAPI, enabling the future React + TypeScript single-page application (SPA) to seamlessly communicate with the underlying AI/ML and educational engines.

### Key Characteristics
- **Base URL Prefix**: `/api/v1`
- **Authentication Scheme**: Standard RFC 7519 Bearer JSON Web Tokens (JWT) signed with HMAC-SHA256 (`HS256`).
- **Data Format**: `application/json` (except document upload which accepts `multipart/form-data` or `application/pdf`).
- **CORS Protection**: Controlled via `CORS_ORIGINS` environment setting. Pre-configured for standard React dev servers:
  - `http://localhost:3000` (Create React App)
  - `http://localhost:5173` (Vite)

---

## 2. Authentication & Authorization

All protected routes require an HTTP header formatted as:
```http
Authorization: Bearer <access_token>
```

Tokens are issued upon successful registration or login and contain a cryptographic `sub` claim encoding the unique student identifier. The service layer extracts this principal automatically, strictly disallowing cross-tenant IDOR tampering.

### Standard Error Response Format
All errors follow a consistent JSON payload structure:
```json
{
  "detail": "Description of the validation, authorization, or business logic error.",
  "error_type": "ValidationError | UnauthorizedAccess | ResourceNotFound | BadRequest"
}
```

---

## 3. Endpoints Specification

### 3.1 Authentication

#### 1. Register Student
- **Endpoint**: `POST /api/v1/auth/register`
- **Access**: Public
- **Request Payload**:
  ```json
  {
    "username": "student_alice",
    "password": "SecurePassword123!",
    "email": "alice@university.edu",
    "full_name": "Alice Smith"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "token_type": "bearer",
    "student_id": "student_alice",
    "expires_in_minutes": 1440
  }
  ```

#### 2. Student Login
- **Endpoint**: `POST /api/v1/auth/login`
- **Access**: Public
- **Request Payload**:
  ```json
  {
    "username": "student_alice",
    "password": "SecurePassword123!"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsIn...",
    "token_type": "bearer",
    "student_id": "student_alice",
    "expires_in_minutes": 1440
  }
  ```

#### 3. Current Student Profile
- **Endpoint**: `GET /api/v1/auth/me`
- **Access**: Protected (Bearer Token)
- **Response** (`200 OK`):
  ```json
  {
    "id": "stud_1234567890abcdef",
    "external_student_id": "student_alice",
    "email": "alice@university.edu",
    "full_name": "Alice Smith",
    "is_active": true,
    "total_diagnoses_count": 5,
    "topics_tracked_count": 2,
    "created_at": "2026-10-25T12:00:00Z"
  }
  ```

---

### 3.2 Document Management

#### 1. Upload Course Document
- **Endpoint**: `POST /api/v1/documents/upload`
- **Access**: Protected
- **Query Parameters**:
  - `title` *(optional)*: Custom document title.
  - `access_level` *(optional)*: `PRIVATE` or `COURSE_SHARED` (default: `PRIVATE`).
- **Body**: `multipart/form-data` with `file` part OR direct `application/pdf` binary stream with optional `x-filename` header.
- **Constraints**:
  - File size must not exceed 25 MB (`MAX_PDF_SIZE_BYTES`).
  - Must start with valid PDF magic bytes (`%PDF-`).
  - 0-byte files rejected.
- **Response** (`201 Created`):
  ```json
  {
    "document_id": "doc_abcdef123456",
    "filename": "lecture_04_trees.pdf",
    "pages_count": 12,
    "chunks_count": 34,
    "status": "SUCCESS",
    "message": "Document 'lecture_04_trees' successfully ingested and chunked."
  }
  ```

#### 2. List Documents
- **Endpoint**: `GET /api/v1/documents`
- **Access**: Protected
- **Response** (`200 OK`):
  ```json
  [
    {
      "id": "doc_abcdef123456",
      "title": "lecture_04_trees",
      "access_level": "COURSE_SHARED",
      "pages_count": 12,
      "chunks_count": 34,
      "created_at": "2026-10-25T12:05:00Z"
    }
  ]
  ```

---

### 3.3 AI Tutor Interaction

#### 1. Ask Grounded Question / Request Hints
- **Endpoint**: `POST /api/v1/tutor/ask`
- **Access**: Protected
- **Request Payload**:
  ```json
  {
    "question": "How does left-rotation restore AVL balance?",
    "document_ids": ["doc_abcdef123456"],
    "topic": "AVL Trees",
    "mode": "qa"
  }
  ```
  *Supported modes*: `"qa"` (grounded answer), `"hint"` (Socratic hint), `"practice"` (retest problem).
- **Response** (`200 OK`):
  ```json
  {
    "question": "How does left-rotation restore AVL balance?",
    "answer": "A left-rotation is performed when a node's right subtree becomes too tall...",
    "mode": "qa",
    "citations": [
      {
        "source_path": "data/raw/doc_abcdef123456_trees.pdf",
        "document_id": "doc_abcdef123456",
        "page_number": 8,
        "similarity_score": 0.8845,
        "snippet": "When a right-heavy imbalance occurs (balance factor > +1)..."
      }
    ],
    "grounded": true
  }
  ```

---

### 3.4 Error Diagnosis & Learner State

#### 1. Diagnose Error
- **Endpoint**: `POST /api/v1/diagnosis`
- **Access**: Protected
- **Request Payload**:
  ```json
  {
    "question": "What is the worst-case search time of an unbalanced BST?",
    "student_answer": "O(log n) because binary trees divide the problem in half.",
    "expected_answer": "O(n) when the tree degenerates into a linear chain.",
    "topic": "Binary Search Trees"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "id": "err_12345678abcdef01",
    "student_id": "student_alice",
    "topic": "Binary Search Trees",
    "error_category": "CONCEPTUAL_MISUNDERSTANDING",
    "confidence_score": 0.8250,
    "needs_review": false,
    "is_verified": false,
    "model_version": "baseline_v1",
    "created_at": "2026-10-25T12:10:00Z"
  }
  ```

#### 2. Get Learner State (Error DNA)
- **Endpoint**: `GET /api/v1/learning/state?window_days=30`
- **Access**: Protected
- **Response** (`200 OK`):
  ```json
  {
    "student_id": "student_alice",
    "total_diagnoses": 6,
    "review_required_count": 1,
    "confirmed_diagnoses_count": 5,
    "recurring_errors": [
      {
        "category": "CONCEPTUAL_MISUNDERSTANDING",
        "count": 3,
        "percentage": 60.0
      }
    ],
    "most_affected_topics": [
      {
        "topic": "Binary Search Trees",
        "count": 3,
        "primary_error_category": "CONCEPTUAL_MISUNDERSTANDING"
      }
    ],
    "temporal_trend": {
      "recent_window_days": 30,
      "recent_diagnoses_count": 6,
      "historical_diagnoses_count": 0,
      "trend": "INCREASING"
    },
    "topic_masteries": [
      {
        "topic": "Binary Search Trees",
        "attempts_count": 4,
        "correct_attempts": 1,
        "incorrect_attempts": 3,
        "mastery_score": 0.2500
      }
    ],
    "revision_recommendations": []
  }
  ```

#### 3. Get Adaptive Interventions
- **Endpoint**: `GET /api/v1/learning/interventions?include_grounded_content=false`
- **Access**: Protected
- **Response** (`200 OK`):
  ```json
  {
    "student_id": "student_alice",
    "selected_topic": "Binary Search Trees",
    "priority_score": 0.7650,
    "selected_strategy": "CONCEPT_EXPLANATION",
    "strategy_rationale": "Dominant error in 'Binary Search Trees' is CONCEPTUAL_MISUNDERSTANDING...",
    "student_explanation": "Topic 'Binary Search Trees' has been prioritized due to repeated diagnostic errors...",
    "is_uncertain": false,
    "review_required": false,
    "is_cold_start": false
  }
  ```

---

### 3.5 Assessments & Retests

#### 1. Submit Assessment
- **Endpoint**: `POST /api/v1/assessments`
- **Access**: Protected
- **Request Payload**:
  ```json
  {
    "topic": "Binary Search Trees",
    "learning_objective_id": "LO-BST-ROTATION",
    "assessment_type": "PRE_INTERVENTION",
    "obtained_score": 4.0,
    "max_score": 10.0,
    "evidence": "Student confused left-rotation with right-rotation pivot choice.",
    "intervention_id": "CONCEPT_EXPLANATION"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "id": "asmt_12345678abcdef01",
    "student_id": "student_alice",
    "topic": "Binary Search Trees",
    "learning_objective_id": "LO-BST-ROTATION",
    "assessment_type": "PRE_INTERVENTION",
    "obtained_score": 4.0,
    "max_score": 10.0,
    "normalized_score": 0.40,
    "verification_status": "VERIFIED",
    "evidence": "Student confused left-rotation with right-rotation pivot choice.",
    "intervention_id": "CONCEPT_EXPLANATION",
    "timestamp": "2026-10-25T12:15:00Z"
  }
  ```

#### 2. List Assessments
- **Endpoint**: `GET /api/v1/assessments?topic=Binary Search Trees`
- **Access**: Protected
- **Response** (`200 OK`): Array of assessment objects.

---

### 3.6 Learning Measurements

#### 1. Compute Learning Gain
- **Endpoint**: `POST /api/v1/learning/measurements`
- **Access**: Protected
- **Request Payload**:
  ```json
  {
    "pre_assessment_id": "asmt_12345678abcdef01",
    "post_assessment_id": "asmt_12345678abcdef02",
    "intervention_id": "CONCEPT_EXPLANATION",
    "require_verified": true,
    "update_topic_mastery": true
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "measurement_id": "meas_12345678abcdef99",
    "student_id": "student_alice",
    "topic": "Binary Search Trees",
    "learning_objective_id": "LO-BST-ROTATION",
    "pre_assessment_id": "asmt_12345678abcdef01",
    "post_assessment_id": "asmt_12345678abcdef02",
    "intervention_id": "CONCEPT_EXPLANATION",
    "pre_normalized_score": 0.40,
    "post_normalized_score": 0.85,
    "normalized_gain": 0.7500,
    "absolute_gain": 0.4500,
    "gain_classification": "POSITIVE",
    "is_verified": true,
    "summary_explanation": "Positive normalized learning gain (+75.00%): performance improved from 40.00% (pre) to 85.00% (post). Absolute gain: +45.00%.",
    "measured_at": "2026-10-25T12:20:00Z"
  }
  ```

---

## 4. TypeScript Client Interfaces

```typescript
// Authentication
export interface RegisterPayload {
  username: string;
  password: string;
  email?: string;
  full_name?: string;
}

export interface LoginPayload {
  username: string;
  password: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  student_id: string;
  expires_in_minutes: number;
}

export interface StudentProfile {
  id: string;
  external_student_id: string;
  email?: string;
  full_name?: string;
  is_active: boolean;
  total_diagnoses_count: number;
  topics_tracked_count: number;
  created_at?: string;
}

// AI Tutor & RAG
export interface SourceCitation {
  source_path: string;
  document_id: string;
  page_number: number;
  similarity_score: number;
  snippet: string;
}

export interface TutorResponse {
  question: string;
  answer: string;
  mode: 'qa' | 'hint' | 'practice';
  citations: SourceCitation[];
  grounded: boolean;
}

// Assessment & Measurement
export interface AssessmentSubmission {
  topic: string;
  learning_objective_id: string;
  assessment_type?: 'PRE_INTERVENTION' | 'POST_INTERVENTION' | 'FORMATIVE' | 'SUMMATIVE';
  obtained_score: number;
  max_score: number;
  evidence: string;
  intervention_id?: string;
}

export interface LearningMeasurement {
  measurement_id: string;
  student_id: string;
  topic: string;
  learning_objective_id: string;
  pre_assessment_id: string;
  post_assessment_id: string;
  intervention_id?: string;
  pre_normalized_score: number;
  post_normalized_score: number;
  normalized_gain: number | null;
  absolute_gain: number;
  gain_classification: 'POSITIVE' | 'ZERO' | 'NEGATIVE' | 'PERFECT_PRETEST' | 'UNAVAILABLE';
  is_verified: boolean;
  summary_explanation: string;
  measured_at?: string;
}
```
