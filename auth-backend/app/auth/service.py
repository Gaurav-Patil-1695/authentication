import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import Response

from app.auth.schemas import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    LoginResponse,
    LogoutRequest,
    LogoutResponse,
    MeResponse,
    RefreshResponse,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
)


DATABASE_URL: str = os.environ.get("DATABASE_URL", "")
JWT_SECRET: str = os.environ.get("JWT_SECRET", "changeme")
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
PASSWORD_RESET_EXPIRE_MINUTES: int = int(
    os.environ.get("PASSWORD_RESET_EXPIRE_MINUTES", "60")
)
FRONTEND_URL: str = os.environ.get("FRONTEND_URL", "http://localhost:3000")


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def _hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _create_access_token(user_id: str, email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": user_id, "email": email, "exp": expire, "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _create_refresh_token() -> str:
    return secrets.token_urlsafe(64)


class AuthService:
    async def register(
        self, body: RegisterRequest
    ) -> RegisterResponse:
        import asyncpg  # type: ignore

        if body.password != body.confirm_password:
            from fastapi import HTTPException

            raise HTTPException(
                status_code=422,
                detail={
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "Passwords do not match.",
                        "details": [{"field": "confirmPassword", "message": "Passwords do not match."}],
                    }
                },
            )

        conn = await asyncpg.connect(DATABASE_URL)
        try:
            existing = await conn.fetchrow(
                "SELECT id FROM users WHERE email = $1", body.email
            )
            if existing:
                from fastapi import HTTPException

                raise HTTPException(
                    status_code=409,
                    detail={
                        "error": {
                            "code": "EMAIL_TAKEN",
                            "message": "An account with this email already exists.",
                            "details": [{"field": "email", "message": "An account with this email already exists."}],
                        }
                    },
                )

            password_hash = _hash_password(body.password)
            row = await conn.fetchrow(
                """
                INSERT INTO users (full_name, email, password_hash, is_active)
                VALUES ($1, $2, $3, TRUE)
                RETURNING id, full_name, email, is_active, created_at
                """,
                body.full_name,
                body.email,
                password_hash,
            )
            return RegisterResponse(
                id=str(row["id"]),
                fullName=row["full_name"],
                email=row["email"],
                isActive=row["is_active"],
                createdAt=row["created_at"].isoformat(),
            )
        finally:
            await conn.close()

    async def login(
        self, body: LoginRequest, response: Response
    ) -> LoginResponse:
        import asyncpg  # type: ignore
        from fastapi import HTTPException

        conn = await asyncpg.connect(DATABASE_URL)
        try:
            row = await conn.fetchrow(
                "SELECT id, full_name, email, password_hash, is_active FROM users WHERE email = $1",
                body.email,
            )
            if not row or not _verify_password(body.password, row["password_hash"]):
                raise HTTPException(
                    status_code=401,
                    detail={
                        "error": {
                            "code": "INVALID_CREDENTIALS",
                            "message": "Invalid email or password.",
                            "details": [],
                        }
                    },
                )

            if not row["is_active"]:
                raise HTTPException(
                    status_code=403,
                    detail={
                        "error": {
                            "code": "ACCOUNT_INACTIVE",
                            "message": "Your account is inactive.",
                            "details": [],
                        }
                    },
                )

            user_id = str(row["id"])
            access_token = _create_access_token(user_id, row["email"])
            raw_refresh = _create_refresh_token()
            refresh_hash = _hash_token(raw_refresh)

            remember = body.rememberMe if body.rememberMe is not None else False
            expire_days = REFRESH_TOKEN_REMEMBER_DAYS if remember else REFRESH_TOKEN_EXPIRE_DAYS
            expires_at = datetime.now(timezone.utc) + timedelta(days=expire_days)

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

            response.set_cookie(
                key="refresh_token",
                value=raw_refresh,
                httponly=True,
                samesite="lax",
                secure=True,
                expires=int(expire_days * 86400),
            )

            return LoginResponse(
                accessToken=access_token,
                tokenType="bearer",
                user={
                    "id": user_id,
                    "fullName": row["full_name"],
                    "email": row["email"],
                },
            )
        finally:
            await conn.close()

    async def forgotPassword(
        self, body: ForgotPasswordRequest
    ) -> ForgotPasswordResponse:
        import asyncpg  # type: ignore

        conn = await asyncpg.connect(DATABASE_URL)
        try:
            row = await conn.fetchrow(
                "SELECT id FROM users WHERE email = $1 AND is_active = TRUE",
                body.email,
            )
            if row:
                raw_token = secrets.token_urlsafe(64)
                token_hash = _hash_token(raw_token)
                expires_at = datetime.now(timezone.utc) + timedelta(
                    minutes=PASSWORD_RESET_EXPIRE_MINUTES
                )
                await conn.execute(
                    """
                    INSERT INTO password_resets (user_id, token_hash, expires_at)
                    VALUES ($1, $2, $3)
                    """,
                    row["id"],
                    token_hash,
                    expires_at,
                )
                reset_link = f"{FRONTEND_URL}/reset-password?token={raw_token}"
                # In production this would dispatch an email; here we log for dev.
                print(f"[DEV] Password reset link: {reset_link}")
        finally:
            await conn.close()

        return ForgotPasswordResponse(
            message="If an account with that email exists, a password reset link has been sent."
        )

    async def resetPassword(
        self, body: ResetPasswordRequest
    ) -> ResetPasswordResponse:
        import asyncpg  # type: ignore
        from fastapi import HTTPException

        if body.password != body.confirmPassword:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": "Passwords do not match.",
                        "details": [{"field": "confirmPassword", "message": "Passwords do not match."}],
                    }
                },
            )

        token_hash = _hash_token(body.token)
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            reset_row = await conn.fetchrow(
                """
                SELECT id, user_id, expires_at, used_at
                FROM password_resets
                WHERE token_hash = $1
                """,
                token_hash,
            )
            if not reset_row:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": {
                            "code": "INVALID_TOKEN",
                            "message": "This password reset link is invalid or has expired.",
                            "details": [],
                        }
                    },
                )
            if reset_row["used_at"] is not None:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": {
                            "code": "TOKEN_USED",
                            "message": "This password reset link is invalid or has expired.",
                            "details": [],
                        }
                    },
                )
            if reset_row["expires_at"] < datetime.now(timezone.utc):
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": {
                            "code": "TOKEN_EXPIRED",
                            "message": "This password reset link is invalid or has expired.",
                            "details": [],
                        }
                    },
                )

            new_hash = _hash_password(body.password)
            async with conn.transaction():
                await conn.execute(
                    "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
                    new_hash,
                    reset_row["user_id"],
                )
                await conn.execute(
                    "UPDATE password_resets SET used_at = NOW() WHERE id = $1",
                    reset_row["id"],
                )
                await conn.execute(
                    "UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
                    reset_row["user_id"],
                )
        finally:
            await conn.close()

        return ResetPasswordResponse(message="Your password has been reset successfully.")

    async def me(self, token: Optional[str]) -> MeResponse:
        import asyncpg  # type: ignore
        from fastapi import HTTPException

        if not token:
            raise HTTPException(
                status_code=401,
                detail={
                    "error": {
                        "code": "MISSING_TOKEN",
                        "message": "Authentication required.",
                        "details": [],
                    }
                },
            )

        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=401,
                detail={
                    "error": {
                        "code": "TOKEN_EXPIRED",
                        "message": "Token has expired.",
                        "details": [],
                    }
                },
            )
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=401,
                detail={
                    "error": {
                        "code": "INVALID_TOKEN",
                        "message": "Invalid token.",
                        "details": [],
                    }
                },
            )

        user_id = payload.get("sub")
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            row = await conn.fetchrow(
                "SELECT id, full_name, email, is_active, created_at FROM users WHERE id = $1",
                user_id,
            )
            if not row:
                raise HTTPException(
                    status_code=401,
                    detail={
                        "error": {
                            "code": "USER_NOT_FOUND",
                            "message": "User not found.",
                            "details": [],
                        }
                    },
                )
        finally:
            await conn.close()

        return MeResponse(
            id=str(row["id"]),
            fullName=row["full_name"],
            email=row["email"],
            isActive=row["is_active"],
            createdAt=row["created_at"].isoformat(),
        )

    async def logout(
        self, body: LogoutRequest, token: Optional[str], response: Response
    ) -> LogoutResponse:
        import asyncpg  # type: ignore

        refresh_token = body.refreshToken if body.refreshToken else None
        if refresh_token:
            token_hash = _hash_token(refresh_token)
            conn = await asyncpg.connect(DATABASE_URL)
            try:
                await conn.execute(
                    "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL",
                    token_hash,
                )
            finally:
                await conn.close()

        response.delete_cookie(key="refresh_token")
        return LogoutResponse(message="Logged out successfully.")

    async def refresh(self, response: Response) -> RefreshResponse:
        from fastapi import HTTPException
        import asyncpg  # type: ignore

        raise HTTPException(
            status_code=401,
            detail={
                "error": {
                    "code": "MISSING_TOKEN",
                    "message": "Refresh token not provided.",
                    "details": [],
                }
            },
        )
