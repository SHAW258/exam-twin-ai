# ExamTwin — ML & Generative AI Core

> **Web-Based Hybrid AI Tutor for Error-Aware Personalized Exam Preparation**
> Academic MCA Project Core Architecture

---

## 1. Project Overview

ExamTwin is an academic web application combining:
1. **Course-Grounded RAG** (Retrieval-Augmented Generation) backed by relational & vector storage
2. **LLM Generation** (Google Gemini) for explanations, hints, practice, and retests
3. **Structured Error Diagnosis** combining deterministic heuristics, a supervised ML classifier, and fallback LLM reasoning
4. **Structured Error DNA / Learner State** stored as database-backed evidence (not transient chat memory)
5. **Deterministic Adaptive Intervention** prioritizing topics and misconceptions based on frequency, recency, recurrence, and difficulty
6. **Retesting & Learning Measurement** to quantitatively verify knowledge improvement

> **Note on ML/AI Positioning**: ExamTwin is **not** a large language model trained from scratch. It integrates pretrained embedding models (Google `text-embedding-004`), cloud LLMs (Gemini `gemini-2.5-flash`), vector retrieval, a supervised baseline error classifier, and deterministic educational logic.

---

## 2. Directory Structure

```text
exam-twin-ai/
├── README.md
├── requirements.txt
├── .env.example
├── data/
│   ├── raw/                           # Raw course documents / notes (e.g., PDFs)
│   ├── processed/                     # Extracted, cleaned text chunks
│   └── error_diagnosis/               # Development error classification datasets
│       ├── train.csv
│       ├── validation.csv
│       └── test.csv
├── notebooks/                         # Experimental analysis & evaluation notebooks
│   ├── 01_dataset_analysis.ipynb
│   ├── 02_embedding_experiment.ipynb
│   ├── 03_error_classifier_baseline.ipynb
│   ├── 04_rag_evaluation.ipynb
│   └── 05_error_diagnosis_evaluation.ipynb
├── src/
│   ├── config/                        # Environment & application configuration
│   │   ├── __init__.py
│   │   └── settings.py
│   ├── database/                      # SQLAlchemy models, pooling & schema
│   │   ├── __init__.py
│   │   ├── connection.py
│   │   ├── models.py
│   │   └── schema.py
│   ├── ingestion/                     # Document ingestion, cleaning, chunking & pipeline
│   │   ├── __init__.py
│   │   ├── pdf_loader.py
│   │   ├── text_cleaner.py
│   │   ├── chunker.py
│   │   └── pipeline.py
│   ├── embeddings/                    # Pretrained embedding service abstraction
│   │   ├── __init__.py
│   │   └── embedding_service.py
│   ├── vector_store/                  # VectorStore interface & MySQL storage
│   │   ├── __init__.py
│   │   ├── base.py
│   │   └── mysql_vector_store.py
│   ├── rag/                           # Retrieval, prompt construction, RAG service
│   │   ├── __init__.py
│   │   ├── retriever.py
│   │   ├── prompt_builder.py
│   │   └── rag_service.py
│   ├── llm/                           # Gemini client & prompt templates
│   │   ├── __init__.py
│   │   └── gemini_service.py
│   ├── error_diagnosis/               # Error taxonomy, rule heuristics, classifier
│   │   ├── __init__.py
│   │   └── taxonomy.py
│   ├── learner_state/                 # Error DNA & learner profile models
│   ├── adaptive/                      # Priority scoring & intervention strategies
│   └── api/                           # FastAPI endpoints for web frontend integration
├── tests/                             # Automated test suite (78 unit/integration tests)
└── evaluation/                        # Offline evaluation scripts and metrics
```

---

## 3. Grounded RAG Architecture

The grounded Q&A pipeline links semantic vector retrieval with prompt-injection-resistant generation:

```text
Student Question
       ↓
Question Embedding (text-embedding-004)
       ↓
Vector Retrieval & Access Filtering (VectorStore)
       ↓
Top-K Relevant Chunks (Filtered by RAG_MIN_SIMILARITY)
       ↓
Context Construction & Prompt Injection Defense (PromptBuilder)
       ↓
Grounded Gemini Prompt
       ↓
Gemini LLM (gemini-2.5-flash)
       ↓
Grounded Answer + Verified Document & Page Citations
```

### Grounding & Factuality
- Gemini answers exclusively based on retrieved document chunks supplied in the prompt.
- If retrieved evidence is missing or below `RAG_MIN_SIMILARITY`, the system returns a controlled message: *"I could not find relevant information in the available course documents to answer this question."* without calling the LLM.

