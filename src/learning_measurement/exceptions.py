"""Domain exception hierarchy for Phase 8: Retest and Learning Measurement Engine."""


class LearningMeasurementError(Exception):
    """Base exception for all Phase 8 learning measurement operations."""
    pass


class AssessmentValidationError(LearningMeasurementError):
    """Raised when an assessment payload fails structural or semantic validation.

    Examples: negative score, zero or negative max_score, score > max_score,
    missing evidence, blank identifiers, or invalid status.
    """
    pass


class IncompatibleAssessmentError(LearningMeasurementError):
    """Raised when comparing pre- and post-tests that are not comparable.

    Examples: mismatched learning objectives, mismatched topics, or mismatched students.
    """
    pass


class AssessmentNotFoundError(LearningMeasurementError):
    """Raised when a referenced assessment record cannot be located in storage."""
    pass


class UnverifiedEvidenceError(LearningMeasurementError):
    """Raised when learning gain computation is attempted on unverified assessment evidence."""
    pass


class UnauthorizedAssessmentAccessError(LearningMeasurementError):
    """Raised when an operation attempts unauthorized cross-learner access to assessment records."""
    pass
