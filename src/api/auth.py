"""Authentication and security module for ExamTwin Phase 9 FastAPI layer.

Implements:
1. OWASP-recommended scrypt password hashing with cryptographically random salts.
2. Constant-time password verification via hmac.compare_digest.
3. RFC 7519 compliant HS256 JWT access token generation and validation.
4. FastAPI dependency injection for extracting the authenticated current student principal.
"""

import base64
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
import logging
import secrets
from typing import Any, Dict, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.config.settings import get_settings
from src.database.connection import DatabaseManager, get_db_manager
from src.learner_state.models import Student

logger = logging.getLogger(__name__)

# Reusable HTTP Bearer security scheme
bearer_scheme = HTTPBearer(auto_error=False)


# -----------------------------------------------------------------------------
# Password Hashing & Verification (scrypt)
# -----------------------------------------------------------------------------

def hash_password(plain_password: str) -> str:
    """Hash a plaintext password using salted scrypt.

    Format: scrypt$n$r$p$<salt_hex>$<hash_hex>
    """
    if not plain_password:
        raise ValueError("Password cannot be empty.")
    salt = secrets.token_bytes(16)
    n, r, p = 16384, 8, 1
    key = hashlib.scrypt(
        plain_password.encode("utf-8"),
        salt=salt,
        n=n,
        r=r,
        p=p,
        maxmem=0x2000000,
    )
    return f"scrypt${n}${r}${p}${salt.hex()}${key.hex()}"


def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    """Verify plaintext password against stored salted scrypt hash using constant-time comparison."""
    if not plain_password or not hashed_password:
        return False
    try:
        parts = hashed_password.split("$")
        if len(parts) != 6 or parts[0] != "scrypt":
            return False
        n = int(parts[1])
        r = int(parts[2])
        p = int(parts[3])
        salt = bytes.fromhex(parts[4])
        expected_key = bytes.fromhex(parts[5])

        derived_key = hashlib.scrypt(
            plain_password.encode("utf-8"),
            salt=salt,
            n=n,
            r=r,
            p=p,
            maxmem=0x2000000,
        )
        return hmac.compare_digest(derived_key, expected_key)
    except Exception as exc:
        logger.warning("Error verifying password hash: %s", exc)
        return False


# -----------------------------------------------------------------------------
# Standard RFC 7519 HS256 JWT Token Generation & Verification
# -----------------------------------------------------------------------------

def _b64url_encode(data: bytes) -> str:
    """Encode bytes to unpadded base64url string."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    """Decode unpadded base64url string to bytes."""
    rem = len(data) % 4
    if rem > 0:
        data += "=" * (4 - rem)
    return base64.urlsafe_b64decode(data.encode("ascii"))


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a signed HS256 JSON Web Token (JWT).

    Args:
        data: Payload claims (must include 'sub' for subject/student ID).
        expires_delta: Optional token expiration duration.

    Returns:
        Encoded and signed JWT string (header.payload.signature).
    """
    settings = get_settings()
    to_encode = data.copy()

    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=getattr(settings, "JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

    to_encode.update({
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    })

    header = {"alg": "HS256", "typ": "JWT"}
    header_json = json.dumps(header, separators=(",", ":")).encode("utf-8")
    payload_json = json.dumps(to_encode, separators=(",", ":")).encode("utf-8")

    header_b64 = _b64url_encode(header_json)
    payload_b64 = _b64url_encode(payload_json)

    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    secret_bytes = settings.JWT_SECRET_KEY.encode("utf-8")
    signature = hmac.new(secret_bytes, signing_input, hashlib.sha256).digest()
    sig_b64 = _b64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_access_token(token: str) -> Dict[str, Any]:
    """Validate signature and expiration of an HS256 JWT, returning decoded claims.

    Raises:
        HTTPException: If token is malformed, has invalid signature, or is expired.
    """
    settings = get_settings()
    try:
        parts = token.strip().split(".")
        if len(parts) != 3:
            raise ValueError("Token must have exactly three segments.")

        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        secret_bytes = settings.JWT_SECRET_KEY.encode("utf-8")
        expected_sig = hmac.new(secret_bytes, signing_input, hashlib.sha256).digest()
        actual_sig = _b64url_decode(sig_b64)

        if not hmac.compare_digest(actual_sig, expected_sig):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token signature.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        payload_bytes = _b64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode("utf-8"))

        # Verify expiration
        exp = payload.get("exp")
        if exp is not None:
            now_ts = int(datetime.now(timezone.utc).timestamp())
            if now_ts >= exp:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has expired.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

        return payload
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {exc}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


# -----------------------------------------------------------------------------
# Current Student Principal Dependency
# -----------------------------------------------------------------------------

def get_current_student(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db_manager: DatabaseManager = Depends(get_db_manager),
) -> Student:
    """FastAPI security dependency extracting the verified authenticated student principal.

    Guarantees:
    - Never trusts a client-supplied student ID in request body or path.
    - Identity is derived strictly from the cryptographically verified JWT 'sub' claim.
    """
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials required. Please provide a Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    external_student_id = payload.get("sub")

    if not external_student_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing valid subject (student identifier) claim.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    mgr = db_manager or get_db_manager()
    with mgr.get_session() as session:
        stmt = select(Student).where(Student.external_student_id == external_student_id)
        student = session.execute(stmt).scalars().first()

        if student is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Student associated with this token does not exist.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not student.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Student account is deactivated.",
            )

        # Detach/return or copy attributes to avoid session lifecycle issues
        return student
