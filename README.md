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
- [ ] **Phase 7: Adaptive Intervention Engine**
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


