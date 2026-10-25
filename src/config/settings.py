"""Application configuration management using Pydantic Settings."""

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for ExamTwin AI/ML core services.

    Values are loaded from environment variables or a local `.env` file.
    Sensible defaults are provided for local development.
    """

    # -------------------------------------------------------------------------
    # Base Project Paths
    # -------------------------------------------------------------------------
    PROJECT_ROOT: Path = Field(
        default_factory=lambda: Path(__file__).resolve().parent.parent.parent
    )

    # -------------------------------------------------------------------------
    # Generative AI & Embeddings
    # -------------------------------------------------------------------------
    GEMINI_API_KEY: Optional[SecretStr] = Field(
        default=None,
        description="Google Gemini API key for grounded answering, hints, and diagnosis."
    )
    GEMINI_MODEL: str = Field(
        default="gemini-3.8-flash",
        description="Model name used for grounded reasoning, hints, and retest generation."
    )
    EMBEDDING_MODEL: str = Field(
        default="gemini-embedding-001",
        description="Model identifier for vector embedding generation."
    )

    # -------------------------------------------------------------------------
    # Database Configuration (MySQL / SQLAlchemy)
    # -------------------------------------------------------------------------
    DATABASE_URL: str = Field(
        default="mysql+pymysql://exam_twin_user:exam_twin_pass@localhost:3306/exam_twin",
        description="Connection URI for MySQL via PyMySQL driver using dedicated application user (or SQLite in tests).",
    )
    VECTOR_DIMENSION: int = Field(
        default=768,
        description="Embedding dimension (e.g. 768 for text-embedding-004)."
    )

    # -------------------------------------------------------------------------
    # Document Ingestion & Upload Security
    # -------------------------------------------------------------------------
    MAX_PDF_SIZE_BYTES: int = Field(
        default=25 * 1024 * 1024,
        ge=1024,
        description="Maximum allowed PDF file size in bytes (default 25 MB).",
    )
    VALIDATE_PDF_SIGNATURE: bool = Field(
        default=True,
        description="Whether to enforce magic byte (%PDF-) header verification before parsing.",
    )

    # -------------------------------------------------------------------------
    # Adaptive Engine Scoring Weights
    # priority = w1*freq + w2*recency + w3*recurrence + w4*difficulty - w5*recent_success
    # -------------------------------------------------------------------------
    ADAPTIVE_W1_FREQUENCY: float = Field(default=0.25, ge=0.0, le=1.0)
    ADAPTIVE_W2_RECENCY: float = Field(default=0.20, ge=0.0, le=1.0)
    ADAPTIVE_W3_RECURRENCE: float = Field(default=0.25, ge=0.0, le=1.0)
    ADAPTIVE_W4_DIFFICULTY: float = Field(default=0.15, ge=0.0, le=1.0)
    ADAPTIVE_W5_RECENT_SUCCESS: float = Field(default=0.15, ge=0.0, le=1.0)
    ADAPTIVE_RECENCY_WINDOW_DAYS: int = Field(
        default=30,
        ge=1,
        description="Time window in days for linear decay of topic error recency.",
    )
    ADAPTIVE_RECURRENCE_SATURATION: int = Field(
        default=3,
        ge=1,
        description="Number of repeated identical error category occurrences to reach maximum recurrence score.",
    )
    ADAPTIVE_SUCCESS_WINDOW_DAYS: int = Field(
        default=30,
        ge=1,
        description="Time window in days for recency scaling of verified topic successes.",
    )


    # -------------------------------------------------------------------------
    # RAG Retrieval & Context Configuration
    # -------------------------------------------------------------------------
    RAG_TOP_K: int = Field(
        default=5,
        ge=1,
        description="Default number of top relevant chunks to retrieve for RAG context.",
    )
    RAG_MIN_SIMILARITY: float = Field(
        default=0.50,
        ge=0.0,
        le=1.0,
        description="Minimum cosine similarity threshold for retrieved context chunks.",
    )
    RAG_MAX_CONTEXT_CHARS: int = Field(
        default=6000,
        ge=500,
        description="Maximum character budget allocated for retrieved context in prompt.",
    )

    # -------------------------------------------------------------------------
    # Machine Learning Error Diagnosis Settings
    # -------------------------------------------------------------------------
    ML_MIN_CONFIDENCE: float = Field(
        default=0.60,
        ge=0.0,
        le=1.0,
        description="Minimum confidence threshold for asserting an error category prediction.",
    )

    # -------------------------------------------------------------------------
    # Runtime & Service Settings
    # -------------------------------------------------------------------------
    APP_ENV: str = Field(default="development")
    LOG_LEVEL: str = Field(default="INFO")
    API_HOST: str = Field(default="0.0.0.0")
    API_PORT: int = Field(default=8000)

    # -------------------------------------------------------------------------
    # Derived Data Directory Helpers
    # -------------------------------------------------------------------------
    @property
    def data_dir(self) -> Path:
        """Root data directory."""
        return self.PROJECT_ROOT / "data"

    @property
    def raw_data_dir(self) -> Path:
        """Directory for incoming course documents / PDFs."""
        return self.data_dir / "raw"

    @property
    def processed_data_dir(self) -> Path:
        """Directory for chunked, processed text documents."""
        return self.data_dir / "processed"

    @property
    def error_diagnosis_dir(self) -> Path:
        """Directory containing diagnostic dataset splits."""
        return self.data_dir / "error_diagnosis"

    @property
    def artifacts_dir(self) -> Path:
        """Directory for trained models and ML artifacts."""
        return self.PROJECT_ROOT / "artifacts"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    """Retrieve cached application settings instance."""
    return Settings()
