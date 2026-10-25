"""FastAPI application factory, middleware, exception handlers, and router integration for ExamTwin."""

import logging
from typing import Any, Dict

from fastapi import APIRouter, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api.routers import assessments, auth, documents, learning, measurements, tutor
from src.config.settings import get_settings
from src.ingestion.pdf_loader import (
    InvalidPDFSignatureError,
    PDFEmptyFileError,
    PDFLoadingError,
    PDFSizeLimitExceededError,
    PDFValidationError,
)
from src.learner_state.service import (
    InvalidStudentIdentifierError,
    LearnerStateError,
    StudentNotFoundError,
    UnauthorizedStudentAccessError,
)
from src.learning_measurement.exceptions import (
    AssessmentNotFoundError,
    AssessmentValidationError,
    IncompatibleAssessmentError,
    LearningMeasurementError,
    UnauthorizedAssessmentAccessError,
    UnverifiedEvidenceError,
)

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    """Instantiate and configure the ExamTwin FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="ExamTwin AI Tutor API",
        version="1.0.0",
        description=(
            "Web API for ExamTwin: Evidence-Grounded, Error-Aware Generative AI Tutor "
            "for Personalized Exam Preparation. Supports React + TypeScript web frontend."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    # -------------------------------------------------------------------------
    # CORS Configuration for React Frontend
    # -------------------------------------------------------------------------
    cors_origins = getattr(
        settings,
        "CORS_ORIGINS",
        ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # -------------------------------------------------------------------------
    # Domain Exception Handlers (Mapping internal domain errors to HTTP codes)
    # -------------------------------------------------------------------------
    @app.exception_handler(UnauthorizedStudentAccessError)
    @app.exception_handler(UnauthorizedAssessmentAccessError)
    async def unauthorized_access_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.warning("Unauthorized access attempted: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={"detail": str(exc), "error_type": "UnauthorizedAccess"},
        )

    @app.exception_handler(StudentNotFoundError)
    @app.exception_handler(AssessmentNotFoundError)
    async def not_found_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"detail": str(exc), "error_type": "ResourceNotFound"},
        )

    @app.exception_handler(AssessmentValidationError)
    async def validation_error_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": str(exc), "error_type": "ValidationError"},
        )

    @app.exception_handler(IncompatibleAssessmentError)
    @app.exception_handler(UnverifiedEvidenceError)
    @app.exception_handler(InvalidStudentIdentifierError)
    @app.exception_handler(PDFValidationError)
    @app.exception_handler(PDFSizeLimitExceededError)
    @app.exception_handler(InvalidPDFSignatureError)
    @app.exception_handler(PDFEmptyFileError)
    async def bad_request_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"detail": str(exc), "error_type": "BadRequest"},
        )

    @app.exception_handler(PDFLoadingError)
    async def pdf_loading_error_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": str(exc), "error_type": "UnprocessablePDF"},
        )

    # -------------------------------------------------------------------------
    # Route Registration under /api/v1
    # -------------------------------------------------------------------------
    api_v1 = APIRouter(prefix="/api/v1")
    api_v1.include_router(auth.router)
    api_v1.include_router(documents.router)
    api_v1.include_router(tutor.router)
    api_v1.include_router(learning.router)
    api_v1.include_router(assessments.router)
    api_v1.include_router(measurements.router)

    app.include_router(api_v1)

    # -------------------------------------------------------------------------
    # System & Health Endpoints
    # -------------------------------------------------------------------------
    @app.get("/health", tags=["Health"], summary="System health check")
    def health_check() -> Dict[str, Any]:
        return {
            "status": "healthy",
            "service": "ExamTwin AI Tutor API",
            "version": "1.0.0",
            "environment": getattr(settings, "APP_ENV", "development"),
        }

    @app.get("/", tags=["Root"], summary="API Root")
    def root() -> Dict[str, str]:
        return {
            "message": "Welcome to ExamTwin AI Tutor API. Visit /docs for interactive OpenAPI specification.",
            "docs": "/docs",
            "health": "/health",
            "version": "v1",
        }

    return app


# Singleton ASGI application instance for Uvicorn
app = create_app()
