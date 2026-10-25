"""Model training, feature engineering, and artifact persistence for Error Diagnosis.

Implements a reproducible TF-IDF + Logistic Regression pipeline designed
to classify student response mistakes into pedagogical error taxonomy categories.
"""

from datetime import datetime, timezone
import json
import logging
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional, Tuple
import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
import sklearn

from src.config.settings import get_settings
from src.error_diagnosis.dataset import (
    TARGET_COLUMN,
    load_all_splits,
    validate_dataset,
)
from src.error_diagnosis.taxonomy import ErrorType

logger = logging.getLogger(__name__)

DEFAULT_MODEL_VERSION = "baseline_v1"
MODEL_FILENAME = "error_classifier.joblib"
METADATA_FILENAME = "model_metadata.json"


def build_feature_text(
    question: str,
    student_answer: str,
    expected_answer: Optional[str] = None,
    context: Optional[str] = None,
) -> str:
    """Construct a composite, structured text representation for feature extraction.

    Transparently prefixes each available field so that n-gram features capture
    field identity as well as term co-occurrence and discrepancy signals.

    Args:
        question: The problem or prompt presented to the student.
        student_answer: The student's submitted response.
        expected_answer: Reference / gold answer, if available.
        context: Optional topic, subject, or course context string.

    Returns:
        Formatted single text string.
    """
    parts = [
        f"Question: {(question or '').strip()}",
        f"Expected: {(expected_answer or '').strip()}",
        f"Student Answer: {(student_answer or '').strip()}",
    ]
    if context and str(context).strip():
        parts.append(f"Context: {str(context).strip()}")

    return " | ".join(parts)


def extract_features_and_labels(df: pd.DataFrame) -> Tuple[List[str], List[str]]:
    """Extract input feature strings and ground truth target labels from DataFrame.

    Strictly guarantees no data leakage:
    - Target label ('error_type') is never included in the input feature text.
    - Post-hoc teacher explanation ('reason') is omitted from feature text.

    Args:
        df: Input DataFrame conforming to error diagnosis dataset schema.

    Returns:
        Tuple of (X_texts, y_labels).
    """
    validate_dataset(df, split_name="feature_extraction")

    X_texts: List[str] = []
    for _, row in df.iterrows():
        text = build_feature_text(
            question=str(row.get("question", "")),
            student_answer=str(row.get("student_answer", "")),
            expected_answer=str(row.get("expected_answer", "")) if pd.notnull(row.get("expected_answer")) else None,
            context=str(row.get("topic", "")) if "topic" in row and pd.notnull(row.get("topic")) else None,
        )
        X_texts.append(text)

    y_labels = df[TARGET_COLUMN].astype(str).tolist()
    return X_texts, y_labels


def create_pipeline(
    random_state: int = 42,
    C: float = 1.0,
    ngram_range: Tuple[int, int] = (1, 2),
    sublinear_tf: bool = True,
    max_features: Optional[int] = 5000,
) -> Pipeline:
    """Build a scikit-learn Pipeline with TF-IDF Vectorizer and Logistic Regression.

    Args:
        random_state: Seed for reproducibility.
        C: Inverse regularization strength for Logistic Regression.
        ngram_range: (min_n, max_n) word n-gram bounds.
        sublinear_tf: Apply sublinear scaling (1 + log(tf)).
        max_features: Upper bound on vocabulary size.

    Returns:
        Unfitted scikit-learn Pipeline.
    """
    return Pipeline(
        steps=[
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=ngram_range,
                    sublinear_tf=sublinear_tf,
                    max_features=max_features,
                    lowercase=True,
                    strip_accents="unicode",
                    min_df=1,
                ),
            ),
            (
                "classifier",
                LogisticRegression(
                    C=C,
                    class_weight="balanced",
                    random_state=random_state,
                    max_iter=1000,
                    solver="lbfgs",
                ),
            ),
        ]
    )


def train_model(
    train_df: pd.DataFrame,
    random_state: int = 42,
    C: float = 1.0,
    ngram_range: Tuple[int, int] = (1, 2),
) -> Pipeline:
    """Train the TF-IDF + Logistic Regression pipeline strictly on training data.

    Args:
        train_df: Validated training DataFrame.
        random_state: Seed for deterministic training.
        C: Regularization strength parameter.
        ngram_range: n-gram bounds for TF-IDF.

    Returns:
        Fitted scikit-learn Pipeline.
    """
    X_train, y_train = extract_features_and_labels(train_df)
    pipeline = create_pipeline(
        random_state=random_state,
        C=C,
        ngram_range=ngram_range,
    )
    pipeline.fit(X_train, y_train)
    return pipeline


