"""Authentication router implementing student registration, login, and profile retrieval."""

from datetime import timedelta
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from src.api.auth import (
    create_access_token,
    get_current_student,
    hash_password,
    verify_password,
)
from src.api.schemas import (
    StudentLoginRequest,
    StudentProfileResponse,
    StudentRegisterRequest,
    TokenResponse,
)
from src.config.settings import get_settings
from src.database.connection import DatabaseManager, get_db_manager
from src.learner_state.models import Student

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new student account",
)
def register_student(
    payload: StudentRegisterRequest,
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> TokenResponse:
    """Register a new student account with scrypt password hashing and issue a JWT access token."""
    settings = get_settings()
    username = payload.username.strip()

    with db_manager.get_session() as session:
        # Check if username already exists
        existing = session.execute(
            select(Student).where(Student.external_student_id == username)
        ).scalars().first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Student username '{username}' is already registered.",
            )

        hashed_pw = hash_password(payload.password)
        new_student = Student(
            external_student_id=username,
            email=payload.email.strip() if payload.email else None,
            full_name=payload.full_name.strip() if payload.full_name else None,
            hashed_password=hashed_pw,
            is_active=True,
        )
        session.add(new_student)
        session.flush()

        # Issue JWT access token
        access_token = create_access_token(data={"sub": username})
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            student_id=username,
            expires_in_minutes=getattr(settings, "JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 1440),
        )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate student and obtain JWT access token",
)
def login_student(
    payload: StudentLoginRequest,
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> TokenResponse:
    """Validate credentials and return a signed Bearer JWT access token."""
    settings = get_settings()
    username = payload.username.strip()

    with db_manager.get_session() as session:
        student = session.execute(
            select(Student).where(Student.external_student_id == username)
        ).scalars().first()

        if student is None or not verify_password(payload.password, student.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not student.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Student account has been deactivated.",
            )

        access_token = create_access_token(data={"sub": username})
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            student_id=username,
            expires_in_minutes=getattr(settings, "JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 1440),
        )


@router.get(
    "/me",
    response_model=StudentProfileResponse,
    summary="Retrieve authenticated student profile",
)
def get_current_student_profile(
    current_student: Student = Depends(get_current_student),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> StudentProfileResponse:
    """Return profile attributes for the current authenticated student derived from JWT token claims."""
    with db_manager.get_session() as session:
        from src.learner_state.models import ErrorDiagnosisRecord, TopicMasteryState
        diagnoses_count = (
            session.query(ErrorDiagnosisRecord)
            .filter(ErrorDiagnosisRecord.student_id == current_student.id)
            .count()
        )
        topics_count = (
            session.query(TopicMasteryState)
            .filter(TopicMasteryState.student_id == current_student.id)
            .count()
        )

    return StudentProfileResponse(
        id=current_student.id,
        external_student_id=current_student.external_student_id,
        email=current_student.email,
        full_name=current_student.full_name,
        is_active=current_student.is_active,
        total_diagnoses_count=diagnoses_count,
        topics_tracked_count=topics_count,
        created_at=current_student.created_at.isoformat() if current_student.created_at else None,
    )
