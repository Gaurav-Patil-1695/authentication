from __future__ import annotations

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import HTTPException, Request, Response, status
from jose import JWTError, jwt

from app.auth.schemas import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    LogoutResponse,
    MeResponse,
    RefreshRequest,
    RefreshResponse,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
)
from app.db import get_connection

# ---------------------------------------------------------------------------
# Environment / config
# ---------------------------------------------------------------------------

SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "changeme-secret")
ALGORITHM: str = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
REFRESH_TOKEN_REMEMBER_DAYS: int = int(os.environ.get("REFRESH_TOKEN_REMEMBER_DAYS", "30"))
BCRYPT_ROUNDS: int = int(os.environ.get("BCRYPT_ROUNDS", "12"))
RESET_TOKEN_EXPIRE_MINUTES: int = 30
REFRESH_COOKIE_NAME: str = "refresh_token"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _create_access_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "email": email, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _set_refresh_cookie(response: Response, token: str, remember: bool) -> None:
    max_age = (
        REFRESH_TOKEN_REMEMBER_DAYS * 86400 if remember else REFRESH_TOKEN_EXPIRE_DAYS * 86400
    )
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=True,
        max_age=max_age,
    )


def _validate_password_policy(password: str) -> Optional[str]:
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
# register
# ---------------------------------------------------------------------------

async def register(request: RegisterRequest) -> RegisterResponse:
    if request.password != request.confirm_password:
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

    policy_error = _validate_password_policy(request.password)
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

    async with get_connection() as conn:
        existing = await conn.fetchrow(
            "SELECT id FROM users WHERE email = $1", request.email
        )
        if existing:
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

        password_hash = _hash_password(request.password)
        row = await conn.fetchrow(
            """
            INSERT INTO users (full_name, email, password_hash, is_active)
            VALUES ($1, $2, $3, TRUE)
            RETURNING id, full_name, email, created_at
            """,
            request.full_name,
            request.email,
            password_hash,
        )

    return RegisterResponse(
        id=str(row["id"]),
        full_name=row["full_name"],
        email=row["email"],
        created_at=row["created_at"].isoformat(),
    )


# ---------------------------------------------------------------------------
# login
# ---------------------------------------------------------------------------

async def login(request: LoginRequest, response: Response) -> LoginResponse:
    async with get_connection() as conn:
        row = await conn.fetchrow(
            "SELECT id, full_name, email, password_hash, is_active FROM users WHERE email = $1",
            request.email,
        )

    invalid_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={
            "error": {
                "code": "INVALID_CREDENTIALS",
                "message": "Invalid email or password.",
                "details": {},
            }
        },
    )

    if not row:
        raise invalid_exc
    if not _verify_password(request.password, row["password_hash"]):
        raise invalid_exc
    if not row["is_active"]:
        raise invalid_exc

    user_id = str(row["id"])
    access_token = _create_access_token(user_id, row["email"])
    refresh_raw = secrets.token_hex(32)
    refresh_hash = _sha256(refresh_raw)
    remember = request.remember_me or False

    expire_days = REFRESH_TOKEN_REMEMBER_DAYS if remember else REFRESH_TOKEN_EXPIRE_DAYS
    expires_at = datetime.now(timezone.utc) + timedelta(days=expire_days)

    async with get_connection() as conn:
        await conn.execute(
            """
            INSERT INTO refresh_tokens (user_id, token_hash, expires_at, remember_me)
            VALUES ($1, $2, $3, $4)
            """,
            row["id"],
            refresh_hash,
            expires_at,
            remember,
        )

    _set_refresh_cookie(response, refresh_raw, remember)

    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user={
            "id": user_id,
            "full_name": row["full_name"],
            "email": row["email"],
        },
    )


# ---------------------------------------------------------------------------
# me
# ---------------------------------------------------------------------------

async def me(http_request: Request) -> MeResponse:
    auth_header = http_request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "MISSING_TOKEN",
                    "message": "Authentication required.",
                    "details": {},
                }
            },
        )
    token = auth_header[len("Bearer "):]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload["sub"]
        email: str = payload["email"]
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "INVALID_TOKEN",
                    "message": "Invalid or expired token.",
                    "details": {},
                }
            },
        )

    async with get_connection() as conn:
        row = await conn.fetchrow(
            "SELECT id, full_name, email, is_active, created_at FROM users WHERE id = $1",
            user_id,
        )

    if not row or not row["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "USER_NOT_FOUND",
                    "message": "User not found.",
                    "details": {},
                }
            },
        )

    return MeResponse(
        id=str(row["id"]),
        full_name=row["full_name"],
        email=row["email"],
        created_at=row["created_at"].isoformat(),
    )


# ---------------------------------------------------------------------------
# logout
# ---------------------------------------------------------------------------

