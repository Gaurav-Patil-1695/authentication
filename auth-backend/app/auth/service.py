from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from jose import JWTError, jwt

from app.auth.schemas import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    MeResponse,
    RefreshResponse,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
)

# ---------------------------------------------------------------------------
# Configuration (resolved from environment at import time)
# ---------------------------------------------------------------------------

SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "change-me-in-production")
ALGORITHM: str = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
    os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "15")
)
REFRESH_TOKEN_EXPIRE_DAYS: int = int(
    os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7")
)
BCRYPT_ROUNDS: int = int(os.environ.get("BCRYPT_ROUNDS", "12"))
PASSWORD_RESET_EXPIRE_MINUTES: int = int(
    os.environ.get("PASSWORD_RESET_EXPIRE_MINUTES", "60")
)

# ---------------------------------------------------------------------------
# In-memory stores (replace with a real DB layer when the DB work item lands)
# ---------------------------------------------------------------------------
# Keyed by email (lower-cased)
_users: dict[str, dict] = {}
# Keyed by token_hash (SHA-256 hex)
_refresh_tokens: dict[str, dict] = {}
# Keyed by token_hash (SHA-256 hex)
_password_resets: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _make_access_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "email": email,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _make_refresh_token() -> tuple[str, str]:
    """Return (raw_token, token_hash)."""
    raw = secrets.token_urlsafe(48)
    return raw, _sha256(raw)


