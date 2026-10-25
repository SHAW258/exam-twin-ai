"""ExamTwin Phase 9 Web API Package."""

from src.api.app import app, create_app
from src.api.auth import (
    create_access_token,
    decode_access_token,
    get_current_student,
    hash_password,
    verify_password,
)

__all__ = [
    "app",
    "create_app",
    "get_current_student",
    "create_access_token",
    "decode_access_token",
    "hash_password",
    "verify_password",
]