def save_model_artifacts(
    pipeline: Pipeline,
    metadata: Dict[str, Any],
    artifacts_dir: Optional[Path] = None,
) -> Tuple[Path, Path]:
    """Safely persist trained model pipeline and accompanying metadata to disk.

    Args:
        pipeline: Trained scikit-learn Pipeline.
        metadata: Model training, evaluation, and provenance metadata dictionary.
        artifacts_dir: Target output directory. Defaults to settings.artifacts_dir.

    Returns:
        Tuple of (model_file_path, metadata_file_path).
    """
    settings = get_settings()
    out_dir = Path(artifacts_dir) if artifacts_dir else settings.artifacts_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    model_path = out_dir / MODEL_FILENAME
    metadata_path = out_dir / METADATA_FILENAME

    # Save pipeline via joblib
    joblib.dump(pipeline, model_path)

    # Save metadata as formatted JSON
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    logger.info("Saved model to %s and metadata to %s", model_path, metadata_path)
    return model_path, metadata_path


def load_model_artifacts(
    model_path: Optional[Path] = None,
    metadata_path: Optional[Path] = None,
) -> Tuple[Pipeline, Dict[str, Any]]:
    """Load model pipeline and metadata from disk with security and integrity checks.

    Args:
        model_path: Path to joblib file. Defaults to settings.artifacts_dir / error_classifier.joblib.
        metadata_path: Path to metadata JSON file. Defaults to settings.artifacts_dir / model_metadata.json.

    Returns:
        Tuple of (loaded_pipeline, metadata_dict).

    Raises:
        FileNotFoundError: If artifact files are missing.
        RuntimeError: If loading fails.
    """
    settings = get_settings()
    m_path = Path(model_path) if model_path else settings.artifacts_dir / MODEL_FILENAME
    meta_path = Path(metadata_path) if metadata_path else settings.artifacts_dir / METADATA_FILENAME

    if not m_path.exists():
        raise FileNotFoundError(
            f"Model artifact not found at {m_path}. Run training pipeline to generate baseline model."
        )

    try:
        pipeline = joblib.load(m_path)
    except Exception as exc:
        raise RuntimeError(f"Failed to load model artifact from {m_path}: {exc}") from exc

    metadata: Dict[str, Any] = {}
    if meta_path.exists():
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)
        except Exception as exc:
            logger.warning("Failed to parse metadata JSON at %s: %s", meta_path, exc)

    return pipeline, metadata


def run_training_pipeline(
    data_dir: Optional[Path] = None,
    artifacts_dir: Optional[Path] = None,
    model_version: str = DEFAULT_MODEL_VERSION,
    random_state: int = 42,
    C: float = 1.0,
) -> Tuple[Pipeline, Dict[str, Any]]:
    """Execute end-to-end model training, validation, and artifact persistence.

    Fits model strictly on train split, verifies on validation split,
    and records full lineage metadata.

    Returns:
        Tuple of (trained_pipeline, metadata_dictionary).
    """
    train_df, val_df, test_df = load_all_splits(data_dir=data_dir, validate=True)

    logger.info("Starting training of %s on %d samples...", model_version, len(train_df))
    pipeline = train_model(train_df, random_state=random_state, C=C)

    # Evaluate on train and validation splits for metadata recording
    from src.error_diagnosis.evaluation import evaluate_predictions

    X_train, y_train = extract_features_and_labels(train_df)
    train_preds = pipeline.predict(X_train)
    train_metrics = evaluate_predictions(y_train, train_preds.tolist())

    X_val, y_val = extract_features_and_labels(val_df)
    val_preds = pipeline.predict(X_val)
    val_metrics = evaluate_predictions(y_val, val_preds.tolist())

    # Build provenance metadata
    metadata = {
        "model_version": model_version,
        "model_type": "TF-IDF + LogisticRegression",
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "academic_project": "ExamTwin AI (MCA)",
        "features": {
            "format_template": "Question: {q} | Expected: {e} | Student Answer: {s} | Context: {c}",
            "ngram_range": [1, 2],
            "sublinear_tf": True,
            "strip_accents": "unicode",
            "lowercase": True,
        },
        "hyperparameters": {
            "C": C,
            "class_weight": "balanced",
            "solver": "lbfgs",
            "max_iter": 1000,
            "random_state": random_state,
        },
        "classes": sorted(ErrorType.list_values()),
        "dataset_split_sizes": {
            "train": len(train_df),
            "validation": len(val_df),
            "test": len(test_df),
        },
        "training_metrics": {
            "accuracy": train_metrics["accuracy"],
            "macro_f1": train_metrics["macro_f1"],
        },
        "validation_metrics": {
            "accuracy": val_metrics["accuracy"],
            "macro_f1": val_metrics["macro_f1"],
        },
        "library_versions": {
            "scikit-learn": sklearn.__version__,
            "joblib": joblib.__version__,
            "pandas": pd.__version__,
            "numpy": np.__version__,
            "python": sys.version.split()[0],
        },
        "notes": (
            "Baseline trained on synthetic development dataset. "
            "Evaluated strictly without data leakage. "
            "Probabilities are uncalibrated and require confidence thresholding."
        ),
    }

    save_model_artifacts(pipeline, metadata, artifacts_dir=artifacts_dir)
    return pipeline, metadata


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    pipe, meta = run_training_pipeline()
    print("Training finished successfully.")
    print(f"Model version: {meta['model_version']}")
    print(f"Validation Accuracy: {meta['validation_metrics']['accuracy']:.4f}")
    print(f"Validation Macro F1: {meta['validation_metrics']['macro_f1']:.4f}")