def _validate_password_policy(password: str) -> Optional[str]:
    """Return an error message string if the password violates policy, else None."""
    if len(password) < 8:
        return "Password must be at least 8 characters."
    if not any(c.isupper() for c in password):
        return "Password must contain at least one uppercase letter."
    if not any(c.islower() for c in password):
        return "Password must contain at least one lowercase letter."
    if not any(c.isdigit() for c in password):
        return "Password must contain at least one number."
    return None


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class AuthService:
    # ------------------------------------------------------------------
    # register
    # ------------------------------------------------------------------

    async def register(self, payload: RegisterRequest) -> RegisterResponse:
        email_key = payload.email.lower()

        # Duplicate email check
        if email_key in _users:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": {
                        "code": "EMAIL_TAKEN",
                        "message": "An account with this email already exists.",
                        "details": {},
                    }
                },
            )

        # Password policy
        policy_error = _validate_password_policy(payload.password)
        if policy_error:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": {
                        "code": "WEAK_PASSWORD",
                        "message": policy_error,
                        "details": {},
                    }
                },
            )

        # confirm_password match
        if payload.password != payload.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": {
                        "code": "PASSWORD_MISMATCH",
                        "message": "Passwords do not match.",
                        "details": {},
                    }
                },
            )

        user_id = secrets.token_urlsafe(16)
        now = datetime.now(timezone.utc)
        _users[email_key] = {
            "id": user_id,
            "full_name": payload.full_name,
            "email": email_key,
            "password_hash": _hash_password(payload.password),
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }

        access_token = _make_access_token(user_id, email_key)
        raw_refresh, refresh_hash = _make_refresh_token()
        _refresh_tokens[refresh_hash] = {
            "id": secrets.token_urlsafe(16),
            "user_id": user_id,
            "token_hash": refresh_hash,
            "expires_at": datetime.now(timezone.utc)
            + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
            "revoked_at": None,
            "remember_me": False,
            "created_at": now,
        }

        return RegisterResponse(
            accessToken=access_token,
            refreshToken=raw_refresh,
            user={
                "id": user_id,
                "fullName": payload.full_name,
                "email": email_key,
            },
        )

    # ------------------------------------------------------------------
    # login
    # ------------------------------------------------------------------

    async def login(self, payload: LoginRequest) -> LoginResponse:
        email_key = payload.email.lower()
        user = _users.get(email_key)

        # Enumeration-resistant: always the same error
        if user is None or not _verify_password(payload.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "code": "INVALID_CREDENTIALS",
                        "message": "Invalid email or password.",
                        "details": {},
                    }
                },
            )

        access_token = _make_access_token(user["id"], email_key)
        raw_refresh, refresh_hash = _make_refresh_token()
        now = datetime.now(timezone.utc)
        _refresh_tokens[refresh_hash] = {
            "id": secrets.token_urlsafe(16),
            "user_id": user["id"],
            "token_hash": refresh_hash,
            "expires_at": now
            + timedelta(
                days=REFRESH_TOKEN_EXPIRE_DAYS
                if getattr(payload, "rememberMe", False)
                else 1
            ),
            "revoked_at": None,
            "remember_me": getattr(payload, "rememberMe", False),
            "created_at": now,
        }

        return LoginResponse(
            accessToken=access_token,
            refreshToken=raw_refresh,
            user={
                "id": user["id"],
                "fullName": user["full_name"],
                "email": email_key,
            },
        )

    # ------------------------------------------------------------------
    # forgotPassword
    # ------------------------------------------------------------------

    async def forgotPassword(
        self, payload: ForgotPasswordRequest
    ) -> ForgotPasswordResponse:
        # Enumeration-resistant: always 202 regardless of email existence
        email_key = payload.email.lower()
        user = _users.get(email_key)
        if user is not None:
            raw_token = secrets.token_urlsafe(32)
            token_hash = _sha256(raw_token)
            now = datetime.now(timezone.utc)
            _password_resets[token_hash] = {
                "id": secrets.token_urlsafe(16),
                "user_id": user["id"],
                "token_hash": token_hash,
                "expires_at": now
                + timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES),
                "used_at": None,
                "created_at": now,
            }
            # In production: dispatch an email with `raw_token` here.

        return ForgotPasswordResponse(
            message="If that email is registered, you will receive a password reset link shortly."
        )

    # ------------------------------------------------------------------
    # resetPassword
    # ------------------------------------------------------------------

    async def resetPassword(
        self, payload: ResetPasswordRequest
    ) -> ResetPasswordResponse:
        token_hash = _sha256(payload.token)
        reset_record = _password_resets.get(token_hash)

        if reset_record is None or reset_record["used_at"] is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "INVALID_RESET_TOKEN",
                        "message": "This password reset link is invalid or has already been used.",
                        "details": {},
                    }
                },
            )

        if datetime.now(timezone.utc) > reset_record["expires_at"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "EXPIRED_RESET_TOKEN",
                        "message": "This password reset link has expired.",
                        "details": {},
                    }
                },
            )

        policy_error = _validate_password_policy(payload.password)
        if policy_error:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": {
                        "code": "WEAK_PASSWORD",
                        "message": policy_error,
                        "details": {},
                    }
                },
            )

        if payload.password != payload.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": {
                        "code": "PASSWORD_MISMATCH",
                        "message": "Passwords do not match.",
                        "details": {},
                    }
                },
            )

        # Find user and update password
        user_id = reset_record["user_id"]
        for user in _users.values():
            if user["id"] == user_id:
                user["password_hash"] = _hash_password(payload.password)
                user["updated_at"] = datetime.now(timezone.utc)
                break

        # Mark token as used
        reset_record["used_at"] = datetime.now(timezone.utc)

        return ResetPasswordResponse(message="Your password has been reset successfully.")

    # ------------------------------------------------------------------
    # me
    # ------------------------------------------------------------------

    async def me(self) -> MeResponse:
        # Placeholder: real implementation would extract user from JWT bearer token.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "UNAUTHENTICATED",
                    "message": "Authentication required.",
                    "details": {},
                }
            },
        )

    # ------------------------------------------------------------------
    # logout
    # ------------------------------------------------------------------

    async def logout(self) -> LogoutResponse:
        # Placeholder: real implementation would revoke the refresh token from the cookie/header.
        return LogoutResponse(message="You have been logged out successfully.")

    # ------------------------------------------------------------------
    # refresh
    # ------------------------------------------------------------------

    async def refresh(self) -> RefreshResponse:
        # Placeholder: real implementation would validate the refresh token and rotate it.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "INVALID_REFRESH_TOKEN",
                    "message": "Refresh token is invalid or has expired.",
                    "details": {},
                }
            },
        )


# ---------------------------------------------------------------------------
# Dependency
# ---------------------------------------------------------------------------


def get_auth_service() -> AuthService:
    return AuthService()
