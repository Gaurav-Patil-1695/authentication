from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import HTTPException, Request, Response, status

from app.auth.schemas import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    LoginResponse,
    MeResponse,
    RefreshResponse,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
)

# ---------------------------------------------------------------------------
# Configuration (env-driven with sane defaults)
# ---------------------------------------------------------------------------
JWT_SECRET: str = os.environ.get("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM: str = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
    os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "15")
)
REFRESH_TOKEN_EXPIRE_DAYS: int = int(
    os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7")
)
REFRESH_TOKEN_REMEMBER_DAYS: int = int(
    os.environ.get("REFRESH_TOKEN_REMEMBER_DAYS", "30")
)
BCRYPT_ROUNDS: int = int(os.environ.get("BCRYPT_ROUNDS", "12"))
REFRESH_COOKIE_NAME: str = "refresh_token"
COOKIE_SAMESITE: str = os.environ.get("COOKIE_SAMESITE", "lax")
COOKIE_SECURE: bool = os.environ.get("COOKIE_SECURE", "true").lower() == "true"

# ---------------------------------------------------------------------------
# In-memory stores (replace with real DB repository in production)
# ---------------------------------------------------------------------------
# users: dict keyed by email
_users: dict[str, dict] = {}
# refresh_tokens: list of token records
_refresh_tokens: list[dict] = []
# password_resets: list of reset records
_password_resets: list[dict] = []


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _make_access_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _make_refresh_token() -> str:
    return secrets.token_urlsafe(64)


def _decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token.",
        )


def _set_refresh_cookie(
    response: Response,
    token: str,
    remember_me: bool = False,
) -> None:
    max_age = (
        REFRESH_TOKEN_REMEMBER_DAYS * 86400
        if remember_me
        else REFRESH_TOKEN_EXPIRE_DAYS * 86400
    )
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=max_age,
        path="/auth/refresh",
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/auth/refresh",
    )


def _get_user_by_email(email: str) -> Optional[dict]:
    return _users.get(email.lower())


def _get_user_by_id(user_id: str) -> Optional[dict]:
    for user in _users.values():
        if user["id"] == user_id:
            return user
    return None


def _find_valid_refresh_token(token_hash: str) -> Optional[dict]:
    now = datetime.now(timezone.utc)
    for record in _refresh_tokens:
        if (
            record["token_hash"] == token_hash
            and record["revoked_at"] is None
            and record["expires_at"] > now
        ):
            return record
    return None


def _revoke_refresh_token(token_hash: str) -> None:
    now = datetime.now(timezone.utc)
    for record in _refresh_tokens:
        if record["token_hash"] == token_hash:
            record["revoked_at"] = now


def _revoke_all_user_refresh_tokens(user_id: str) -> None:
    now = datetime.now(timezone.utc)
    for record in _refresh_tokens:
        if record["user_id"] == user_id and record["revoked_at"] is None:
            record["revoked_at"] = now


def _store_refresh_token(
    user_id: str,
    token_hash: str,
    remember_me: bool = False,
) -> None:
    now = datetime.now(timezone.utc)
    expire_days = REFRESH_TOKEN_REMEMBER_DAYS if remember_me else REFRESH_TOKEN_EXPIRE_DAYS
    _refresh_tokens.append(
        {
            "id": secrets.token_hex(16),
            "user_id": user_id,
            "token_hash": token_hash,
            "expires_at": now + timedelta(days=expire_days),
            "revoked_at": None,
            "remember_me": remember_me,
            "created_at": now,
        }
    )


# ---------------------------------------------------------------------------
# Password policy (mirrors validation-rules.json)
# ---------------------------------------------------------------------------

