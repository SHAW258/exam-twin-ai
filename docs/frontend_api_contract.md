# ExamTwin Frontend API Contract & Integration Guide

> **Target Frontend**: React + TypeScript Single-Page Application (SPA)
> **UI/UX Design Context**: Google Stitch Design System
> **Backend Architecture**: FastAPI RESTful Service Layer
> **Protocol**: HTTP/1.1 & HTTP/2 with JSON and Multipart payloads
> **Current Version**: `v1.0.0` | **Base API Prefix**: `/api/v1`

---

## 1. Overview & Architectural Principles

ExamTwin is engineered **Web-Application First**. The backend delivers a typed, contract-verified RESTful API providing evidence-grounded AI tutoring, machine-learning misconception diagnosis, adaptive pedagogical intervention, and empirical learning gain measurement.

### Architectural Principles for Frontend Integration
1. **Contract Immutability**: All request and response structures documented here match the verified Pydantic models in `src/api/schemas.py`. No unsupported or phantom fields are emitted.
2. **Cryptographic Identity**: The client never provides or trusts client-supplied student IDs for authorization. All identity is established server-side from the verified Bearer JWT access token.
3. **Citations Integrity**: The AI Tutor returns authentic source citations grounded in ingested textbook/lecture pages. Citations are never fabricated.
4. **Data Isolation**: Multi-tenant isolation guarantees students cannot access, inspect, or modify another student's documents, diagnostic history, assessments, or measurements.

---

## 2. Environment & Base URL Configuration

The frontend must configure the backend API base URL using environment variables:

### Vite Configuration (`.env.development` / `.env.production`)
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_API_PREFIX=/api/v1
```

### Create React App / Next.js Configuration (`.env.local`)
```env
REACT_APP_API_BASE_URL=http://localhost:8000
REACT_APP_API_PREFIX=/api/v1
```

### Recommended Axios / Fetch Client Setup
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Automatic Bearer Token Interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('examtwin_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Automatic 401 Session Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('examtwin_access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## 3. CORS Policy & Requirements

The backend is configured with FastAPI's `CORSMiddleware`. Allowed origins are loaded dynamically from `CORS_ORIGINS` in `.env`:
- Development origins: `http://localhost:3000`, `http://localhost:5173`, `http://127.0.0.1:3000`, `http://127.0.0.1:5173`
- Allowed Methods: `GET`, `POST`, `OPTIONS`
- Allowed Headers: `Authorization`, `Content-Type`, `x-filename`
- Credentials: `true` (enables cookies and auth headers)

---

## 4. Authentication Contract & JWT Lifecycle

### 4.1 Token Structure
- **Format**: Signed RFC 7519 JSON Web Token (`HS256`).
- **Signature Algorithm**: HMAC-SHA256 (`HS256`).
- **Claims**:
  - `sub`: Verified student external identifier (e.g., `"student_alice"`).
  - `iat`: Timestamp of issue (seconds since epoch).
  - `exp`: Expiration timestamp (default: 1440 minutes / 24 hours).

### 4.2 Authorization Header
For all protected endpoints, the client must transmit:
```http
Authorization: Bearer <access_token>
```

### 4.3 Client Auth Flow
1. **Registration / Login**: Submit credentials to `POST /api/v1/auth/register` or `POST /api/v1/auth/login`.
2. **Token Storage**: Store `access_token` securely in client storage (e.g., `localStorage` or secure session cookie).
3. **Session Rehydration**: On application reload, call `GET /api/v1/auth/me` with the stored Bearer token to hydrate the student profile state.
4. **Token Expiry / 401**: Upon receiving `401 Unauthorized`, clear stored credentials and redirect to `/login`.

---

## 5. Standardized Error Handling Contract

All application errors return standard HTTP problem responses with a JSON payload:

```json
{
  "detail": "Descriptive, human-readable error message.",
  "error_type": "ValidationError | UnauthorizedAccess | ResourceNotFound | BadRequest | PayloadTooLarge | UnprocessablePDF | InternalServerError"
}
```

### HTTP Status Code Mapping

