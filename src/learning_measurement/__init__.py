"""Phase 8: Retest and Learning Measurement Engine for ExamTwin.

Provides assessment lifecycle tracking, score normalization, comparability validation,
normalized learning gain calculation, and learner-state integration.
"""

from src.learning_measurement.exceptions import (
    AssessmentNotFoundError,
    AssessmentValidationError,
    IncompatibleAssessmentError,
    LearningMeasurementError,
    UnauthorizedAssessmentAccessError,
    UnverifiedEvidenceError,
)
from src.learning_measurement.models import (
    AssessmentRecord,
    AssessmentType,
    GainClassification,
    LearningMeasurementRecord,
    VerificationStatus,
)
from src.learning_measurement.repository import (
    AssessmentRepository,
    LearningMeasurementRepository,
)
from src.learning_measurement.schemas import (
    AssessmentCreate,
    AssessmentSchema,
    LearningMeasurementResult,
)
from src.learning_measurement.service import LearningMeasurementService

__all__ = [
    # Models & Enums
    "AssessmentRecord",
    "LearningMeasurementRecord",
    "AssessmentType",
    "VerificationStatus",
    "GainClassification",
    # Schemas
    "AssessmentCreate",
    "AssessmentSchema",
    "LearningMeasurementResult",
    # Repositories
    "AssessmentRepository",
    "LearningMeasurementRepository",
    # Service
    "LearningMeasurementService",
    # Exceptions
    "LearningMeasurementError",
    "AssessmentValidationError",
    "IncompatibleAssessmentError",
    "AssessmentNotFoundError",
    "UnverifiedEvidenceError",
    "UnauthorizedAssessmentAccessError",
]