async def logout(request: LogoutRequest, response: Response) -> LogoutResponse:
    refresh_raw = request.refresh_token
    if refresh_raw:
        refresh_hash = _sha256(refresh_raw)
        async with get_connection() as conn:
            await conn.execute(
                """
                UPDATE refresh_tokens
                SET revoked_at = NOW()
                WHERE token_hash = $1 AND revoked_at IS NULL
                """,
                refresh_hash,
            )

    response.delete_cookie(key=REFRESH_COOKIE_NAME)
    return LogoutResponse(message="Logged out successfully.")


# ---------------------------------------------------------------------------
# refresh
# ---------------------------------------------------------------------------

async def refresh(request: RefreshRequest, response: Response) -> RefreshResponse:
    refresh_raw = request.refresh_token
    if not refresh_raw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": {
                    "code": "MISSING_TOKEN",
                    "message": "Refresh token is required.",
                    "details": {},
                }
            },
        )

    refresh_hash = _sha256(refresh_raw)
    now = datetime.now(timezone.utc)

    async with get_connection() as conn:
        row = await conn.fetchrow(
            """
            SELECT rt.id, rt.user_id, rt.expires_at, rt.remember_me,
                   u.email, u.full_name, u.is_active
            FROM refresh_tokens rt
            JOIN users u ON u.id = rt.user_id
            WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL
            """,
            refresh_hash,
        )

        if not row or row["expires_at"] < now or not row["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "code": "INVALID_TOKEN",
                        "message": "Invalid or expired refresh token.",
                        "details": {},
                    }
                },
            )

        # Revoke old token
        await conn.execute(
            "UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1",
            row["id"],
        )

        # Issue new refresh token
        new_refresh_raw = secrets.token_hex(32)
        new_refresh_hash = _sha256(new_refresh_raw)
        remember = row["remember_me"]
        expire_days = REFRESH_TOKEN_REMEMBER_DAYS if remember else REFRESH_TOKEN_EXPIRE_DAYS
        new_expires_at = now + timedelta(days=expire_days)

        await conn.execute(
            """
            INSERT INTO refresh_tokens (user_id, token_hash, expires_at, remember_me)
            VALUES ($1, $2, $3, $4)
            """,
            row["user_id"],
            new_refresh_hash,
            new_expires_at,
            remember,
        )

    user_id = str(row["user_id"])
    access_token = _create_access_token(user_id, row["email"])
    _set_refresh_cookie(response, new_refresh_raw, remember)

    return RefreshResponse(
        access_token=access_token,
        token_type="bearer",
    )


# ---------------------------------------------------------------------------
# forgotPassword
# ---------------------------------------------------------------------------

async def forgotPassword(request: ForgotPasswordRequest) -> ForgotPasswordResponse:
    # Enumeration resistance: always return the same response
    generic_response = ForgotPasswordResponse(
        message="If an account with that email exists, a password reset link has been sent."
    )

    async with get_connection() as conn:
        row = await conn.fetchrow(
            "SELECT id FROM users WHERE email = $1 AND is_active = TRUE",
            request.email,
        )
        if not row:
            return generic_response

        # Invalidate any existing unused tokens for this user
        await conn.execute(
            """
            UPDATE password_resets
            SET used_at = NOW()
            WHERE user_id = $1 AND used_at IS NULL
            """,
            row["id"],
        )

        reset_raw = secrets.token_hex(32)
        reset_hash = _sha256(reset_raw)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)

        await conn.execute(
            """
            INSERT INTO password_resets (user_id, token_hash, expires_at)
            VALUES ($1, $2, $3)
            """,
            row["id"],
            reset_hash,
            expires_at,
        )

    # In a real system the reset_raw token would be emailed here.
    # Per design, we do not expose it in the response.
    return generic_response


# ---------------------------------------------------------------------------
# resetPassword
# ---------------------------------------------------------------------------

async def resetPassword(request: ResetPasswordRequest) -> ResetPasswordResponse:
    if request.password != request.confirm_password:
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

    policy_error = _validate_password_policy(request.password)
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

    token_hash = _sha256(request.token)
    now = datetime.now(timezone.utc)

    async with get_connection() as conn:
        reset_row = await conn.fetchrow(
            """
            SELECT pr.id, pr.user_id, pr.expires_at
            FROM password_resets pr
            WHERE pr.token_hash = $1
              AND pr.used_at IS NULL
              AND pr.expires_at > $2
            """,
            token_hash,
            now,
        )

        if not reset_row:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "INVALID_OR_EXPIRED_TOKEN",
                        "message": "This password reset link is invalid or has expired.",
                        "details": {},
                    }
                },
            )

        new_hash = _hash_password(request.password)

        await conn.execute(
            "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
            new_hash,
            reset_row["user_id"],
        )

        await conn.execute(
            "UPDATE password_resets SET used_at = NOW() WHERE id = $1",
            reset_row["id"],
        )

        # Revoke all refresh tokens for the user for security
        await conn.execute(
            """
            UPDATE refresh_tokens
            SET revoked_at = NOW()
            WHERE user_id = $1 AND revoked_at IS NULL
            """,
            reset_row["user_id"],
        )

    return ResetPasswordResponse(message="Your password has been reset successfully.")