| Status Code | Reason | Typical Cause | `error_type` |
|---|---|---|---|
| `400 Bad Request` | Business constraint violation | Incompatible pre/post assessment pair; empty file upload; non-PDF header | `BadRequest` |
| `401 Unauthorized` | Missing, expired, or invalid token | Invalid login credentials; tampered JWT signature; missing `Authorization` header | `HTTPException` detail |
| `403 Forbidden` | Access control boundary violation | Attempting to access another student's document or history; deactivated account | `UnauthorizedAccess` |
| `404 Not Found` | Entity not found | Querying non-existent assessment ID, measurement ID, or document ID | `ResourceNotFound` |
| `413 Content Too Large` | Payload limit exceeded | Uploading a PDF exceeding `25 MB` (`MAX_PDF_SIZE_BYTES`) | `PayloadTooLarge` |
| `422 Unprocessable` | Schema validation error | Score exceeds max score; negative score; missing required request field | `ValidationError` or FastAPI validation list |
| `429 Too Many Requests` | Rate limit or quota | Gemini API rate limit or high-frequency automated polling | `TooManyRequests` |
| `500 Internal Error` | Unexpected backend error | Safe sanitized error message; internal traceback logged to server | `InternalServerError` |

---

## 6. Complete Endpoint Inventory & Payloads

### 6.1 Authentication

#### `POST /api/v1/auth/register`
- **Description**: Register a new student account and issue initial access token.
- **Auth**: Public
- **Request Body**:
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
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "student_id": "student_alice",
    "expires_in_minutes": 1440
  }
  ```

#### `POST /api/v1/auth/login`
- **Description**: Authenticate with existing credentials.
- **Auth**: Public
- **Request Body**:
  ```json
  {
    "username": "student_alice",
    "password": "SecurePassword123!"
  }
  ```
- **Response** (`200 OK`): Same as registration `TokenResponse`.

#### `GET /api/v1/auth/me`
- **Description**: Retrieve active profile attributes for the authenticated student.
- **Auth**: Bearer Token
- **Response** (`200 OK`):
  ```json
  {
    "id": "stud_7612f026a1124d9c",
    "external_student_id": "student_alice",
    "email": "alice@university.edu",
    "full_name": "Alice Smith",
    "is_active": true,
    "total_diagnoses_count": 12,
    "topics_tracked_count": 4,
    "created_at": "2026-10-25T11:00:00Z"
  }
  ```

---

### 6.2 Documents & Course Materials

#### `POST /api/v1/documents/upload`
- **Description**: Ingest course PDF document for vector retrieval and grounded citations.
- **Auth**: Bearer Token
- **Query Parameters**:
  - `title` *(string, optional)*: User-friendly document title.
  - `access_level` *(string, default: `"PRIVATE"`)*: `"PRIVATE"` or `"COURSE_SHARED"`.
- **Payload Modes**:
  1. `multipart/form-data`: Standard HTML `<input type="file" />` with `file` part.
  2. `application/pdf`: Direct raw binary stream with `x-filename: notes.pdf` header.
- **Upload Constraints**: Max 25 MB (`26,214,400` bytes); must begin with `%PDF-`.
- **Response** (`201 Created`):
  ```json
  {
    "document_id": "doc_a3f890e1bc22",
    "filename": "Operating_Systems_Ch7.pdf",
    "pages_count": 24,
    "chunks_count": 68,
    "status": "SUCCESS",
    "message": "Document 'Operating_Systems_Ch7' successfully ingested and chunked."
  }
  ```

#### `GET /api/v1/documents`
- **Description**: List all course documents accessible to current student (owned + course-shared).
- **Auth**: Bearer Token
- **Response** (`200 OK`):
  ```json
  [
    {
      "id": "doc_a3f890e1bc22",
      "title": "Operating_Systems_Ch7.pdf",
      "access_level": "COURSE_SHARED",
      "pages_count": 24,
      "chunks_count": 68,
      "created_at": "2026-10-25T11:15:00Z"
    }
  ]
  ```

#### `GET /api/v1/documents/{document_id}`
- **Description**: Retrieve specific document metadata and chunk stats.
- **Auth**: Bearer Token
- **Response** (`200 OK`): Single `DocumentDetailResponse` matching list item schema.
- **Errors**: `403 Forbidden` if document is private to another student; `404 Not Found` if missing.

---

### 6.3 AI Tutor & Grounded Retrieval

#### `POST /api/v1/tutor/ask`
- **Description**: Query the grounded Gemini AI Tutor for conceptual answers, Socratic hints, or practice questions.
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  {
    "question": "What is the difference between deadlock prevention and deadlock avoidance?",
    "document_ids": ["doc_a3f890e1bc22"],
    "topic": "Operating Systems",
    "mode": "qa"
  }
  ```
  - `mode` options:
    - `"qa"`: Direct, evidence-grounded conceptual answer with citations.
    - `"hint"`: Socratic guiding hint without revealing the full solution.
    - `"practice"`: Retest practice problem generated from course notes.
