"""Learner State and Error DNA package for ExamTwin.

Provides persistent student models, immutable error diagnosis audit trails,
topic mastery calculations, and explainable Error DNA summaries.
"""

from src.learner_state.models import (
    Student,
    ErrorDiagnosisRecord,
    TopicMasteryState,
)
from src.learner_state.schemas import (
    StudentProfileSchema,
    DiagnosisRecordCreate,
    DiagnosisRecordSchema,
    TopicMasterySchema,
    RecurringErrorItem,
    AffectedTopicItem,
    TemporalTrend,
    RevisionRecommendation,
    ErrorDNASummary,
)
from src.learner_state.repository import (
    StudentRepository,
    ErrorHistoryRepository,
    TopicMasteryRepository,
)
from src.learner_state.service import (
    LearnerStateService,
    LearnerStateError,
    StudentNotFoundError,
    InvalidStudentIdentifierError,
)

__all__ = [
    # Models
    "Student",
    "ErrorDiagnosisRecord",
    "TopicMasteryState",
    # Schemas
    "StudentProfileSchema",
    "DiagnosisRecordCreate",
    "DiagnosisRecordSchema",
    "TopicMasterySchema",
    "RecurringErrorItem",
    "AffectedTopicItem",
    "TemporalTrend",
    "RevisionRecommendation",
    "ErrorDNASummary",
    # Repositories
    "StudentRepository",
    "ErrorHistoryRepository",
    "TopicMasteryRepository",
    # Services & Exceptions
    "LearnerStateService",
    "LearnerStateError",
    "StudentNotFoundError",
    "InvalidStudentIdentifierError",
]
