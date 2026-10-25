"""Dataset loading, validation, and inspection utilities for Error Diagnosis.

Provides rigorous validation for train, validation, and test splits ensuring
schema compliance, taxonomy consistency, missing value checks, and duplicate detection.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
import pandas as pd

from src.config.settings import get_settings
from src.error_diagnosis.taxonomy import ErrorType


REQUIRED_DATASET_COLUMNS = [
    "question",
    "expected_answer",
    "student_answer",
    "error_type",
]

TARGET_COLUMN = "error_type"


class DatasetValidationError(ValueError):
    """Raised when an error diagnosis dataset fails schema or data integrity validation."""
    pass


def validate_dataset(
    df: pd.DataFrame,
    split_name: str = "dataset",
    allowed_labels: Optional[Set[str]] = None,
    allow_empty: bool = False,
) -> Dict[str, Any]:
    """Validate DataFrame schema, integrity, and label consistency.

    Args:
        df: Pandas DataFrame to validate.
        split_name: Identifier for the dataset split (e.g., 'train', 'validation', 'test').
        allowed_labels: Set of valid error type string identifiers. Defaults to canonical ErrorType.
        allow_empty: If False, raises error when DataFrame is empty.

    Returns:
        Summary dictionary containing row count, column list, class distribution, and checks.

    Raises:
        DatasetValidationError: On missing columns, empty data, null entries, or invalid labels.
    """
    if allowed_labels is None:
        allowed_labels = set(ErrorType.list_values())

    if df is None:
        raise DatasetValidationError(f"[{split_name}] DataFrame cannot be None.")

    row_count = len(df)
    if row_count == 0 and not allow_empty:
        raise DatasetValidationError(f"[{split_name}] Dataset is empty (0 rows).")

    # Check required columns
    missing_cols = [col for col in REQUIRED_DATASET_COLUMNS if col not in df.columns]
    if missing_cols:
        raise DatasetValidationError(
            f"[{split_name}] Missing required column(s): {missing_cols}. "
            f"Present columns: {list(df.columns)}"
        )

    # Check for null / missing values in required columns
    null_counts = df[REQUIRED_DATASET_COLUMNS].isnull().sum().to_dict()
    cols_with_nulls = {k: v for k, v in null_counts.items() if v > 0}
    if cols_with_nulls:
        raise DatasetValidationError(
            f"[{split_name}] Found missing (null) values in required columns: {cols_with_nulls}"
        )

    # Check for empty / whitespace strings in critical text columns
    for text_col in ["question", "student_answer"]:
        if text_col in df.columns:
            empty_count = (df[text_col].astype(str).str.strip() == "").sum()
            if empty_count > 0:
                raise DatasetValidationError(
                    f"[{split_name}] Found {empty_count} blank/whitespace-only entries in column '{text_col}'."
                )

    # Check for unknown / invalid taxonomy labels
    unique_labels = set(df[TARGET_COLUMN].dropna().unique())
    invalid_labels = unique_labels - allowed_labels
    if invalid_labels:
        raise DatasetValidationError(
            f"[{split_name}] Found invalid error taxonomy label(s): {invalid_labels}. "
            f"Allowed labels: {sorted(list(allowed_labels))}"
        )

    # Duplicate detection across feature triplets
    duplicate_rows = int(df.duplicated(subset=["question", "student_answer", "error_type"]).sum())

    class_distribution = df[TARGET_COLUMN].value_counts().to_dict()

    return {
        "split_name": split_name,
        "row_count": row_count,
        "columns": list(df.columns),
        "class_distribution": class_distribution,
        "unique_classes": len(class_distribution),
        "duplicates_count": duplicate_rows,
        "is_valid": True,
    }


def load_dataset_split(
    split_name: str,
    data_dir: Optional[Path] = None,
    validate: bool = True,
) -> pd.DataFrame:
    """Load a specific CSV dataset split by name.

    Args:
        split_name: Split name without extension (e.g., 'train', 'validation', 'test').
        data_dir: Root directory containing CSV files. Defaults to settings.error_diagnosis_dir.
        validate: If True, executes validate_dataset on the loaded DataFrame.

    Returns:
        Loaded and verified pandas DataFrame.

    Raises:
        FileNotFoundError: If the CSV file does not exist.
        DatasetValidationError: If validation fails.
    """
    settings = get_settings()
    target_dir = Path(data_dir) if data_dir else settings.error_diagnosis_dir
    file_path = target_dir / f"{split_name}.csv"

    if not file_path.exists():
        raise FileNotFoundError(f"Dataset split '{split_name}' not found at: {file_path}")

    try:
        df = pd.read_csv(file_path)
    except Exception as exc:
        raise DatasetValidationError(f"Failed to read CSV at {file_path}: {exc}") from exc

    if validate:
        validate_dataset(df, split_name=split_name)

    return df


def load_all_splits(
    data_dir: Optional[Path] = None,
    validate: bool = True,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Load train, validation, and test splits as a tuple.

    Args:
        data_dir: Root directory containing CSV files.
        validate: If True, validates each split.

    Returns:
        Tuple of (train_df, validation_df, test_df).
    """
    train_df = load_dataset_split("train", data_dir=data_dir, validate=validate)
    val_df = load_dataset_split("validation", data_dir=data_dir, validate=validate)
    test_df = load_dataset_split("test", data_dir=data_dir, validate=validate)
    return train_df, val_df, test_df


def get_dataset_inspection_summary(data_dir: Optional[Path] = None) -> Dict[str, Any]:
    """Produce comprehensive summary inspection statistics for all dataset splits.

    Returns:
        Dictionary of summary statistics per split and combined totals.
    """
    train_df, val_df, test_df = load_all_splits(data_dir=data_dir, validate=True)

    splits = {
        "train": train_df,
        "validation": val_df,
        "test": test_df,
    }

    summary: Dict[str, Any] = {
        "splits": {},
        "total_samples": 0,
        "target_column": TARGET_COLUMN,
        "canonical_taxonomy_classes": ErrorType.list_values(),
    }

    for name, df in splits.items():
        val_result = validate_dataset(df, split_name=name)
        summary["splits"][name] = val_result
        summary["total_samples"] += val_result["row_count"]

    return summary