### Source Citation Integrity
- Page numbers and document citations are **never generated or hallucinated by Gemini**.
- Citations are extracted directly from verified `RetrievedContextChunk` metadata (`document_id`, `page_number`, `source`) tracked since Phase 2 ingestion.

### Prompt Injection & Untrusted Data Defense
- Uploaded course notes represent untrusted data.
- System instructions strictly isolate retrieved context as data. Any instruction embedded within notes (e.g., *"Ignore previous instructions"*) is ignored by system-level prompt constraints.

### User Document Ownership & Isolation
- Documents are tagged with `owner_user_id` and `access_level`:
  - **`PRIVATE`**: Visible solely to the uploader. User A cannot search or retrieve User B's private notes.
  - **`COURSE_SHARED`**: Official university or course-wide documents retrievable by all enrolled students.

---

## 4. Academic Correctness Statements

- **On Document Awareness**: We do **not** claim that Gemini automatically "knows" or indexes uploaded PDFs. The system extracts text page-by-page, generates vector embeddings, stores them in MySQL, retrieves relevant chunks via cosine similarity, and passes them as grounded context to Gemini.
- **On Hallucinations**: We do **not** claim RAG eliminates hallucinations. Rather, prompt grounding constrains generation to retrieved context, while insufficient-context handling reduces unsupported claims.
- **On Answer Correctness**: We do **not** claim the system is infallible. The pipeline is designed for systematic empirical evaluation of groundedness, retrieval relevance, answer quality, and citation accuracy.
- **On Vector Search**: MySQL stores embeddings as JSON representations; candidate retrieval uses relational filters, and cosine similarity ranking is computed at the application layer. The `VectorStore` interface allows future substitution with PostgreSQL + `pgvector` without modifying RAG or LLM services.

---

## 5. Configuration Reference

| Environment Variable | Default Value | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | *(None)* | Google AI Studio API key (mock used in automated tests) |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Generative language model identifier |
| `EMBEDDING_MODEL` | `text-embedding-004` | Pretrained vector embedding model identifier |
| `VECTOR_DIMENSION` | `768` | Dense vector dimensionality |
| `DATABASE_URL` | `mysql+pymysql://root:password@localhost:3306/exam_twin` | MySQL connection string |
| `RAG_TOP_K` | `5` | Maximum candidate chunks retrieved for context |
| `RAG_MIN_SIMILARITY` | `0.50` | Minimum cosine similarity threshold for retrieved context |
| `RAG_MAX_CONTEXT_CHARS` | `6000` | Maximum character budget allocated for context in prompt |
| `ML_MIN_CONFIDENCE` | `0.60` | Minimum confidence threshold for asserting an error category prediction |

---

## 6. Local MySQL Setup Instructions

1. **Install MySQL**: Ensure MySQL Server (8.0+ recommended) is installed and running.
2. **Create Database**:
   ```sql
   CREATE DATABASE exam_twin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. **Configure Environment (`.env`)**:
   Copy `.env.example` to `.env` and set your MySQL credentials:
   ```env
   DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/exam_twin
   ```
4. **Initialize Database Schema**:
   Run the schema initialization command:
   ```bash
   python -m src.database.schema
   ```

---

## 7. Setup and Testing

### Prerequisites
- Python 3.10+ (Tested on Python 3.14)
- MySQL Server (optional for tests; unit tests use in-memory SQLite fixtures)
- Google Gemini API Key (optional for tests; tests use deterministic offline mock provider)

### Installation Steps

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   ```

3. **Run All Tests**:
   ```bash
   python -m pytest tests/ -v
   ```

---

## 8. Implementation Roadmap

- [x] **Phase 1: Project Skeleton & Error Taxonomy**
  - Project directory structure
  - Typed configuration system with validation (`src/config/settings.py`)
  - Error taxonomy & diagnosis data contract (`src/error_diagnosis/taxonomy.py`)
  - Synthetic development dataset (`data/error_diagnosis/`)
  - Foundational unit test suite (`tests/`)
- [x] **Phase 2: PDF Ingestion & Page-Aware Chunking**
  - Page-by-page text extraction (`src/ingestion/pdf_loader.py`)
  - Deterministic text cleaning preserving math notations (`src/ingestion/text_cleaner.py`)
  - Page-aware chunking with overlap & citation provenance (`src/ingestion/chunker.py`)
