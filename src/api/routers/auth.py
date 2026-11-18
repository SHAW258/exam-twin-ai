"""Authentication router implementing student registration, login, and profile retrieval."""

import logging
import random
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from src.api.auth import (
    create_access_token,
    get_current_student,
    hash_password,
    verify_password,
)
from src.api.schemas import (
    OTPRequestResponse,
    RegisterOTPRequest,
    ResendRegisterOTPRequest,
    StudentLoginRequest,
    StudentProfileResponse,
    StudentRegisterRequest,
    TokenResponse,
    VerifyRegisterOTPRequest,
)
from src.config.settings import get_settings
from src.database.connection import DatabaseManager, get_db_manager
from src.database.models import RegistrationOTP
from src.learner_state.models import Student

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _generate_otp_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def _send_otp_email(email: str, otp_code: str) -> bool:
    """Send OTP email via SMTP if configured. Returns True if sent, False if skipped/unconfigured."""
    settings = get_settings()
    host = getattr(settings, "SMTP_HOST", None)
    from_email = getattr(settings, "SMTP_FROM_EMAIL", None) or getattr(settings, "SMTP_USERNAME", None)
    username = getattr(settings, "SMTP_USERNAME", None)
    password_secret = getattr(settings, "SMTP_PASSWORD", None)
    password = password_secret.get_secret_value() if hasattr(password_secret, "get_secret_value") else password_secret
    port = int(getattr(settings, "SMTP_PORT", 587) or 587)
    use_tls = bool(getattr(settings, "SMTP_USE_TLS", True))

    if not host or not from_email:
        logger.info("SMTP not configured; OTP for %s is %s (dev fallback)", email, otp_code)
        return False

    msg = EmailMessage()
    msg["Subject"] = "Your CodeKnot verification code"
    msg["From"] = from_email
    msg["To"] = email
    msg.set_content(
        f"Your CodeKnot verification code is: {otp_code}\n\n"
        f"This code expires in {getattr(settings, 'OTP_EXPIRE_MINUTES', 10)} minutes. "
        "If you did not request this, you can ignore this email."
    )

    try:
        with smtplib.SMTP(host, port, timeout=20) as server:
            if use_tls:
                server.starttls()
            if username and password:
                server.login(username, password)
            server.send_message(msg)
        return True
    except Exception as exc:
        logger.warning("Failed to send OTP email to %s: %s", email, exc)
        logger.info("OTP fallback for %s is %s", email, otp_code)
        return False


def _get_active_otp(session, email: str) -> Optional[RegistrationOTP]:
    return (
        session.query(RegistrationOTP)
        .filter(RegistrationOTP.email == email, RegistrationOTP.consumed_at.is_(None))
        .order_by(RegistrationOTP.created_at.desc())
        .first()
    )


@router.post(
    "/register/request-otp",
    response_model=OTPRequestResponse,
    status_code=status.HTTP_200_OK,
    summary="Request email OTP for student registration",
)
def request_register_otp(
    payload: RegisterOTPRequest,
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> OTPRequestResponse:
    settings = get_settings()
    username = payload.username.strip()
    email = payload.email.strip().lower()
    full_name = payload.full_name.strip() if payload.full_name else None
    now = _utcnow()

    with db_manager.get_session() as session:
        # Check existing active student username/email
        existing_user = session.execute(
            select(Student).where(Student.external_student_id == username)
        ).scalars().first()
        if existing_user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Student username '{username}' is already registered.")

        existing_email = session.execute(
            select(Student).where(Student.email == email)
        ).scalars().first()
        if existing_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An account with this email already exists.")

        pending = _get_active_otp(session, email)

        # Rate limit/resend cooldown if recently sent
        cooldown = int(getattr(settings, "OTP_RESEND_COOLDOWN_SECONDS", 60))
        if pending and pending.last_sent_at:
            last_sent = pending.last_sent_at
            if last_sent.tzinfo is None:
                last_sent = last_sent.replace(tzinfo=timezone.utc)
            elapsed = (now - last_sent).total_seconds()
            if elapsed < cooldown:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Please wait {int(cooldown - elapsed)} seconds before requesting another code.",
                )

        otp_code = _generate_otp_code()
        expires_at = now + timedelta(minutes=int(getattr(settings, "OTP_EXPIRE_MINUTES", 10)))
        hashed_pw = hash_password(payload.password)

        if pending:
            pending.username = username
            pending.full_name = full_name
            pending.hashed_password = hashed_pw
            pending.otp_code = otp_code
            pending.attempts = 0
            pending.resend_count = (pending.resend_count or 0) + 1
            pending.expires_at = expires_at
            pending.last_sent_at = now
            pending.consumed_at = None
        else:
            pending = RegistrationOTP(
                email=email,
                username=username,
                full_name=full_name,
                hashed_password=hashed_pw,
                otp_code=otp_code,
                attempts=0,
                resend_count=0,
                expires_at=expires_at,
                last_sent_at=now,
            )
            session.add(pending)

        sent = _send_otp_email(email, otp_code)

        expose_dev = bool(getattr(settings, "EXPOSE_DEV_OTP", True)) and not sent
        return OTPRequestResponse(
            message="Verification code sent to your email." if sent else "Verification code generated. Check your email (or use the development code if shown).",
            email=email,
            expires_in_minutes=int(getattr(settings, "OTP_EXPIRE_MINUTES", 10)),
            resend_cooldown_seconds=cooldown,
            dev_otp_code=otp_code if expose_dev else None,
        )


