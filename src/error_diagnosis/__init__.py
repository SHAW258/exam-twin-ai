"""Error diagnosis taxonomy, dataset primitives, ML classifier baseline, and evaluation."""

from src.error_diagnosis.taxonomy import (
    ErrorType,
    DiagnosisResult,
    ERROR_TAXONOMY_DESCRIPTIONS,
    RECOMMENDED_INTERVENTIONS,
)
from src.error_diagnosis.dataset import (
    DatasetValidationError,
    validate_dataset,
    load_dataset_split,
    load_all_splits,
    get_dataset_inspection_summary,
)
from src.error_diagnosis.training import (
    build_feature_text,
    extract_features_and_labels,
    train_model,
    run_training_pipeline,
    save_model_artifacts,
    load_model_artifacts,
)
from src.error_diagnosis.evaluation import (
    evaluate_predictions,
    evaluate_model_on_splits,
    format_confusion_matrix_ascii,
)
from src.error_diagnosis.classifier import (
    ErrorDiagnosisClassifier,
    ModelNotLoadedError,
)

__all__ = [
    # Taxonomy
    "ErrorType",
    "DiagnosisResult",
    "ERROR_TAXONOMY_DESCRIPTIONS",
    "RECOMMENDED_INTERVENTIONS",
    # Dataset
    "DatasetValidationError",
    "validate_dataset",
    "load_dataset_split",
    "load_all_splits",
    "get_dataset_inspection_summary",
    # Training & Persistence
    "build_feature_text",
    "extract_features_and_labels",
    "train_model",
    "run_training_pipeline",
    "save_model_artifacts",
    "load_model_artifacts",
    # Evaluation
    "evaluate_predictions",
    "evaluate_model_on_splits",
    "format_confusion_matrix_ascii",
    # Classifier Service
    "ErrorDiagnosisClassifier",
    "ModelNotLoadedError",
]