- [x] **Phase 3: Embeddings & MySQL Vector Storage**
  - Pretrained embedding abstraction (`src/embeddings/embedding_service.py`)
  - Database schema for documents, pages, and chunks (`src/database/models.py`)
  - Connection & schema management (`src/database/connection.py`, `src/database/schema.py`)
  - VectorStore interface & MySQL storage implementation (`src/vector_store/mysql_vector_store.py`)
  - Document access control (`PRIVATE` vs `COURSE_SHARED`) & application-side cosine ranking
  - Integrated ingestion pipeline (`src/ingestion/pipeline.py`)
- [x] **Phase 4: Gemini LLM & Grounded RAG**
  - Retrieval abstraction preserving page metadata & similarity filtering (`src/rag/retriever.py`)
  - Grounded prompt construction with prompt-injection defense (`src/rag/prompt_builder.py`)
  - Isolated LLM service with offline mock client for testing (`src/llm/gemini_service.py`)
  - Orchestrated Q&A with verified citation attribution (`src/rag/rag_service.py`)
  - Controlled no-result / low-similarity handling
- [x] **Phase 5: Supervised Error Classifier Baseline**
  - Dataset schema validation, split inspection, and missing value checks (`src/error_diagnosis/dataset.py`)
  - Leakage-free feature engineering (`Question: {q} | Expected: {e} | Student Answer: {s} | Context: {c}`)
  - Reproducible scikit-learn TF-IDF + Logistic Regression pipeline (`src/error_diagnosis/training.py`)
  - Academic evaluation reporting (Accuracy, Macro F1, Per-Class metrics, Confusion Matrix) (`src/error_diagnosis/evaluation.py`)
  - Production prediction service with confidence thresholding & uncalibrated probability tracking (`src/error_diagnosis/classifier.py`)
  - Safe artifact serialization (`artifacts/error_classifier.joblib`, `artifacts/model_metadata.json`)
  - Comprehensive automated unit tests (28 new tests, 106 total passed)
- [x] **Phase 6: Error DNA & Learner State**
  - Database models for Student profiles, Error History, and Topic Mastery (`src/learner_state/models.py`)
  - Unique constraints, foreign keys, and cascading relational integrity
  - Repository layer separating SQL queries from domain logic (`src/learner_state/repository.py`)
  - Integration with Phase 5 classifier preserving confidence and review status (`src/learner_state/service.py`)
  - Explainable Error DNA summary derivation (recurrence, affected topics, temporal trends, revision heuristics)
  - Credential-weighted topic mastery scoring formula bounded in [0.0, 1.0]
  - Comprehensive automated unit tests (16 new tests, 122 total passed)
- [x] **Phase 7: Adaptive Intervention Engine**
  - Explainable multi-factor topic prioritization (`src/adaptive_intervention/priority.py`)
  - Normalized formula: `priority = w1*freq + w2*recency + w3*recurrence + w4*difficulty - w5*recent_success`
  - Deterministic multi-tier tie-breaking and bounds enforcement in `[0.0, 1.0]`
  - Pedagogical strategy selection mapping canonical `ErrorType` to targeted remedial activities (`src/adaptive_intervention/strategy_selector.py`)
  - Domain service orchestrating topic ranking, strategy mapping, and Error DNA synthesis (`src/adaptive_intervention/service.py`)
  - Safe cold-start handling and uncertain diagnosis review flagging (`CLARIFICATION_REQUIRED`)
  - Resilient Phase 4 course-grounded RAG retrieval integration with citation preservation
  - Comprehensive automated unit tests (23 new tests, 145 total passed)
- [ ] **Phase 8: Retest & Learning Measurement**
- [ ] **Phase 9: FastAPI Service Integration**

---

## 9. Phase 5 — Supervised Error Classifier Baseline

### Purpose & Academic Positioning
The goal of Phase 5 is to establish a **conventional, reproducible Machine Learning baseline** that categorizes student mistakes into 7 pedagogical error categories without relying on proprietary cloud LLMs.
- It learns from labeled examples rather than unstructured text prompts.
- It provides a benchmark against which future complex architectures or hybrid LLM-heuristic models can be empirically compared.

### Canonical Error Taxonomy
The model is trained across the 7 canonical categories defined in [`src/error_diagnosis/taxonomy.py`](src/error_diagnosis/taxonomy.py):
1. `CONCEPTUAL_MISUNDERSTANDING`: Fundamental confusion of definitions or core principles (e.g., LIFO vs FIFO).
2. `RECALL_FAILURE`: Inability to recall exact factual nomenclature or standard terms.
3. `FORMULA_RULE_ERROR`: Application of the wrong theorem, formula, or syntax equation.
4. `CALCULATION_EXECUTION_ERROR`: Correct reasoning, but arithmetic or mechanical execution error.
5. `REASONING_LOGICAL_ERROR`: Fallacious deductive leap connecting premises to invalid conclusions.
6. `QUESTION_MISREADING`: Failure to heed question constraints (e.g., missing negation 'NOT').
7. `PARTIAL_KNOWLEDGE`: Directionally accurate answer that omits critical base cases or conditions.