- **Response** (`200 OK`):
  ```json
  {
    "question": "What is the difference between deadlock prevention and deadlock avoidance?",
    "answer": "Deadlock prevention eliminates at least one of the four Coffman conditions statically, whereas deadlock avoidance dynamically inspects resource allocation state using algorithms such as Dijkstra's Banker's algorithm to ensure circular wait never arises.",
    "mode": "qa",
    "citations": [
      {
        "source_path": "Operating_Systems_Ch7.pdf",
        "document_id": "doc_a3f890e1bc22",
        "page_number": 14,
        "similarity_score": 0.8924,
        "snippet": "Avoidance algorithms dynamically track resource claims to guarantee safe states..."
      }
    ],
    "grounded": true
  }
  ```

---

### 6.4 Learning, Diagnostics & Adaptive Interventions

#### `POST /api/v1/diagnosis`
- **Description**: Classify student error misconception and record immutable audit event.
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  {
    "question": "What is the time complexity of searching a sorted array using binary search?",
    "student_answer": "O(n) because you have to inspect elements until the target is found.",
    "expected_answer": "O(log n) because half of the search space is eliminated in each iteration.",
    "topic": "Algorithms",
    "context": "Module 3: Divide and Conquer"
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "id": "err_c09e3a771bfa44",
    "student_id": "student_alice",
    "topic": "Algorithms",
    "error_category": "CONCEPTUAL_MISUNDERSTANDING",
    "confidence_score": 0.8420,
    "needs_review": false,
    "is_verified": false,
    "model_version": "baseline_v1",
    "created_at": "2026-10-25T11:30:00Z"
  }
  ```

#### `GET /api/v1/learning/state`
- **Description**: Retrieve Error DNA summary, top recurring errors, topic masteries, and forgetting recommendations.
- **Auth**: Bearer Token
- **Query Parameters**:
  - `window_days` *(integer, default: 30, range: 1–365)*
- **Response** (`200 OK`):
  ```json
  {
    "student_id": "student_alice",
    "total_diagnoses": 12,
    "review_required_count": 2,
    "confirmed_diagnoses_count": 10,
    "recurring_errors": [
      {
        "category": "CONCEPTUAL_MISUNDERSTANDING",
        "count": 6,
        "percentage": 50.0
      },
      {
        "category": "CALCULATION_ERROR",
        "count": 4,
        "percentage": 33.33
      }
    ],
    "most_affected_topics": [
      {
        "topic": "Algorithms",
        "count": 7,
        "primary_error_category": "CONCEPTUAL_MISUNDERSTANDING"
      }
    ],
    "temporal_trend": {
      "recent_window_days": 30,
      "recent_diagnoses_count": 12,
      "historical_diagnoses_count": 0,
      "trend": "INCREASING"
    },
    "topic_masteries": [
      {
        "topic": "Algorithms",
        "attempts_count": 5,
        "correct_attempts": 3,
        "incorrect_attempts": 2,
        "mastery_score": 0.4286
      }
    ],
    "revision_recommendations": []
  }
  ```

#### `GET /api/v1/learning/interventions`
- **Description**: Generate explainable pedagogical intervention recommendation with prioritized topic and targeted strategy.
- **Auth**: Bearer Token
- **Query Parameters**:
  - `candidate_topics` *(array of strings, optional)*: Filter topic candidates.
  - `include_grounded_content` *(boolean, default: false)*: Retrieve relevant excerpts from course notes.
- **Response** (`200 OK`):
  ```json
  {
    "student_id": "student_alice",
    "selected_topic": "Algorithms",
    "priority_score": 0.8125,
    "selected_strategy": "STEP_BY_STEP_DECOMPOSITION",
    "strategy_rationale": "Dominant error pattern in 'Algorithms' is CONCEPTUAL_MISUNDERSTANDING with low mastery.",
    "student_explanation": "We prioritized 'Algorithms' because recent practice attempts revealed recurring conceptual difficulties with search intervals.",
    "grounded_content": null,
    "is_uncertain": false,
    "review_required": false,
    "is_cold_start": false
  }
  ```

---

### 6.5 Assessments & Retests

#### `POST /api/v1/assessments`
- **Description**: Submit a verified assessment attempt. Normalizes scores to $[0.0, 1.0]$.
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  {
    "topic": "Algorithms",
    "learning_objective_id": "LO-ALGO-BINSEARCH",
    "assessment_type": "PRE_INTERVENTION",
    "obtained_score": 4.0,
    "max_score": 10.0,
    "evidence": "Student identified recurrence relation but miscalculated base cases.",
    "intervention_id": "STEP_BY_STEP_DECOMPOSITION"
  }
  ```
  - `assessment_type` options: `"PRE_INTERVENTION"`, `"POST_INTERVENTION"`, `"FORMATIVE"`, `"SUMMATIVE"`
