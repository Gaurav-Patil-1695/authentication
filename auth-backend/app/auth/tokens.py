from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from jose import jwt

from app.config.settings import settings

# ---------------------------------------------------------------------------
# TTL constants
# ---------------------------------------------------------------------------

ACCESS_TOKEN_TTL_MINUTES: int = 15

# Standard refresh token TTL (no rememberMe)
REFRESH_TOKEN_TTL_HOURS: int = 24

# Extended refresh token TTL (rememberMe=True)
REFRESH_TOKEN_TTL_EXTENDED_DAYS: int = 30

# Password reset token TTL
PASSWORD_RESET_TOKEN_TTL_MINUTES: int = 60

# ---------------------------------------------------------------------------
# Hashing helpers
# ---------------------------------------------------------------------------


def hash_token(raw_token: str) -> str:
    """Return the SHA-256 hex digest of a raw token string."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def generate_opaque_token() -> str:
    """Return a cryptographically secure URL-safe opaque token
    (32 bytes -> 64 hex chars)."""
    return secrets.token_hex(32)


# ---------------------------------------------------------------------------
# Access token (JWT)
# ---------------------------------------------------------------------------


def create_access_token(
    user_id: int,
    email: str,
    *,
    ttl_minutes: int = ACCESS_TOKEN_TTL_MINUTES,
) -> str:
    """Create a signed JWT access token.

    Args:
        user_id: The authenticated user's primary key.
        email: The authenticated user's email address.
        ttl_minutes: Time-to-live in minutes (defaults to ACCESS_TOKEN_TTL_MINUTES).

    Returns:
        A compact JWT string.
    """
    now = datetime.now(tz=timezone.utc)
    expire = now + timedelta(minutes=ttl_minutes)
    payload: dict = {
        "sub": str(user_id),
        "email": email,
        "iat": now,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and verify a JWT access token.

    Raises:
        jose.JWTError: if the token is invalid, expired, or the signature
        does not match.

    Returns:
        The decoded payload dictionary.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


# ---------------------------------------------------------------------------
# Refresh token
# ---------------------------------------------------------------------------


def create_refresh_token(
    *,
    remember_me: bool = False,
) -> tuple[str, str, datetime]:
    """Generate a new opaque refresh token.

    Args:
        remember_me: When True, the token lifetime is extended to
            REFRESH_TOKEN_TTL_EXTENDED_DAYS; otherwise REFRESH_TOKEN_TTL_HOURS.

    Returns:
        A 3-tuple of (raw_token, token_hash, expires_at).
        - raw_token: the value to hand to the client (store in httpOnly cookie).
        - token_hash: the SHA-256 digest to persist in the database.
        - expires_at: timezone-aware UTC datetime when the token expires.
    """
    raw = generate_opaque_token()
    token_hash = hash_token(raw)

    now = datetime.now(tz=timezone.utc)
    if remember_me:
        expires_at = now + timedelta(days=REFRESH_TOKEN_TTL_EXTENDED_DAYS)
    else:
        expires_at = now + timedelta(hours=REFRESH_TOKEN_TTL_HOURS)

    return raw, token_hash, expires_at


def rotate_refresh_token(
    *,
    remember_me: bool = False,
) -> tuple[str, str, datetime]:
    """Generate a replacement refresh token during rotation.

    Rotation issues a brand-new opaque token.  The caller is responsible for
    updating the database record (via repository.update_refresh_token_hash) and
    revoking the old one if needed.

    Args:
        remember_me: Passed through to create_refresh_token to preserve the
            extended-TTL behaviour from the original login.

    Returns:
        Same 3-tuple as create_refresh_token: (raw_token, token_hash, expires_at).
    """
    return create_refresh_token(remember_me=remember_me)


def is_refresh_token_valid(token_row: dict) -> bool:
    """Return True when a refresh token database row is still usable.

    A token is considered valid when:
    - revoked_at is NULL (not explicitly revoked), and
    - expires_at is in the future.

    Args:
        token_row: A dict-like row from the refresh_tokens table.

    Returns:
        True if valid, False otherwise.
    """
    if token_row.get("revoked_at") is not None:
        return False

    expires_at: datetime | None = token_row.get("expires_at")
    if expires_at is None:
        return False

    # Normalise to UTC-aware for comparison
    now = datetime.now(tz=timezone.utc)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    return expires_at > now


# ---------------------------------------------------------------------------
# Password reset token
# ---------------------------------------------------------------------------


def create_reset_token(
    *,
    ttl_minutes: int = PASSWORD_RESET_TOKEN_TTL_MINUTES,
) -> tuple[str, str, datetime]:
    """Generate a new opaque password-reset token.

    Args:
        ttl_minutes: Time-to-live in minutes (defaults to
            PASSWORD_RESET_TOKEN_TTL_MINUTES).

    Returns:
        A 3-tuple of (raw_token, token_hash, expires_at).
        - raw_token: the value embedded in the reset email link.
        - token_hash: the SHA-256 digest to persist in the database.
        - expires_at: timezone-aware UTC datetime when the token expires.
    """
    raw = generate_opaque_token()
    token_hash = hash_token(raw)
    expires_at = datetime.now(tz=timezone.utc) + timedelta(minutes=ttl_minutes)
    return raw, token_hash, expires_at


def is_reset_token_valid(reset_row: dict) -> bool:
    """Return True when a password-reset database row is still usable.

    A reset token is considered valid when:
    - used_at is NULL (not yet consumed), and
    - expires_at is in the future.

    Args:
        reset_row: A dict-like row from the password_resets table.

    Returns:
        True if valid, False otherwise.
    """
    if reset_row.get("used_at") is not None:
        return False

    expires_at: datetime | None = reset_row.get("expires_at")
    if expires_at is None:
        return False

    now = datetime.now(tz=timezone.utc)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    return expires_at > now