### Dataset Schema & Splits
The dataset is located in [`data/error_diagnosis/`](data/error_diagnosis/):
- **Columns**: `['question', 'expected_answer', 'student_answer', 'topic', 'error_type', 'reason']`
- **Target Label**: `error_type`
- **Split Distribution**:
  - `train.csv`: 35 samples (5 per class, perfectly balanced)
  - `validation.csv`: 14 samples (2 per class, perfectly balanced)
  - `test.csv`: 14 samples (2 per class, held out untouched until final evaluation)

### Feature Engineering & Leakage Prevention
To guarantee zero data leakage:
- Target column `error_type` is strictly excluded from features.
- Post-hoc teacher explanation `reason` is strictly excluded (as it is unavailable during live student interaction).
- Inputs are formatted as a composite string:
  ```text
  Question: {question} | Expected: {expected_answer} | Student Answer: {student_answer} | Context: {topic}
  ```
- Sublinear TF-IDF word n-grams (1-2) capture term frequencies and discrepancies between student and expected answers.

### Model Architecture
- **Pipeline**: `TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, min_df=1)` -> `LogisticRegression(C=1.0, class_weight='balanced', random_state=42, max_iter=1000)`
- **Class Imbalance**: Handled via `class_weight='balanced'`.

### Training & Evaluation Commands
To train the baseline and save artifacts:
```bash
python -m src.error_diagnosis.training
```

To evaluate the baseline across train, validation, and test splits:
```bash
python -m src.error_diagnosis.evaluation
```

### Empirical Baseline Results
Evaluated using standard macro metrics:

| Metric | Train Split (35 samples) | Validation Split (14 samples) | Final Test Split (14 samples) |
| :--- | :--- | :--- | :--- |
| **Accuracy** | 100.0% | 85.71% | 64.29% |
| **Macro Precision** | 1.0000 | 0.8810 | 0.7381 |
| **Macro Recall** | 1.0000 | 0.8571 | 0.6429 |
| **Macro F1-Score** | 1.0000 | 0.8524 | 0.6619 |
| **Weighted F1-Score** | 1.0000 | 0.8524 | 0.6619 |

### Confidence Thresholding & Uncertain Predictions
- Logistic Regression predicted probabilities provide uncalibrated diagnostic confidence estimates.
- Configurable threshold `ML_MIN_CONFIDENCE` (default `0.60`).
- If maximum class probability < `0.60`, the service withholds category assignment:
  ```json
  {
    "predicted_category": null,
    "confidence": 0.42,
    "needs_review": true,
    "message": "Model confidence (0.42) is below threshold (0.60). Category assignment is withheld to avoid false diagnostic claims.",
    "probabilities": { ... },
    "model_version": "baseline_v1"
  }
  ```

### Prediction Service Example
```python
from src.error_diagnosis.classifier import ErrorDiagnosisClassifier

classifier = ErrorDiagnosisClassifier()

result = classifier.predict_error(
    question="What is the difference between a stack and a queue?",
    expected_answer="A stack follows LIFO, while a queue follows FIFO.",
    student_answer="A stack follows FIFO and a queue follows LIFO.",
    context="Data Structures",
)

print(result["predicted_category"])  # 'CONCEPTUAL_MISUNDERSTANDING'
print(result["confidence"])          # 0.84
print(result["needs_review"])        # False
```

### Known Academic Limitations
1. **Synthetic Data**: The baseline is trained on a small, curated development dataset (63 total samples across 7 classes). It demonstrates pipeline correctness and methodology, but cannot claim to represent full real-world student distribution.
2. **Uncalibrated Probabilities**: Logistic Regression probabilities reflect distance to decision hyperplanes rather than true calibrated Bayesian probabilities.
3. **Short-Text Vocabulary Overlap**: Small overlap between subtle categories (`PARTIAL_KNOWLEDGE` vs `RECALL_FAILURE`) can lead to misclassification on terse answers without sufficient context.

---

## 10. Phase 6 — Error DNA & Persistent Learner State