- **Response** (`201 Created`):
  ```json
  {
    "id": "asmt_98234abcf001",
    "student_id": "student_alice",
    "topic": "Algorithms",
    "learning_objective_id": "LO-ALGO-BINSEARCH",
    "assessment_type": "PRE_INTERVENTION",
    "obtained_score": 4.0,
    "max_score": 10.0,
    "normalized_score": 0.40,
    "verification_status": "VERIFIED",
    "evidence": "Student identified recurrence relation but miscalculated base cases.",
    "intervention_id": "STEP_BY_STEP_DECOMPOSITION",
    "timestamp": "2026-10-25T11:45:00Z"
  }
  ```

#### `GET /api/v1/assessments`
- **Description**: List chronological assessment attempts for authenticated student.
- **Auth**: Bearer Token
- **Query Parameters**: `topic`, `learning_objective_id`, `assessment_type` (all optional).
- **Response** (`200 OK`): Array of `AssessmentResponse` objects.

#### `GET /api/v1/assessments/{assessment_id}`
- **Description**: Retrieve single assessment record by ID with ownership enforcement.
- **Auth**: Bearer Token
- **Response** (`200 OK`): Single `AssessmentResponse` object.
- **Errors**: `404 Not Found` if record does not belong to current student.

---

### 6.6 Learning Measurements & Gain Calculation

