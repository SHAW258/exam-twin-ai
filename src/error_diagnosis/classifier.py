"""Supervised Error Diagnosis Classifier Service for ExamTwin.

Provides a clean inference interface using the trained TF-IDF + Logistic Regression
baseline with configurable confidence thresholding, uncalibrated probability
estimation, and graceful handling of missing or uncertain student responses.
"""

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
from sklearn.pipeline import Pipeline

from src.config.settings import get_settings
from src.error_diagnosis.taxonomy import (
    DiagnosisResult,
    ERROR_TAXONOMY_DESCRIPTIONS,
    ErrorType,
)
from src.error_diagnosis.training import (
    DEFAULT_MODEL_VERSION,
    build_feature_text,
    load_model_artifacts,
)

logger = logging.getLogger(__name__)


class ModelNotLoadedError(RuntimeError):
    """Raised when prediction is requested but no model is loaded or trained."""
    pass


class ErrorDiagnosisClassifier:
    """Conventional ML classifier baseline for diagnosing student mistakes."""

    def __init__(
        self,
        pipeline: Optional[Pipeline] = None,
        metadata: Optional[Dict[str, Any]] = None,
        min_confidence: Optional[float] = None,
        model_path: Optional[Path] = None,
        auto_load: bool = True,
    ):
        """Initialize ErrorDiagnosisClassifier.

        Args:
            pipeline: Pre-fitted scikit-learn Pipeline. If None and auto_load=True, loaded from disk.
            metadata: Associated model metadata. If None and auto_load=True, loaded from disk.
            min_confidence: Threshold below which predictions are marked uncertain. Defaults to settings.ML_MIN_CONFIDENCE.
            model_path: Custom path to joblib artifact.
            auto_load: If True, automatically attempts to load artifacts from disk if pipeline is None.
        """
        settings = get_settings()
        self.min_confidence = (
            min_confidence if min_confidence is not None else settings.ML_MIN_CONFIDENCE
        )
        self._pipeline = pipeline
        self._metadata = metadata or {}
        self._model_path = model_path

        if self._pipeline is None and auto_load:
            try:
                self._pipeline, self._metadata = load_model_artifacts(model_path=model_path)
                logger.info(
                    "Loaded error diagnosis model version '%s'", self.model_version
                )
            except Exception as exc:
                logger.warning(
                    "Could not auto-load error diagnosis model from disk: %s", exc
                )

    @property
    def is_loaded(self) -> bool:
        """True if a valid, fitted model pipeline is available."""
        return self._pipeline is not None

    @property
    def model_version(self) -> str:
        """Model version identifier recorded in metadata or default fallback."""
        return self._metadata.get("model_version", DEFAULT_MODEL_VERSION)

    @property
    def classes(self) -> List[str]:
        """List of target class labels learned by the classifier."""
        if not self.is_loaded:
            return sorted(ErrorType.list_values())
        return list(self._pipeline.classes_)

    def predict_error(
        self,
        question: str,
        student_answer: str,
        expected_answer: Optional[str] = None,
        context: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Predict the most probable error category for a student response.

        Args:
            question: The question or task presented to the student.
            student_answer: The student's submitted response text.
            expected_answer: The reference or gold standard answer (optional).
            context: Course, module, or topic context string (optional).

        Returns:
            Structured prediction dictionary containing:
            - predicted_category: Optional[str] (canonical ErrorType or None if uncertain)
            - confidence: float (0.0 to 1.0, uncalibrated probability)
            - needs_review: bool (True if empty, uncertain, or low confidence)
            - message: str (Diagnostic explanation or status notice)
            - probabilities: Dict[str, float] (per-class probability distribution)
            - model_version: str
        """
        # Guard: check model availability
        if not self.is_loaded:
            raise ModelNotLoadedError(
                "Error classifier pipeline is not loaded. Train the baseline model or provide a valid artifact path."
            )

        # Guard: check for blank or whitespace student response
        if not student_answer or not str(student_answer).strip():
            return {
                "predicted_category": None,
                "confidence": 0.0,
                "needs_review": True,
                "message": "Student answer is empty or whitespace-only; cannot perform error diagnosis.",
                "probabilities": {cls_name: 0.0 for cls_name in self.classes},
                "model_version": self.model_version,
            }

        # Build composite feature string
        feature_text = build_feature_text(
            question=question,
            student_answer=student_answer,
            expected_answer=expected_answer,
            context=context,
        )

        # Compute class probability distribution
        try:
            probabilities = self._pipeline.predict_proba([feature_text])[0]
        except Exception as exc:
            raise RuntimeError(f"Model prediction inference failed: {exc}") from exc

        classes = self._pipeline.classes_
        proba_dict: Dict[str, float] = {
            cls_name: round(float(prob), 4) for cls_name, prob in zip(classes, probabilities)
        }

        # Identify top class and associated probability
        top_idx = int(np.argmax(probabilities))
        top_class = str(classes[top_idx])
        top_confidence = round(float(probabilities[top_idx]), 4)

        # Apply confidence thresholding
        if top_confidence < self.min_confidence:
            return {
                "predicted_category": None,
                "confidence": top_confidence,
                "needs_review": True,
                "message": (
                    f"Model confidence ({top_confidence:.2f}) is below threshold ({self.min_confidence:.2f}). "
                    "Category assignment is withheld to avoid false diagnostic claims."
                ),
                "probabilities": proba_dict,
                "model_version": self.model_version,
            }

        return {
            "predicted_category": top_class,
            "confidence": top_confidence,
            "needs_review": False,
            "message": f"Diagnosed as {top_class} with confidence {top_confidence:.2f}.",
            "probabilities": proba_dict,
            "model_version": self.model_version,
        }

    def diagnose(
        self,
        question: str,
        student_answer: str,
        expected_answer: Optional[str] = None,
        context: Optional[str] = None,
        topic: Optional[str] = None,
    ) -> DiagnosisResult:
        """Convenience method returning a validated DiagnosisResult Pydantic contract.

        Converts classifier output into the system-wide DiagnosisResult model.
        """
        pred = self.predict_error(
            question=question,
            student_answer=student_answer,
            expected_answer=expected_answer,
            context=context or topic,
        )

        cat_str = pred["predicted_category"]
        error_type: Optional[ErrorType] = None
        if cat_str and cat_str in ErrorType.list_values():
            error_type = ErrorType(cat_str)

        resolved_topic = topic or context or "General"
        description = ERROR_TAXONOMY_DESCRIPTIONS.get(error_type, pred["message"]) if error_type else pred["message"]

        evidence_items = [f"Input: {question[:80]}..."]
        if expected_answer:
            evidence_items.append(f"Expected: {expected_answer[:80]}...")
        evidence_items.append(f"Student: {student_answer[:80]}...")

        return DiagnosisResult(
            error_type=error_type,
            confidence=pred["confidence"],
            reason=description,
            topic=resolved_topic,
            evidence=evidence_items,
        )