### Purpose & Architecture
Phase 6 establishes a **persistent, database-backed learner state system** that captures diagnostic events, tracks mastery across curricular topics, and derives an explainable **Error DNA summary** of a student's recurring difficulties.
- Connects diagnosed errors to persistent student records rather than ephemeral chat memory.
- Strictly separates model predictions from verified correctness outcomes: a predicted error category is **never** silently treated as a confirmed incorrect assessment without ground-truth verification.
- Answers key learning questions:
  1. Which topics cause the student the most recurring difficulty?
  2. Which error categories occur most frequently?
  3. Is the student's error rate increasing, decreasing, or stable over time?
  4. Which topics demonstrate evidence of mastery?
  5. Which previously practiced topics may need revision due to elapsed time?

### Database Tables & Schema
Implemented using SQLAlchemy ORM in [`src/learner_state/models.py`](src/learner_state/models.py):

1. **`students`**:
   - `id`: Primary key (`stud_{uuid[:16]}`).
   - `external_student_id`: Unique stable identifier (e.g., student username or university registration number).
   - `created_at`, `updated_at`: UTC timestamps.
   - Cascades deletion to associated error history and topic states.

2. **`error_history`**:
   - `id`: Primary key (`err_{uuid[:16]}`).
   - `student_id`: Foreign key to `students.id` (indexed, cascading delete).
   - `topic`: Curricular topic string (indexed).
   - `error_category`: Canonical `ErrorType` value or `NULL` if low confidence / uncertain.
   - `question_reference`, `student_answer`, `expected_answer`: Audit inputs.
   - `confidence_score`: Float uncalibrated probability estimate from the classifier.
   - `needs_review`: Boolean indicating uncertain diagnoses (`confidence < min_confidence`).
   - `is_verified`, `verified_error_category`: Fields for human educator or ground-truth verification.
   - `model_version`: Tracks classifier model provenance (e.g., `baseline_v1`).
   - `created_at`: UTC timestamp of diagnosis event (indexed).
   - **Composite Indices**: `(student_id, created_at)`, `(student_id, topic)`, `(student_id, error_category)`.

3. **`topic_mastery_states`**:
   - `id`: Primary key (`mast_{uuid[:16]}`).
   - `student_id`: Foreign key to `students.id`.
   - `topic`: Curricular topic string.
   - `attempts_count`: Total evaluated attempts in this topic.
   - `correct_attempts`, `incorrect_attempts`: Verified attempt counts.
   - `mastery_score`: Calculated credential-weighted mastery bounded in `[0.0, 1.0]`.
   - `last_attempt_at`: Timestamp of most recent evaluated attempt.
   - `updated_at`: UTC timestamp.
   - **Unique Constraint**: `UniqueConstraint('student_id', 'topic')` prevents duplicate state records for the same student.

### Topic Mastery & Credential Formula
To distinguish raw percentage from statistical confidence, the system calculates both measured success rate and estimated mastery:
- **Measured Success Rate**:
  $$\text{success\_rate} = \frac{\text{correct\_attempts}}{\text{attempts\_count}} \quad (\text{if attempts} > 0 \text{ else } 0.0)$$
- **Estimated Mastery Score (Credential-Weighted)**:
  $$\text{credential\_factor} = 1.0 - \frac{1.0}{1.0 + 0.5 \times \text{attempts\_count}}$$
  $$\text{mastery\_score} = \text{round}(\text{success\_rate} \times \text{credential\_factor}, 4)$$
- **Properties**:
  - Bounded strictly between `0.0` and `1.0`.
  - Prevents 1 lucky answer ($1/1 = 100\%$) from asserting complete mastery (yields `0.3333`).
  - As evaluated attempts increase, estimated mastery converges toward the empirical success rate.

### Heuristic Forgetting Indicator
Topics with no evaluated attempts in $> 14$ days (configurable via `forgetting_threshold_days`) are flagged with a `RevisionRecommendation`. This serves as an explainable heuristic indicator of potential retention decay, not a cognitive measurement.

### Error DNA Derivation & Usage Example
```python
from src.learner_state.service import LearnerStateService

service = LearnerStateService()

# 1. Diagnose and record a student response (Phase 5 + Phase 6)
record = service.diagnose_and_record(
    external_student_id="student_101",
    question="What is a min-heap?",
    student_answer="A binary search tree where elements are in descending order",
    expected_answer="A complete binary tree where parent key <= child keys",
    topic="Data Structures",
)

# 2. Record a verified assessment attempt
service.record_verified_assessment(
    external_student_id="student_101",
    topic="Data Structures",
    is_correct=False,
)

# 3. Retrieve explainable Error DNA summary
dna = service.get_error_dna_summary(external_student_id="student_101")
print(f"Total Diagnoses: {dna.total_diagnoses}")
print(f"Top Error: {dna.recurring_errors[0].category} ({dna.recurring_errors[0].percentage}%)")
print(f"Most Affected Topic: {dna.most_affected_topics[0].topic}")
print(f"Temporal Trend: {dna.temporal_trend.trend}")
```