#### `POST /api/v1/learning/measurements`
- **Description**: Compute empirical normalized learning gain ($g$) between comparable pre- and post-assessments.
- **Auth**: Bearer Token
- **Request Body**:
  ```json
  {
    "pre_assessment_id": "asmt_98234abcf001",
    "post_assessment_id": "asmt_98234abcf002",
    "intervention_id": "STEP_BY_STEP_DECOMPOSITION",
    "require_verified": true,
    "update_topic_mastery": true,
    "notes": "Post-intervention evaluation following Socratic hint practice."
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "measurement_id": "meas_fa0184b99823",
    "student_id": "student_alice",
    "topic": "Algorithms",
    "learning_objective_id": "LO-ALGO-BINSEARCH",
    "pre_assessment_id": "asmt_98234abcf001",
    "post_assessment_id": "asmt_98234abcf002",
    "intervention_id": "STEP_BY_STEP_DECOMPOSITION",
    "pre_normalized_score": 0.40,
    "post_normalized_score": 0.85,
    "normalized_gain": 0.7500,
    "absolute_gain": 0.4500,
    "gain_classification": "POSITIVE",
    "is_verified": true,
    "summary_explanation": "Positive normalized learning gain (+75.00%): performance improved from 40.00% (pre) to 85.00% (post). Absolute gain: +45.00%.",
    "measured_at": "2026-10-25T12:00:00Z"
  }
  ```
  - `gain_classification` values:
    - `"POSITIVE"`: $g > 0$ (knowledge gain demonstrated)
    - `"ZERO"`: $g == 0$ (scores identical)
    - `"NEGATIVE"`: $g < 0$ (score declined)
    - `"PERFECT_PRETEST"`: Pre-score was 100% (ceiling effect; `normalized_gain` is `null`)
    - `"UNAVAILABLE"`: Measurement could not be mathematically evaluated

#### `GET /api/v1/learning/measurements`
- **Description**: List all learning measurement records for current student.
- **Auth**: Bearer Token
- **Query Parameters**: `topic` *(optional)*.
- **Response** (`200 OK`): Array of `MeasurementResponse` objects.

#### `GET /api/v1/learning/measurements/{measurement_id}`
- **Description**: Retrieve single learning measurement audit record by ID.
- **Auth**: Bearer Token
- **Response** (`200 OK`): Single `MeasurementResponse` object.

---

## 7. Frontend UI / UX State Guidelines (Google Stitch Alignment)

### 7.1 Loading States
- **AI Tutor Q&A**: Embedding and Gemini response generation typically takes 1–3 seconds. Display a pulsing Socratic skeleton loader with an indicator: *"Consulting course textbooks and synthesizing answer..."*.
- **PDF Upload**: For large multi-megabyte files, display an upload percentage progress bar followed by a chunking indicator: *"Extracting pages and computing vector embeddings..."*.
- **Adaptive Interventions**: Display a lightweight card skeleton while the multi-factor prioritization algorithm ranks candidate topics.

### 7.2 Empty States
- **New Student / Cold Start**:
  - `Error DNA`: Show illustration with caption: *"No errors diagnosed yet. Ask the AI Tutor questions or complete a practice quiz to generate your Error DNA."*
  - `Topic Masteries`: Display: *"0 topics tracked. Upload course documents and begin practicing."*
- **No Documents Ingested**:
  - Documents page: Display a dropzone with a clear CTA button: *"Upload Lecture Notes or Textbook PDF (Max 25 MB)"*.
- **Zero Measurements**:
  - Measurements tab: Display: *"Complete both a pre-test and post-test on any topic to track your normalized learning gain."*

### 7.3 Citations Badge & Source Viewer Component
When `TutorAskResponse.grounded === true`:
- Render a green **"Grounded in Course Material"** pill badge.
- Render clickable citation cards displaying:
  - Document Title / Source Filename
  - Page Number pill (e.g., `Page 14`)
  - Similarity Match percentage: `Math.round(similarity_score * 100)% match`
  - Quoted excerpt snippet in an accordion or side drawer.
- If `grounded === false`: Display an amber notice: *"No relevant excerpt found in uploaded course documents; answer generated from general computer science principles."*

### 7.4 Learning Gain Visualization
- Render normalized gain ($g$) using color-coded badge indicators:
  - $g \ge 0.5$: High Gain (Emerald Green, e.g., `+75.0%`)
  - $0.0 < g < 0.5$: Moderate Gain (Blue, e.g., `+30.0%`)
  - $g == 0.0$: Neutral (Slate Grey, `0.0%`)
  - $g < 0.0$: Performance Drop (Amber/Red, e.g., `-15.0%`)
  - Ceiling Effect (`PERFECT_PRETEST`): Purple badge: *"Mastered Prior to Intervention (100% Pre-Test)"*.

---

## 8. TypeScript Type Definitions

Save as `src/types/api.ts` in the React frontend:

