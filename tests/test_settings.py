"""Unit tests for configuration loading and directory path resolution."""

from pathlib import Path
from src.config.settings import Settings, get_settings


def test_settings_default_instantiation():
    """Verify settings loads with valid defaults."""
    settings = Settings()
    assert settings.APP_ENV in ["development", "production", "test"]
    assert settings.VECTOR_DIMENSION == 768
    assert settings.GEMINI_MODEL is not None
    assert settings.EMBEDDING_MODEL is not None


def test_settings_path_resolution():
    """Verify path helper properties point to valid project directories."""
    settings = Settings()
    assert isinstance(settings.PROJECT_ROOT, Path)
    assert settings.data_dir == settings.PROJECT_ROOT / "data"
    assert settings.raw_data_dir == settings.PROJECT_ROOT / "data" / "raw"
    assert settings.processed_data_dir == settings.PROJECT_ROOT / "data" / "processed"
    assert settings.error_diagnosis_dir == settings.PROJECT_ROOT / "data" / "error_diagnosis"


def test_adaptive_weights_within_bounds():
    """Verify adaptive scoring weights are non-negative and properly initialized."""
    settings = Settings()
    weights = [
        settings.ADAPTIVE_W1_FREQUENCY,
        settings.ADAPTIVE_W2_RECENCY,
        settings.ADAPTIVE_W3_RECURRENCE,
        settings.ADAPTIVE_W4_DIFFICULTY,
        settings.ADAPTIVE_W5_RECENT_SUCCESS,
    ]
    for w in weights:
        assert 0.0 <= w <= 1.0


def test_get_settings_caching():
    """Verify get_settings returns the cached singleton."""
    s1 = get_settings()
    s2 = get_settings()
    assert s1 is s2


def test_pdf_upload_security_settings():
    """Verify PDF security defaults: 25 MB max size and signature validation enabled."""
    settings = Settings()
    assert settings.MAX_PDF_SIZE_BYTES == 25 * 1024 * 1024  # 25 MB
    assert settings.VALIDATE_PDF_SIGNATURE is True
    # The default declared model field must not contain root credentials
    default_db_url = Settings.model_fields["DATABASE_URL"].default
    assert "root" not in default_db_url.lower()
