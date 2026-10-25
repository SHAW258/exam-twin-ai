"""Unit tests for error diagnosis model training, feature extraction, and artifact persistence."""

import tempfile
from pathlib import Path
import pandas as pd
import pytest

from src.error_diagnosis.dataset import load_dataset_split
from src.error_diagnosis.training import (
    build_feature_text,
    create_pipeline,
    extract_features_and_labels,
    load_model_artifacts,
    save_model_artifacts,
    train_model,
)


@pytest.fixture
def sample_train_df():
    """Load the canonical training split for testing."""
    return load_dataset_split("train", validate=True)


def test_build_feature_text():
    """Verify structured feature formatting with optional fields."""
    full_text = build_feature_text(
        question="What is LIFO?",
        student_answer="First in first out",
        expected_answer="Last in first out",
        context="Data Structures",
    )
    assert "Question: What is LIFO?" in full_text
    assert "Expected: Last in first out" in full_text
    assert "Student Answer: First in first out" in full_text
    assert "Context: Data Structures" in full_text

    # Missing optional fields
    partial_text = build_feature_text(
        question="What is LIFO?",
        student_answer="First in first out",
    )
    assert "Question: What is LIFO?" in partial_text
    assert "Student Answer: First in first out" in partial_text
    assert "Context:" not in partial_text


def test_extract_features_no_target_or_reason_leakage(sample_train_df):
    """Verify strictly no target label or post-hoc explanation leakage into feature text."""
    X_texts, y_labels = extract_features_and_labels(sample_train_df)

    assert len(X_texts) == len(sample_train_df)
    assert len(y_labels) == len(sample_train_df)

    for i, text in enumerate(X_texts):
        row = sample_train_df.iloc[i]
        # Target label must NOT be leaked into feature text
        target = row["error_type"]
        assert target not in text, f"Target label '{target}' leaked into feature text: {text}"

        # Post-hoc teacher reason must NOT be leaked into feature text
        reason = row["reason"]
        assert reason not in text, f"Post-hoc reason leaked into feature text: {text}"


def test_train_model_produces_fitted_pipeline(sample_train_df):
    """Verify training returns a valid, fitted scikit-learn pipeline."""
    pipeline = train_model(sample_train_df, random_state=42, C=1.0)
    assert hasattr(pipeline, "predict")
    assert hasattr(pipeline, "predict_proba")
    assert hasattr(pipeline.named_steps["classifier"], "classes_")
    assert len(pipeline.named_steps["classifier"].classes_) == 7


def test_model_training_reproducibility(sample_train_df):
    """Verify that identical random_state generates identical model predictions."""
    p1 = train_model(sample_train_df, random_state=42)
    p2 = train_model(sample_train_df, random_state=42)

    X_texts, _ = extract_features_and_labels(sample_train_df)
    preds1 = p1.predict_proba(X_texts[:5])
    preds2 = p2.predict_proba(X_texts[:5])

    assert (preds1 == preds2).all(), "Model training is non-deterministic given identical seeds"


def test_save_and_load_model_artifacts(sample_train_df):
    """Verify model pipeline and metadata roundtrip via joblib and JSON."""
    pipeline = train_model(sample_train_df, random_state=42)
    metadata = {
        "model_version": "test_v1",
        "sample_count": len(sample_train_df),
        "classes": list(pipeline.classes_),
    }

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        m_file, meta_file = save_model_artifacts(pipeline, metadata, artifacts_dir=tmp_path)

        assert m_file.exists()
        assert meta_file.exists()

        loaded_pipe, loaded_meta = load_model_artifacts(
            model_path=m_file, metadata_path=meta_file
        )

        assert loaded_meta["model_version"] == "test_v1"
        assert list(loaded_pipe.classes_) == list(pipeline.classes_)

        # Test prediction consistency
        test_sample = ["Question: test Expected: test Student Answer: test"]
        assert (loaded_pipe.predict_proba(test_sample) == pipeline.predict_proba(test_sample)).all()