```typescript
// ==========================================
// Authentication
// ==========================================
export interface StudentRegisterPayload {
  username: string;
  password: string;
  email?: string;
  full_name?: string;
}

export interface StudentLoginPayload {
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

// ==========================================
// Documents
// ==========================================
export interface DocumentListItem {
  id: string;
  title: string;
  access_level: 'PRIVATE' | 'COURSE_SHARED';
  pages_count: number;
  chunks_count: number;
  created_at?: string;
}

export interface DocumentUploadResponse {
  document_id: string;
  filename: string;
  pages_count: number;
  chunks_count: number;
  status: string;
  message: string;
}

// ==========================================
// AI Tutor
// ==========================================
export type TutorMode = 'qa' | 'hint' | 'practice';

export interface TutorAskPayload {
  question: string;
  document_ids?: string[];
  topic?: string;
  mode?: TutorMode;
}

export interface SourceCitation {
  source_path: string;
  document_id: string;
  page_number: number;
  similarity_score: number;
  snippet: string;
}

export interface TutorAskResponse {
  question: string;
  answer: string;
  mode: TutorMode;
  citations: SourceCitation[];
  grounded: boolean;
}

// ==========================================
// Diagnostics & Error DNA
// ==========================================
export interface DiagnosisPayload {
  question: string;
  student_answer: string;
  expected_answer?: string;
  topic?: string;
  context?: string;
}

export interface DiagnosisResponse {
  id: string;
  student_id: string;
  topic: string;
  error_category?: string;
  confidence_score: number;
  needs_review: boolean;
  is_verified: boolean;
  model_version: string;
  created_at?: string;
}

export interface RecurringError {
  category: string;
  count: number;
  percentage: number;
}

export interface TopicMastery {
  topic: string;
  attempts_count: number;
  correct_attempts: number;
  incorrect_attempts: number;
  mastery_score: number;
}

export interface ErrorDNASummary {
  student_id: string;
  total_diagnoses: number;
  review_required_count: number;
  confirmed_diagnoses_count: number;
  recurring_errors: RecurringError[];
  most_affected_topics: { topic: string; count: number; primary_error_category?: string }[];
  temporal_trend: {
    recent_window_days: number;
    recent_diagnoses_count: number;
    historical_diagnoses_count: number;
    trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  };
  topic_masteries: TopicMastery[];
  revision_recommendations: { topic: string; days_since_last_attempt: number; reason: string }[];
}

export interface InterventionRecommendation {
  student_id: string;
  selected_topic: string;
  priority_score: number;
  selected_strategy: string;
  strategy_rationale: string;
  student_explanation: string;
  grounded_content?: string | null;
  is_uncertain: boolean;
  review_required: boolean;
  is_cold_start: boolean;
}

// ==========================================
// Assessments & Retests
// ==========================================
export type AssessmentType = 'PRE_INTERVENTION' | 'POST_INTERVENTION' | 'FORMATIVE' | 'SUMMATIVE';

export interface AssessmentSubmissionPayload {
  topic: string;
  learning_objective_id: string;
  assessment_type?: AssessmentType;
  obtained_score: number;
  max_score: number;
  evidence: string;
  intervention_id?: string;
}

export interface AssessmentResponse {
  id: string;
  student_id: string;
  topic: string;
  learning_objective_id: string;
  assessment_type: AssessmentType;
  obtained_score: number;
  max_score: number;
  normalized_score: number;
  verification_status: 'UNVERIFIED' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED';
  evidence: string;
  intervention_id?: string;
  timestamp?: string;
}

// ==========================================
// Learning Measurements
// ==========================================
export interface MeasurementPayload {
  pre_assessment_id: string;
  post_assessment_id: string;
  intervention_id?: string;
  require_verified?: boolean;
  update_topic_mastery?: boolean;
  notes?: string;
}

export interface MeasurementResponse {
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

// ==========================================
// Error Problem Detail
// ==========================================
export interface ApiErrorResponse {
  detail: string | Array<{ loc: (string | number)[]; msg: string; type: string }>;
  error_type?: string;
}
```
