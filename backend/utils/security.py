"""Password hashing and JWT helpers for the single-admin auth model.

This app has one admin account configured via env vars (ADMIN_EMAIL /
ADMIN_PASSWORD) -- there is no users table. That's a deliberate scope
simplification for an internal ops tool, not a multi-tenant auth system.
"""
import hashlib
import hmac
import os
from datetime import datetime, timedelta
from typing import Optional

import jwt

from backend.config import settings

_PBKDF2_ITERATIONS = 260_000


def hash_password(password: str, salt: Optional[bytes] = None) -> str:
    """Return "salt_hex$hash_hex" using PBKDF2-HMAC-SHA256."""
    salt = salt or os.urandom(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, _PBKDF2_ITERATIONS)
    return f"{salt.hex()}${derived.hex()}"


def verify_password(password: str, stored_plain_or_hash: str) -> bool:
    """Verify a password against either a plaintext value (dev/env default)
    or a salted PBKDF2 hash produced by hash_password()."""
    if "$" in stored_plain_or_hash:
        salt_hex, hash_hex = stored_plain_or_hash.split("$", 1)
        candidate = hash_password(password, bytes.fromhex(salt_hex))
        return hmac.compare_digest(candidate, stored_plain_or_hash)
    return hmac.compare_digest(password, stored_plain_or_hash)


def create_access_token(subject: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Raises jwt.PyJWTError on invalid/expired tokens."""
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
