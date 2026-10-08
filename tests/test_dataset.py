"""Unit tests verifying dataset integrity, schema conformity, and taxonomy label coverage."""

import pandas as pd
import pytest

from src.config.settings import get_settings
from src.error_diagnosis.taxonomy import ErrorType


@pytest.fixture
def dataset_paths():
    settings = get_settings()
    data_dir = settings.error_diagnosis_dir
    return {
        "train": data_dir / "train.csv",
        "validation": data_dir / "validation.csv",
        "test": data_dir / "test.csv",
    }


def test_dataset_files_exist(dataset_paths):
    """Verify that train, validation, and test CSV files exist."""
    for split_name, path in dataset_paths.items():
        assert path.exists(), f"{split_name} split does not exist at {path}"


def test_dataset_columns_and_non_empty(dataset_paths):
    """Verify each split has the exact required columns and no null entries."""
    required_columns = [
        "question",
        "expected_answer",
        "student_answer",
        "topic",
        "error_type",
        "reason",
    ]

    for split_name, path in dataset_paths.items():
        df = pd.read_csv(path)
        assert len(df) > 0, f"{split_name} split is empty"
        assert list(df.columns) == required_columns, (
            f"Columns in {split_name} do not match specification: {df.columns.tolist()}"
        )
        assert df.isnull().sum().sum() == 0, f"Found missing/null values in {split_name}"


def test_dataset_error_type_validity_and_coverage(dataset_paths):
    """Verify all labels are valid taxonomy members and all 7 classes are covered."""
    valid_error_types = set(ErrorType.list_values())

    for split_name, path in dataset_paths.items():
        df = pd.read_csv(path)
        labels_present = set(df["error_type"].unique())

        # Check for invalid labels
        invalid_labels = labels_present - valid_error_types
        assert not invalid_labels, f"Invalid labels found in {split_name}: {invalid_labels}"

        # Check full coverage of all 7 categories
        missing_labels = valid_error_types - labels_present
        assert not missing_labels, (
            f"Missing error taxonomy categories in {split_name}: {missing_labels}"
        )
