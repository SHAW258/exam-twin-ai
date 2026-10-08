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
- [ ] **Phase 5: Supervised Error Classifier Baseline**
- [ ] **Phase 6: Error DNA & Learner State**
- [ ] **Phase 7: Adaptive Intervention Engine**
- [ ] **Phase 8: Retest & Learning Measurement**
- [ ] **Phase 9: FastAPI Service Integration**