### Privacy & Data Integrity Safeguards
- **Student Isolation**: All queries strictly scope to the requested student identifier; Student A cannot access or aggregate Student B's records.
- **Audit Immutability**: Diagnostic events are append-only audit records.
- **Credential Protection**: No personal passwords or sensitive credentials stored.
- **Production Note**: Application-level student identifiers do not replace JWT/OAuth session authorization in production deployments.

---

## 11. Phase 7 — Adaptive Intervention Engine

### Purpose & Architecture
Phase 7 introduces the **Adaptive Intervention Engine**, which closes the loop between diagnostic assessment (Phase 5), persistent learner state (Phase 6), and pedagogical remediation. Rather than treating all errors equally or recommending generic study tasks, the engine synthesizes empirical evidence to recommend the most suitable next learning activity.

```text
Persistent Learner State (Error DNA & Topic Mastery)
                     ↓
Topic Priority Scorer (Multi-Factor Explainable Scoring)
                     ↓
Deterministic Tie-Breaking & Ranking ([0.0, 1.0])
                     ↓
Strategy Selector (Canonical ErrorType -> Pedagogical Strategy)
                     ↓
Optional Grounded RAG Retrieval (Phase 4 Service + Citations)
                     ↓
Structured InterventionRecommendation Contract
```

### Topic Prioritization Formula & Components
Topics are ranked using an explainable, configurable scoring formula implemented in [`src/adaptive_intervention/priority.py`](src/adaptive_intervention/priority.py):

$$\text{priority\_score} = \max\left(0.0, \min\left(1.0, w_1 \cdot \text{norm\_freq} + w_2 \cdot \text{recency} + w_3 \cdot \text{recurrence} + w_4 \cdot \text{difficulty} - w_5 \cdot \text{recent\_success}\right)\right)$$

| Component Score | Weight | Definition & Normalization Method |
| :--- | :---: | :--- |
| **`normalized_frequency`** | $w_1 = 0.25$ | Topic error count normalized relative to the student's highest topic error count: $\frac{E_{\text{topic}}}{\max_{t}(E_t)} \in [0.0, 1.0]$. |
| **`recency_score`** | $w_2 = 0.20$ | Linear time decay over `ADAPTIVE_RECENCY_WINDOW_DAYS` (30 days): $1.0 - \frac{\Delta t}{30} \in [0.0, 1.0]$. Events $\ge 30$ days decay to $0.0$. |
| **`recurrence_score`** | $w_3 = 0.25$ | Repeated identical error category occurrences: $0.0$ for $\le 1$ occurrence, scaling linearly to $1.0$ at `ADAPTIVE_RECURRENCE_SATURATION` (3 occurrences). |
| **`difficulty_score`** | $w_4 = 0.15$ | Empirical error rate on verified assessment attempts: $\frac{\text{incorrect\_attempts}}{\text{attempts\_count}} \in [0.0, 1.0]$. Defaults to neutral $0.0$ when attempts $= 0$. |
| **`recent_success_score`** | $w_5 = 0.15$ | Verified assessment success rate discounted by elapsed time: $\frac{\text{correct\_attempts}}{\text{attempts\_count}} \times \max\left(0, 1 - \frac{\Delta t}{30}\right)$. Lowers priority for recently mastered topics. |

#### Deterministic Tie-Breaking
When candidate topics share identical priority scores, tie-breaking follows a strict multi-tier hierarchy:
1. Higher `priority_score` (descending)
2. Higher `recurrence_score` (descending — urgent recurring misconceptions prioritized)
3. Higher `recency_score` (descending — more recent difficulties prioritized)
4. Higher `frequency_score` (descending)
5. Lexicographical topic name (ascending alphabetical)

### Canonical Pedagogical Strategy Mapping
The engine deterministically maps dominant error categories to pedagogical intervention strategies in [`src/adaptive_intervention/strategy_selector.py`](src/adaptive_intervention/strategy_selector.py):

