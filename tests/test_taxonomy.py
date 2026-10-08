"""Unit tests for ExamTwin Error Taxonomy and DiagnosisResult data contracts."""

import pytest
from pydantic import ValidationError

from src.error_diagnosis.taxonomy import (
    ErrorType,
    DiagnosisResult,
    ERROR_TAXONOMY_DESCRIPTIONS,
    RECOMMENDED_INTERVENTIONS,
)


def test_canonical_error_types_exist():
    """Verify that all 7 required error taxonomy categories are present."""
    expected_categories = {
        "CONCEPTUAL_MISUNDERSTANDING",
        "RECALL_FAILURE",
        "FORMULA_RULE_ERROR",
        "CALCULATION_EXECUTION_ERROR",
        "REASONING_LOGICAL_ERROR",
        "QUESTION_MISREADING",
        "PARTIAL_KNOWLEDGE",
    }
    actual_categories = set(ErrorType.list_values())
    assert actual_categories == expected_categories, f"Mismatch in error categories: {actual_categories ^ expected_categories}"


def test_all_categories_have_descriptions_and_interventions():
    """Verify every error type has an associated documentation string and remediation plan."""
    for error_type in ErrorType:
        assert error_type in ERROR_TAXONOMY_DESCRIPTIONS, f"Missing description for {error_type}"
        assert len(ERROR_TAXONOMY_DESCRIPTIONS[error_type]) > 10
        assert error_type in RECOMMENDED_INTERVENTIONS, f"Missing interventions for {error_type}"
        assert len(RECOMMENDED_INTERVENTIONS[error_type]) > 0


def test_diagnosis_result_valid_instantiation():
    """Verify DiagnosisResult validates correctly with typical diagnostic payload."""
    diag = DiagnosisResult(
        error_type=ErrorType.CONCEPTUAL_MISUNDERSTANDING,
        confidence=0.86,
        reason="Confused LIFO with FIFO",
        topic="Data Structures",
        evidence=["Student answered FIFO", "Stack requires LIFO"],
    )
    assert diag.error_type == ErrorType.CONCEPTUAL_MISUNDERSTANDING
    assert diag.confidence == 0.86
    assert diag.is_error is True
    assert "worked_example" in diag.get_remediation_path()


def test_diagnosis_result_correct_answer():
    """Verify DiagnosisResult handles non-error/correct states gracefully."""
    diag = DiagnosisResult(
        error_type=None,
        confidence=1.0,
        reason="Answer matches expected concept accurately.",
        topic="Data Structures",
    )
    assert diag.error_type is None
    assert diag.is_error is False
    assert diag.get_remediation_path() == ["reinforcement_practice"]


def test_diagnosis_result_confidence_bounds():
    """Verify confidence must be bounded in [0.0, 1.0]."""
    with pytest.raises(ValidationError):
        DiagnosisResult(
            error_type=ErrorType.RECALL_FAILURE,
            confidence=1.5,  # Out of upper bound
            reason="Test",
            topic="Data Structures",
        )

    with pytest.raises(ValidationError):
        DiagnosisResult(
            error_type=ErrorType.RECALL_FAILURE,
            confidence=-0.1,  # Out of lower bound
            reason="Test",
            topic="Data Structures",
        )


def test_diagnosis_result_serialization():
    """Verify DiagnosisResult serializes to and from dict/JSON cleanly."""
    diag = DiagnosisResult(
        error_type=ErrorType.FORMULA_RULE_ERROR,
        confidence=0.92,
        reason="Used n*(n+1)/2 instead of n*(n-1)/2",
        topic="Algorithms",
        evidence=["n*(n+1)/2"],
    )
    data = diag.model_dump()
    assert data["error_type"] == "FORMULA_RULE_ERROR"
    assert data["confidence"] == 0.92

    reconstructed = DiagnosisResult.model_validate(data)
    assert reconstructed.error_type == diag.error_type
    assert reconstructed.reason == diag.reason
