"""Unit tests for error diagnosis model evaluation, confusion matrix, and reporting."""

import pytest
from src.error_diagnosis.dataset import load_all_splits
from src.error_diagnosis.evaluation import (
    evaluate_model_on_splits,
    evaluate_predictions,
    format_confusion_matrix_ascii,
)
from src.error_diagnosis.taxonomy import ErrorType
from src.error_diagnosis.training import train_model


def test_evaluate_predictions_perfect_case():
    """Verify metrics calculation for perfect predictions."""
    labels = ["CONCEPTUAL_MISUNDERSTANDING", "FORMULA_RULE_ERROR"]
    y_true = ["CONCEPTUAL_MISUNDERSTANDING", "FORMULA_RULE_ERROR"]
    y_pred = ["CONCEPTUAL_MISUNDERSTANDING", "FORMULA_RULE_ERROR"]

    metrics = evaluate_predictions(y_true, y_pred, class_labels=labels)
    assert metrics["accuracy"] == 1.0
    assert metrics["macro_precision"] == 1.0
    assert metrics["macro_recall"] == 1.0
    assert metrics["macro_f1"] == 1.0
    assert metrics["sample_count"] == 2
    assert metrics["confusion_matrix"] == [[1, 0], [0, 1]]


def test_evaluate_predictions_imperfect_case():
    """Verify metrics calculation for mismatched predictions."""
    labels = ["CONCEPTUAL_MISUNDERSTANDING", "FORMULA_RULE_ERROR"]
    y_true = ["CONCEPTUAL_MISUNDERSTANDING", "FORMULA_RULE_ERROR"]
    y_pred = ["CONCEPTUAL_MISUNDERSTANDING", "CONCEPTUAL_MISUNDERSTANDING"]

    metrics = evaluate_predictions(y_true, y_pred, class_labels=labels)
    assert metrics["accuracy"] == 0.5
    assert metrics["per_class"]["CONCEPTUAL_MISUNDERSTANDING"]["recall"] == 1.0
    assert metrics["per_class"]["FORMULA_RULE_ERROR"]["recall"] == 0.0
    assert metrics["macro_f1"] < 1.0


def test_evaluate_predictions_empty_raises():
    """Verify error is raised when prediction list is empty."""
    with pytest.raises(ValueError):
        evaluate_predictions([], [])


def test_evaluate_predictions_mismatched_lengths_raises():
    """Verify error is raised when true and pred lengths differ."""
    with pytest.raises(ValueError):
        evaluate_predictions(["A", "B"], ["A"])


def test_format_confusion_matrix_ascii():
    """Verify ASCII formatting utility returns non-empty structured text."""
    cm = [[2, 0], [1, 1]]
    labels = ["CLASS_A", "CLASS_B"]
    text = format_confusion_matrix_ascii(cm, labels)
    assert "CLASS_A" in text
    assert "CLASS_B" in text
    assert "2" in text


def test_evaluate_model_on_splits():
    """Verify evaluate_model_on_splits runs across all 3 splits."""
    train_df, val_df, test_df = load_all_splits(validate=True)
    model = train_model(train_df, random_state=42)

    results = evaluate_model_on_splits(model, train_df=train_df, val_df=val_df, test_df=test_df)
    assert "train" in results
    assert "validation" in results
    assert "test" in results

    # Verify expected sample counts per split
    assert results["train"]["sample_count"] == 35
    assert results["validation"]["sample_count"] == 14
    assert results["test"]["sample_count"] == 14

    # Verify metrics structure
    for split in ["train", "validation", "test"]:
        res = results[split]
        assert "accuracy" in res
        assert "macro_f1" in res
        assert "per_class" in res
        assert "confusion_matrix" in res
        assert len(res["per_class"]) == len(ErrorType.list_values())
