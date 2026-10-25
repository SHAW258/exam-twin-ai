"""Evaluation metrics, split reporting, and confusion matrix utilities for Error Diagnosis.

Provides academic-standard performance reporting including macro F1, per-class
precision/recall/F1, confusion matrix, and structured evaluation dictionaries.
"""

from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    precision_recall_fscore_support,
)
from sklearn.pipeline import Pipeline

from src.error_diagnosis.dataset import load_all_splits
from src.error_diagnosis.taxonomy import ErrorType


def evaluate_predictions(
    y_true: List[str],
    y_pred: List[str],
    class_labels: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Calculate multi-class classification metrics across predictions.

    Args:
        y_true: Ground truth target labels.
        y_pred: Model predicted labels.
        class_labels: Complete list of expected class labels. Defaults to canonical ErrorType.

    Returns:
        Structured dictionary containing accuracy, macro precision/recall/F1,
        per-class breakdowns, and confusion matrix.
    """
    if class_labels is None:
        class_labels = sorted(ErrorType.list_values())

    if len(y_true) == 0:
        raise ValueError("Cannot evaluate empty predictions list.")
    if len(y_true) != len(y_pred):
        raise ValueError(
            f"Length mismatch: len(y_true)={len(y_true)} vs len(y_pred)={len(y_pred)}"
        )

    # Standard summary metrics
    acc = float(accuracy_score(y_true, y_pred))

    # Macro averages (critical for balanced educational evaluation)
    p_macro, r_macro, f1_macro, _ = precision_recall_fscore_support(
        y_true, y_pred, average="macro", zero_division=0
    )

    # Weighted averages
    p_weighted, r_weighted, f1_weighted, _ = precision_recall_fscore_support(
        y_true, y_pred, average="weighted", zero_division=0
    )

    # Per-class metrics
    p_class, r_class, f1_class, support_class = precision_recall_fscore_support(
        y_true, y_pred, labels=class_labels, zero_division=0
    )

    per_class_metrics: Dict[str, Dict[str, float]] = {}
    for i, label in enumerate(class_labels):
        per_class_metrics[label] = {
            "precision": round(float(p_class[i]), 4),
            "recall": round(float(r_class[i]), 4),
            "f1_score": round(float(f1_class[i]), 4),
            "support": int(support_class[i]),
        }

    # Confusion matrix
    cm = confusion_matrix(y_true, y_pred, labels=class_labels)

    # Formatted classification report string
    report_str = classification_report(
        y_true,
        y_pred,
        labels=class_labels,
        digits=4,
        zero_division=0,
    )

    return {
        "sample_count": len(y_true),
        "accuracy": round(acc, 4),
        "macro_precision": round(float(p_macro), 4),
        "macro_recall": round(float(r_macro), 4),
        "macro_f1": round(float(f1_macro), 4),
        "weighted_f1": round(float(f1_weighted), 4),
        "per_class": per_class_metrics,
        "class_labels": class_labels,
        "confusion_matrix": cm.tolist(),
        "classification_report": report_str,
    }


def evaluate_model_on_splits(
    model: Pipeline,
    train_df: Optional[pd.DataFrame] = None,
    val_df: Optional[pd.DataFrame] = None,
    test_df: Optional[pd.DataFrame] = None,
) -> Dict[str, Any]:
    """Evaluate a trained pipeline across all three official dataset splits.

    Args:
        model: Trained scikit-learn Pipeline.
        train_df: Training DataFrame. Loaded automatically if omitted.
        val_df: Validation DataFrame. Loaded automatically if omitted.
        test_df: Final test DataFrame. Loaded automatically if omitted.

    Returns:
        Dictionary mapping each split name to its evaluation results.
    """
    from src.error_diagnosis.training import extract_features_and_labels

    if train_df is None or val_df is None or test_df is None:
        t_df, v_df, te_df = load_all_splits(validate=True)
        train_df = train_df if train_df is not None else t_df
        val_df = val_df if val_df is not None else v_df
        test_df = test_df if test_df is not None else te_df

    results: Dict[str, Any] = {}

    for split_name, df in [("train", train_df), ("validation", val_df), ("test", test_df)]:
        X, y_true = extract_features_and_labels(df)
        y_pred = model.predict(X).tolist()
        results[split_name] = evaluate_predictions(y_true, y_pred)

    return results


def format_confusion_matrix_ascii(cm: List[List[int]], labels: List[str]) -> str:
    """Format a confusion matrix as an aligned, readable ASCII table."""
    short_labels = [lbl[:12] for lbl in labels]
    col_width = max(max(len(s) for s in short_labels), 6) + 2
    row_hdr_width = max(len(s) for s in short_labels) + 2

    lines = []
    # Header
    hdr = " " * row_hdr_width + "".join(f"{s:>{col_width}}" for s in short_labels)
    lines.append(hdr)
    lines.append("-" * len(hdr))

    for i, row in enumerate(cm):
        row_str = f"{short_labels[i]:<{row_hdr_width}}" + "".join(
            f"{val:>{col_width}}" for val in row
        )
        lines.append(row_str)

    return "\n".join(lines)


if __name__ == "__main__":
    from src.error_diagnosis.training import load_model_artifacts, run_training_pipeline

    print("=" * 70)
    print("ExamTwin ML Error Diagnosis Baseline — Evaluation Report")
    print("=" * 70)

    try:
        pipeline, metadata = load_model_artifacts()
        print(f"Loaded existing model artifact (Version: {metadata.get('model_version', 'unknown')})")
    except Exception:
        print("No persisted artifact found. Running training pipeline...")
        pipeline, metadata = run_training_pipeline()

    eval_results = evaluate_model_on_splits(pipeline)

    for split in ["train", "validation", "test"]:
        res = eval_results[split]
        print(f"\n--- [{split.upper()} SPLIT - {res['sample_count']} samples] ---")
        print(f"Accuracy:        {res['accuracy']:.4f}")
        print(f"Macro Precision: {res['macro_precision']:.4f}")
        print(f"Macro Recall:    {res['macro_recall']:.4f}")
        print(f"Macro F1-Score:  {res['macro_f1']:.4f}")
        print(f"Weighted F1:     {res['weighted_f1']:.4f}")
        print("\nClassification Report:")
        print(res["classification_report"])
        print("\nConfusion Matrix (Rows=True, Cols=Predicted):")
        print(format_confusion_matrix_ascii(res["confusion_matrix"], res["class_labels"]))