@router.post(
    "/register/resend-otp",
    response_model=OTPRequestResponse,
    summary="Resend email OTP for pending registration",
)
def resend_register_otp(
    payload: ResendRegisterOTPRequest,
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> OTPRequestResponse:
    settings = get_settings()
    email = payload.email.strip().lower()
    now = _utcnow()

    with db_manager.get_session() as session:
        pending = _get_active_otp(session, email)
        if not pending:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No pending registration found for this email. Please start registration again.")

        cooldown = int(getattr(settings, "OTP_RESEND_COOLDOWN_SECONDS", 60))
        last_sent = pending.last_sent_at
        if last_sent and last_sent.tzinfo is None:
            last_sent = last_sent.replace(tzinfo=timezone.utc)
        if last_sent:
            elapsed = (now - last_sent).total_seconds()
            if elapsed < cooldown:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Please wait {int(cooldown - elapsed)} seconds before requesting another code.",
                )

        otp_code = _generate_otp_code()
        pending.otp_code = otp_code
        pending.attempts = 0
        pending.resend_count = (pending.resend_count or 0) + 1
        pending.expires_at = now + timedelta(minutes=int(getattr(settings, "OTP_EXPIRE_MINUTES", 10)))
        pending.last_sent_at = now

        sent = _send_otp_email(email, otp_code)
        expose_dev = bool(getattr(settings, "EXPOSE_DEV_OTP", True)) and not sent
        return OTPRequestResponse(
            message="A new verification code has been sent." if sent else "A new verification code has been generated.",
            email=email,
            expires_in_minutes=int(getattr(settings, "OTP_EXPIRE_MINUTES", 10)),
            resend_cooldown_seconds=cooldown,
            dev_otp_code=otp_code if expose_dev else None,
        )


@router.post(
    "/register/verify-otp",
    response_model=TokenResponse,
    summary="Verify email OTP and complete student registration",
)
def verify_register_otp(
    payload: VerifyRegisterOTPRequest,
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> TokenResponse:
    settings = get_settings()
    email = payload.email.strip().lower()
    otp_code = payload.otp_code.strip()
    now = _utcnow()

    with db_manager.get_session() as session:
        pending = _get_active_otp(session, email)
        if not pending:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No pending registration found. Please request a new verification code.")

        expires_at = pending.expires_at
        if expires_at and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if not expires_at or expires_at < now:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This verification code has expired. Please request a new one.")

        max_attempts = int(getattr(settings, "OTP_MAX_ATTEMPTS", 5))
        if (pending.attempts or 0) >= max_attempts:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many invalid attempts. Please request a new verification code.")

        if pending.otp_code != otp_code:
            pending.attempts = (pending.attempts or 0) + 1
            remaining = max_attempts - pending.attempts
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid verification code. {remaining} attempt(s) remaining.",
            )

        # Re-check uniqueness before creating account
        existing_user = session.execute(select(Student).where(Student.external_student_id == pending.username)).scalars().first()
        if existing_user:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Student username '{pending.username}' is already registered.")
        existing_email = session.execute(select(Student).where(Student.email == email)).scalars().first()
        if existing_email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An account with this email already exists.")

        new_student = Student(
            external_student_id=pending.username,
            email=email,
            full_name=pending.full_name,
            hashed_password=pending.hashed_password,
            is_active=True,
        )
        session.add(new_student)
        pending.consumed_at = now
        session.flush()

        access_token = create_access_token(data={"sub": pending.username})
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            student_id=pending.username,
            expires_in_minutes=getattr(settings, "JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 1440),
        )


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new student account (legacy direct registration)",
)
def register_student(
    payload: StudentRegisterRequest,
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> TokenResponse:
    """Legacy direct registration endpoint. Prefer OTP-based registration flow for email verification."""
    settings = get_settings()
    username = payload.username.strip()

    with db_manager.get_session() as session:
        existing = session.execute(
            select(Student).where(Student.external_student_id == username)
        ).scalars().first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Student username '{username}' is already registered.",
            )

        if payload.email:
            email = payload.email.strip().lower()
            existing_email = session.execute(select(Student).where(Student.email == email)).scalars().first()
            if existing_email:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An account with this email already exists.")
        else:
            email = None

        hashed_pw = hash_password(payload.password)
        new_student = Student(
            external_student_id=username,
            email=email,
            full_name=payload.full_name.strip() if payload.full_name else None,
            hashed_password=hashed_pw,
            is_active=True,
        )
        session.add(new_student)
        session.flush()

        access_token = create_access_token(data={"sub": new_student.external_student_id})
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            student_id=new_student.external_student_id,
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
            select(Student).where(
                (Student.external_student_id == username) | (Student.email == username.lower())
            )
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

        is_admin = bool(getattr(student, "is_admin", False))
        access_token = create_access_token(data={"sub": student.external_student_id, "is_admin": is_admin})
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            student_id=student.external_student_id,
            expires_in_minutes=getattr(settings, "JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 1440),
            is_admin=is_admin,
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
        is_admin=bool(getattr(current_student, "is_admin", False)),
        total_diagnoses_count=diagnoses_count,
        topics_tracked_count=topics_count,
        created_at=current_student.created_at.isoformat() if current_student.created_at else None,
    )