| Canonical `ErrorType` | Recommended `InterventionStrategy` | Pedagogical Rationale |
| :--- | :--- | :--- |
| `CONCEPTUAL_MISUNDERSTANDING` | `CONCEPT_EXPLANATION` | Flawed mental model detected. Guided conceptual explanation followed by a worked example recommended. |
| `RECALL_FAILURE` | `DEFINITION_RECALL` | Inability to retrieve terminology or definitions. Active recall drills and concise terminology review recommended. |
| `FORMULA_RULE_ERROR` | `FORMULA_REVISION` | Incorrect theorem, formula, or syntax applied. Formula clarification followed by targeted application exercises recommended. |
| `CALCULATION_EXECUTION_ERROR` | `CALCULATION_DRILL` | Procedural or arithmetic misstep. Step-by-step calculation practice and procedural audit recommended. |
| `REASONING_LOGICAL_ERROR` | `STEP_BY_STEP_REASONING` | Deductive fallacy or invalid premise leap. Worked reasoning examples and step-by-step logical breakdown recommended. |
| `QUESTION_MISREADING` | `QUESTION_INTERPRETATION` | Overlooked constraints or prompt misinterpretation. Prompt interpretation exercises and constraint checklists recommended. |
| `PARTIAL_KNOWLEDGE` | `GUIDED_PRACTICE` | Incomplete but directionally accurate answer. Scaffolded practice with progressive assistance recommended. |

#### Fallback Rules
- **Tied Categories**: When multiple error categories occur with equal frequency, the selector returns `MIXED_REVIEW`.
- **Zero / Unobserved Errors**: When a topic has no recorded diagnostic errors (e.g., cold start or strong performance), it returns `GUIDED_PRACTICE`.
- **Uncertain Diagnoses**: When diagnostic evidence is below confidence threshold ($< 0.60$) or marked `needs_review=True`, the selector withholds specific category targeting and returns `CLARIFICATION_REQUIRED`.

### Cold-Start & Uncertainty Handling
- **Cold-Start Behavior**: If a student has no recorded diagnostic or assessment history, the service assigns `is_cold_start=True`, a baseline priority score of $0.0$, and recommends introductory `GUIDED_PRACTICE`. It explicitly avoids claiming that the student has any weaknesses.
- **Uncertainty Protection**: Classifier predictions are never treated as verified assessment outcomes. Low-confidence predictions trigger `review_required=True` and `CLARIFICATION_REQUIRED`, preventing unwarranted educational interventions.

### Course-Grounded RAG Integration
When `include_grounded_content=True` is requested, [`AdaptiveInterventionService`](src/adaptive_intervention/service.py) queries the Phase 4 `RAGService` to retrieve relevant textbook/notes excerpts and citations:
- Queries are aligned with the recommended strategy (e.g., conceptual explanations vs. practice problems).
- Verified page citations (`SourceCitation`) are preserved in the response contract.
- Non-blocking design: if the RAG service, vector store, or Gemini LLM is offline, the recommendation succeeds seamlessly with `grounded_content=None` and `grounded_citations=[]`.

### Example Usage
```python
from src.adaptive_intervention import AdaptiveInterventionService
from src.learner_state.service import LearnerStateService

# Initialize service
learner_service = LearnerStateService()
adaptive_service = AdaptiveInterventionService(learner_state_service=learner_service)

# Generate explainable recommendation
rec = adaptive_service.recommend_intervention(
    external_student_id="student_101",
    include_grounded_content=False,
)

print(f"Prioritized Topic: {rec.selected_topic}")
print(f"Priority Score: {rec.priority_score:.4f}")
print(f"Recommended Strategy: {rec.selected_strategy.value}")
print(f"Rationale: {rec.strategy_rationale}")
print(f"Student Explanation: {rec.student_explanation}")
```

#### Example Structured Output Schema
```json
{
  "student_id": "student_101",
  "selected_topic": "Data Structures",
  "priority_score": 0.7250,
  "priority_breakdown": {
    "frequency_score": 1.0,
    "recency_score": 1.0,
    "recurrence_score": 0.5,
    "difficulty_score": 1.0,
    "recent_success_score": 0.0,
    "final_score": 0.7250,
    "weights": {
      "w1_frequency": 0.25,
      "w2_recency": 0.20,
      "w3_recurrence": 0.25,
      "w4_difficulty": 0.15,
      "w5_recent_success": 0.15
    }
  },
  "selected_strategy": "CONCEPT_EXPLANATION",
  "strategy_rationale": "Dominant error in 'Data Structures' is CONCEPTUAL_MISUNDERSTANDING (2 occurrences). Guided concept explanation followed by a worked example recommended.",
  "student_explanation": "Topic 'Data Structures' has been prioritized (score: 0.72) due to 2 recorded diagnostic errors, high rate of incorrect assessment attempts. Recommended activity: Concept Explanation — Guided concept explanation followed by a worked example recommended.",
  "is_uncertain": false,
  "review_required": false,
  "is_cold_start": false
}
```

