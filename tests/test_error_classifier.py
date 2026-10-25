"""Unit tests for ErrorDiagnosisClassifier service, thresholding, and output schemas."""

import pytest
from src.error_diagnosis.classifier import (
    ErrorDiagnosisClassifier,
    ModelNotLoadedError,
)
from src.error_diagnosis.dataset import load_dataset_split
from src.error_diagnosis.taxonomy import DiagnosisResult, ErrorType
from src.error_diagnosis.training import train_model


@pytest.fixture
def trained_classifier():
    """Create an ErrorDiagnosisClassifier backed by a model fitted on training data."""
    train_df = load_dataset_split("train", validate=True)
    pipeline = train_model(train_df, random_state=42)
    metadata = {"model_version": "test_v1"}
    return ErrorDiagnosisClassifier(
        pipeline=pipeline,
        metadata=metadata,
        min_confidence=0.60,
        auto_load=False,
    )


def test_classifier_is_loaded_property(trained_classifier):
    """Verify is_loaded reflects pipeline availability."""
    assert trained_classifier.is_loaded is True
    assert trained_classifier.model_version == "test_v1"
    assert len(trained_classifier.classes) == 7

    unloaded = ErrorDiagnosisClassifier(auto_load=False)
    assert unloaded.is_loaded is False


def test_predict_error_valid_prediction(trained_classifier):
    """Verify prediction output schema on typical student error."""
    result = trained_classifier.predict_error(
        question="What is a stack data structure?",
        student_answer="A data structure where items are removed in First-In-First-Out (FIFO) order",
        expected_answer="A linear data structure following Last-In-First-Out (LIFO) principle",
        context="Data Structures",
    )

    assert "predicted_category" in result
    assert "confidence" in result
    assert "needs_review" in result
    assert "message" in result
    assert "probabilities" in result
    assert "model_version" in result
    assert result["model_version"] == "test_v1"
    assert isinstance(result["confidence"], float)
    assert 0.0 <= result["confidence"] <= 1.0

    # For clear conceptual confusion, confidence should be high
    if not result["needs_review"]:
        assert result["predicted_category"] == "CONCEPTUAL_MISUNDERSTANDING"


def test_predict_error_empty_student_answer(trained_classifier):
    """Verify empty or whitespace student answer returns needs_review=True and None category."""
    empty_res = trained_classifier.predict_error(
        question="What is recursion?",
        student_answer="",
    )
    assert empty_res["predicted_category"] is None
    assert empty_res["confidence"] == 0.0
    assert empty_res["needs_review"] is True
    assert "empty" in empty_res["message"].lower()

    whitespace_res = trained_classifier.predict_error(
        question="What is recursion?",
        student_answer="   \n\t  ",
    )
    assert whitespace_res["predicted_category"] is None
    assert whitespace_res["needs_review"] is True


def test_predict_error_missing_optional_fields(trained_classifier):
    """Verify prediction functions when expected_answer and context are omitted."""
    res = trained_classifier.predict_error(
        question="How does Dijkstra algorithm find shortest paths?",
        student_answer="It uses Prim's algorithm logic to find spanning trees",
    )
    assert "predicted_category" in res
    assert "confidence" in res
    assert "probabilities" in res
    assert len(res["probabilities"]) == 7


def test_predict_error_low_confidence_threshold_behavior(trained_classifier):
    """Verify that when top probability is below min_confidence, category is withheld."""
    # Set an impossible 99.9% confidence threshold
    strict_classifier = ErrorDiagnosisClassifier(
        pipeline=trained_classifier._pipeline,
        metadata=trained_classifier._metadata,
        min_confidence=0.999,
        auto_load=False,
    )

    res = strict_classifier.predict_error(
        question="Generic question",
        student_answer="Somewhat ambiguous vague answer",
    )

    assert res["predicted_category"] is None
    assert res["needs_review"] is True
    assert "below threshold" in res["message"]


def test_predict_error_unloaded_model_raises():
    """Verify ModelNotLoadedError is raised when trying to predict with unloaded classifier."""
    unloaded = ErrorDiagnosisClassifier(auto_load=False)
    with pytest.raises(ModelNotLoadedError):
        unloaded.predict_error(
            question="What is an array?",
            student_answer="A collection of elements",
        )


def test_diagnose_convenience_method(trained_classifier):
    """Verify diagnose() returns a valid Pydantic DiagnosisResult."""
    diag = trained_classifier.diagnose(
        question="What is the formula for Shannon capacity?",
        student_answer="C = B * log10(S/N)",
        expected_answer="C = B * log2(1 + S/N)",
        topic="Computer Networks",
    )

    assert isinstance(diag, DiagnosisResult)
    assert diag.topic == "Computer Networks"
    assert 0.0 <= diag.confidence <= 1.0
    assert len(diag.evidence) >= 1

    if diag.error_type is not None:
        assert isinstance(diag.error_type, ErrorType)
        assert len(diag.get_remediation_path()) > 0
