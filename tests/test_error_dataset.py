"""Unit tests for error diagnosis dataset validation, loading, and inspection."""

import pandas as pd
import pytest

from src.error_diagnosis.dataset import (
    DatasetValidationError,
    get_dataset_inspection_summary,
    load_all_splits,
    load_dataset_split,
    validate_dataset,
)
from src.error_diagnosis.taxonomy import ErrorType


@pytest.fixture
def valid_dataset_df():
    """Create a minimal valid synthetic dataset DataFrame."""
    return pd.DataFrame([
        {
            "question": "What is a queue?",
            "expected_answer": "A FIFO data structure.",
            "student_answer": "A LIFO data structure.",
            "topic": "Data Structures",
            "error_type": "CONCEPTUAL_MISUNDERSTANDING",
            "reason": "Confused FIFO with LIFO.",
        },
        {
            "question": "Formula for full binary tree nodes?",
            "expected_answer": "2^(h+1) - 1",
            "student_answer": "2^h - 1",
            "topic": "Data Structures",
            "error_type": "FORMULA_RULE_ERROR",
            "reason": "Omitted +1 exponent.",
        },
    ])


def test_validate_dataset_valid_df(valid_dataset_df):
    """Verify validation passes on clean conforming DataFrame."""
    res = validate_dataset(valid_dataset_df, split_name="test_split")
    assert res["is_valid"] is True
    assert res["row_count"] == 2
    assert res["unique_classes"] == 2
    assert res["duplicates_count"] == 0


def test_validate_dataset_missing_column(valid_dataset_df):
    """Verify error is raised when a required column is missing."""
    df_missing = valid_dataset_df.drop(columns=["student_answer"])
    with pytest.raises(DatasetValidationError) as exc:
        validate_dataset(df_missing)
    assert "Missing required column" in str(exc.value)
    assert "student_answer" in str(exc.value)


def test_validate_dataset_missing_values(valid_dataset_df):
    """Verify error is raised when required columns contain null entries."""
    df_null = valid_dataset_df.copy()
    df_null.loc[0, "error_type"] = None
    with pytest.raises(DatasetValidationError) as exc:
        validate_dataset(df_null)
    assert "missing (null) values" in str(exc.value)


def test_validate_dataset_blank_text(valid_dataset_df):
    """Verify error is raised when text entries are empty strings or whitespace."""
    df_blank = valid_dataset_df.copy()
    df_blank.loc[0, "student_answer"] = "   "
    with pytest.raises(DatasetValidationError) as exc:
        validate_dataset(df_blank)
    assert "blank/whitespace-only" in str(exc.value)


def test_validate_dataset_unknown_labels(valid_dataset_df):
    """Verify error is raised when an unapproved error label is present."""
    df_bad_label = valid_dataset_df.copy()
    df_bad_label.loc[0, "error_type"] = "NON_EXISTENT_ERROR_TYPE"
    with pytest.raises(DatasetValidationError) as exc:
        validate_dataset(df_bad_label)
    assert "invalid error taxonomy label" in str(exc.value)


def test_validate_dataset_empty_df():
    """Verify error is raised on zero-row DataFrame unless allow_empty is set."""
    empty_df = pd.DataFrame(columns=["question", "expected_answer", "student_answer", "error_type"])
    with pytest.raises(DatasetValidationError) as exc:
        validate_dataset(empty_df, allow_empty=False)
    assert "is empty" in str(exc.value)

    res = validate_dataset(empty_df, allow_empty=True)
    assert res["row_count"] == 0


def test_validate_dataset_none_raises():
    """Verify error is raised if DataFrame is None."""
    with pytest.raises(DatasetValidationError):
        validate_dataset(None)


def test_load_dataset_split_non_existent():
    """Verify FileNotFoundError is raised for non-existent split."""
    with pytest.raises(FileNotFoundError):
        load_dataset_split("non_existent_split_12345")


def test_load_all_splits_loads_three_splits():
    """Verify load_all_splits returns 3 valid DataFrames."""
    train_df, val_df, test_df = load_all_splits(validate=True)
    assert len(train_df) == 35
    assert len(val_df) == 14
    assert len(test_df) == 14


def test_get_dataset_inspection_summary():
    """Verify dataset summary aggregates all splits properly."""
    summary = get_dataset_inspection_summary()
    assert summary["total_samples"] == 63
    assert set(summary["splits"].keys()) == {"train", "validation", "test"}
    assert summary["target_column"] == "error_type"
    assert len(summary["canonical_taxonomy_classes"]) == 7