### Academic Limitations & Disclaimers
1. **Pedagogical Heuristics**: The prioritization formula weights ($w_1 \dots w_5$) and strategy mappings represent pedagogical heuristics. They require formal empirical calibration on real student learning datasets before making claims about learning gains.
2. **No Cognitive Claims**: The system measures recorded activity evidence, not internal intelligence, memory capacity, or cognitive aptitude.
3. **Absence of Evidence**: An unpracticed topic does not imply student deficiency; it is treated neutrally.

---

## 8. Security Architecture & Hardening

ExamTwin incorporates defense-in-depth security controls across document ingestion, persistence, and student identity boundaries.

### 8.1 PDF Ingestion Security Controls

To mitigate Denial of Service (DoS) and memory exhaustion vectors from malformed or maliciously crafted PDFs:
1. **File Size Enforcement**: Evaluated before reading files into memory via filesystem `os.stat().st_size`. Files exceeding `MAX_PDF_SIZE_BYTES` (default: 25 MB) are rejected immediately with `PDFSizeLimitExceededError`.
2. **Magic Byte Signature Inspection**: Evaluates the initial 5 bytes of the file for the standard PDF header signature (`b"%PDF-"`). Non-conforming or corrupted payloads raise `InvalidPDFSignatureError`.
3. **Empty File Detection**: 0-byte files raise `PDFEmptyFileError` without triggering parser initialization.
4. **Parsing Exception Handling**: Corrupted streams and syntax errors during `pypdf` extraction are caught safely, raising `PDFExtractionError` without leaking internal file paths or stack traces to end users.
5. **Security Disclaimer**: Magic-byte signature verification confirms file format structure but does **not** guarantee an untrusted PDF is safe from parser vulnerabilities, embedded JavaScript, or font-parsing exploits. In high-risk production deployments, parsing should occur within isolated, unprivileged container sandboxes.

### 8.2 MySQL Least Privilege & User Separation

In production and multi-tenant environments, root database users must never be utilized by the application runtime. ExamTwin establishes strict separation of duties between DML application execution and DDL administrative schema migrations.

#### 1. Runtime Application User (DML Only)
The daily application runtime needs only Data Manipulation Language (DML) permissions to query and modify records:
```sql
-- Create dedicated application user
CREATE USER 'exam_twin_app'@'localhost' IDENTIFIED BY 'STRONG_APP_PASSWORD_HERE';

-- Grant minimum necessary DML privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON exam_twin.* TO 'exam_twin_app'@'localhost';

-- Apply privileges
FLUSH PRIVILEGES;
```
*Note*: `DROP`, `ALTER`, `CREATE`, and `GRANT` are explicitly withheld from the application runtime user.

#### 2. Administrative Migration User (DDL Only)
Schema creation and database migrations should be run under a separate administrative credential:
```sql
-- Create dedicated migration/admin user
CREATE USER 'exam_twin_admin'@'localhost' IDENTIFIED BY 'STRONG_ADMIN_PASSWORD_HERE';

-- Grant DDL privileges for schema migrations
GRANT CREATE, ALTER, DROP, INDEX, REFERENCES ON exam_twin.* TO 'exam_twin_admin'@'localhost';

-- Apply privileges
FLUSH PRIVILEGES;
```

#### 3. Test Isolation
The automated test suite runs strictly on isolated in-memory SQLite instances (`sqlite:///:memory:`) or dedicated ephemeral test databases. Tests **never** connect to a production MySQL database.

### 8.3 Student Data Authorization Boundaries

ExamTwin enforces strict tenant-like boundary separation between students to prevent Insecure Direct Object References (IDOR):

1. **Trusted Principal vs. Request Identity**:
   - Request-supplied student IDs (`external_student_id`) in request bodies or query parameters are considered **untrusted inputs**.
   - When exposed over an HTTP API (Phase 9), the caller's identity MUST be derived from a verified authentication principal (e.g., cryptographic JWT `sub` claim or verified server session).
   - If an authenticated principal is provided, `enforce_student_authorization` strictly rejects any request where `requested_student_id != authenticated_student_id` by raising `UnauthorizedStudentAccessError`.
2. **Domain-Level Scoping vs. API Authentication**:
   - Service-level student scoping (`WHERE student_id = :id`) provides repository data isolation, but it **does not** replace API authentication.
   - Prior to exposing services over HTTP, an API gateway or middleware must authenticate incoming credentials, extract the verified subject, and pass it as `authenticated_student_id`.
3. **Data Isolation Tests**:
   - Regression tests verify that Student A cannot read or modify Student B's Error DNA, assessment records, diagnosis history, or intervention recommendations.