def _validate_password_policy(password: str) -> None:
    errors: list[str] = []
    if len(password) < 8:
        errors.append("Password must be at least 8 characters.")
    if not any(c.isupper() for c in password):
        errors.append("Password must contain at least one uppercase letter.")
    if not any(c.islower() for c in password):
        errors.append("Password must contain at least one lowercase letter.")
    if not any(c.isdigit() for c in password):
        errors.append("Password must contain at least one number.")
    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": errors[0],
                    "details": errors,
                }
            },
        )


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class AuthService:
    # ------------------------------------------------------------------
    # register
    # ------------------------------------------------------------------
    async def register(self, body: RegisterRequest) -> RegisterResponse:
        if body.password != body.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "Passwords do not match.",
                        "details": ["Passwords do not match."],
                    }
                },
            )

        _validate_password_policy(body.password)

        email_lower = body.email.lower()
        if _get_user_by_email(email_lower) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": {
                        "code": "EMAIL_TAKEN",
                        "message": "An account with this email already exists.",
                        "details": [],
                    }
                },
            )

        now = datetime.now(timezone.utc)
        user_id = secrets.token_hex(16)
        user: dict = {
            "id": user_id,
            "full_name": body.full_name,
            "email": email_lower,
            "password_hash": _hash_password(body.password),
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        _users[email_lower] = user

        return RegisterResponse(
            id=user_id,
            fullName=body.full_name,
            email=email_lower,
        )

    # ------------------------------------------------------------------
    # login
    # ------------------------------------------------------------------
    async def login(self, body: LoginRequest, response: Response) -> LoginResponse:
        email_lower = body.email.lower()
        user = _get_user_by_email(email_lower)

        # Enumeration-resistant: same error for unknown email and wrong password
        invalid_exc = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "INVALID_CREDENTIALS",
                    "message": "Invalid email or password.",
                    "details": [],
                }
            },
        )

        if user is None or not _verify_password(body.password, user["password_hash"]):
            raise invalid_exc

        if not user["is_active"]:
            raise invalid_exc

        access_token = _make_access_token(user["id"], user["email"])
        raw_refresh = _make_refresh_token()
        remember_me = body.remember_me if body.remember_me is not None else False
        _store_refresh_token(user["id"], _sha256(raw_refresh), remember_me)
        _set_refresh_cookie(response, raw_refresh, remember_me)

        return LoginResponse(
            accessToken=access_token,
            tokenType="bearer",
        )

    # ------------------------------------------------------------------
    # refresh  (FR-08)
    # ------------------------------------------------------------------
    async def refresh(self, request: Request, response: Response) -> RefreshResponse:
        raw_token: Optional[str] = request.cookies.get(REFRESH_COOKIE_NAME)

        if not raw_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "code": "MISSING_REFRESH_TOKEN",
                        "message": "Refresh token is missing.",
                        "details": [],
                    }
                },
            )

        token_hash = _sha256(raw_token)
        record = _find_valid_refresh_token(token_hash)

        if record is None:
            _clear_refresh_cookie(response)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "code": "INVALID_REFRESH_TOKEN",
                        "message": "Refresh token is invalid or has expired.",
                        "details": [],
                    }
                },
            )

        # Rotate: revoke old token
        _revoke_refresh_token(token_hash)

        user = _get_user_by_id(record["user_id"])
        if user is None or not user["is_active"]:
            _clear_refresh_cookie(response)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "code": "USER_NOT_FOUND",
                        "message": "User account not found or inactive.",
                        "details": [],
                    }
                },
            )

        # Issue new tokens
        new_access_token = _make_access_token(user["id"], user["email"])
        new_raw_refresh = _make_refresh_token()
        remember_me: bool = record.get("remember_me", False)
        _store_refresh_token(user["id"], _sha256(new_raw_refresh), remember_me)
        _set_refresh_cookie(response, new_raw_refresh, remember_me)

        return RefreshResponse(
            accessToken=new_access_token,
            tokenType="bearer",
        )

    # ------------------------------------------------------------------
    # forgotPassword
    # ------------------------------------------------------------------
    async def forgotPassword(
        self, body: ForgotPasswordRequest
    ) -> ForgotPasswordResponse:
        # Enumeration-resistant: always return the same message
        email_lower = body.email.lower()
        user = _get_user_by_email(email_lower)

        if user is not None and user["is_active"]:
            now = datetime.now(timezone.utc)
            raw_token = secrets.token_urlsafe(32)
            token_hash = _sha256(raw_token)
            _password_resets.append(
                {
                    "id": secrets.token_hex(16),
                    "user_id": user["id"],
                    "token_hash": token_hash,
                    "expires_at": now + timedelta(hours=1),
                    "used_at": None,
                    "created_at": now,
                }
            )
            # In production: send email with reset link containing raw_token

        return ForgotPasswordResponse(
            message="If an account with that email exists, a password reset link has been sent."
        )

    # ------------------------------------------------------------------
    # resetPassword
    # ------------------------------------------------------------------
    async def resetPassword(
        self, body: ResetPasswordRequest
    ) -> ResetPasswordResponse:
        if body.password != body.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "Passwords do not match.",
                        "details": ["Passwords do not match."],
                    }
                },
            )

        _validate_password_policy(body.password)

        token_hash = _sha256(body.token)
        now = datetime.now(timezone.utc)
        record: Optional[dict] = None
        for r in _password_resets:
            if (
                r["token_hash"] == token_hash
                and r["used_at"] is None
                and r["expires_at"] > now
            ):
                record = r
                break

        if record is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "INVALID_RESET_TOKEN",
                        "message": "Password reset token is invalid or has expired.",
                        "details": [],
                    }
                },
            )

        user = _get_user_by_id(record["user_id"])
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "USER_NOT_FOUND",
                        "message": "User account not found.",
                        "details": [],
                    }
                },
            )

        # Update password and mark token used
        user["password_hash"] = _hash_password(body.password)
        user["updated_at"] = now
        record["used_at"] = now

        # Revoke all refresh tokens for this user for security
        _revoke_all_user_refresh_tokens(user["id"])

        return ResetPasswordResponse(
            message="Your password has been reset successfully."
        )

    # ------------------------------------------------------------------
    # me
    # ------------------------------------------------------------------
    async def me(self, token: str) -> MeResponse:
        payload = _decode_access_token(token)
        user_id: str = payload.get("sub", "")
        user = _get_user_by_id(user_id)

        if user is None or not user["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "code": "USER_NOT_FOUND",
                        "message": "User account not found or inactive.",
                        "details": [],
                    }
                },
            )

        return MeResponse(
            id=user["id"],
            fullName=user["full_name"],
            email=user["email"],
            isActive=user["is_active"],
            createdAt=user["created_at"],
        )

    # ------------------------------------------------------------------
    # logout
    # ------------------------------------------------------------------
    async def logout(
        self,
        request: Request,
        response: Response,
        token: Optional[str],
    ) -> None:
        raw_refresh: Optional[str] = request.cookies.get(REFRESH_COOKIE_NAME)
        if raw_refresh:
            token_hash = _sha256(raw_refresh)
            _revoke_refresh_token(token_hash)

        _clear_refresh_cookie(response)
