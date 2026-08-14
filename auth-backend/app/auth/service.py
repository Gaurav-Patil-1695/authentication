from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.schemas import LoginRequest, LoginResponse, TokenPair
from app.core.database import get_session
from app.core.exceptions import UnauthorizedException
from app.models import RefreshToken, User
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_token,
    store_refresh_token,
)


INVALID_CREDENTIALS_MSG = "Invalid email or password."


async def login(*, payload: LoginRequest, response: Response) -> LoginResponse:
    """Authenticate user and return access + refresh tokens."""
    async for session in get_session():
        result = await session.execute(
            select(User).where(User.email == payload.email)
        )
        user: User | None = result.scalar_one_or_none()

        # Enumeration-resistant: always run bcrypt even when user is not found
        dummy_hash = b"$2b$12$invalidhashfortimingresistanceonlyxxxxxxxxxxxxxxxxxxxxxxx"
        stored_hash: bytes = (
            user.password_hash.encode() if user and isinstance(user.password_hash, str)
            else user.password_hash if user
            else dummy_hash
        )

        password_correct = bcrypt.checkpw(
            payload.password.encode("utf-8"),
            stored_hash,
        )

        if not user or not password_correct or not user.is_active:
            raise UnauthorizedException(message=INVALID_CREDENTIALS_MSG)

        access_token = create_access_token(subject=str(user.id))
        raw_refresh_token = await store_refresh_token(
            session=session,
            user_id=user.id,
            remember_me=payload.remember_me,
        )
        await session.commit()

        # Set refresh token in httpOnly, SameSite=Lax cookie
        max_age = _refresh_token_max_age(remember_me=payload.remember_me)
        response.set_cookie(
            key="refresh_token",
            value=raw_refresh_token,
            httponly=True,
            samesite="lax",
            secure=_is_secure(),
            max_age=max_age,
            path="/auth/refresh",
        )

        return LoginResponse(
            tokens=TokenPair(
                access_token=access_token,
                token_type="bearer",
            ),
            user_id=str(user.id),
            full_name=user.full_name,
            email=user.email,
        )


def _refresh_token_max_age(*, remember_me: bool) -> int:
    """Return refresh token cookie max_age in seconds."""
    if remember_me:
        days = int(os.getenv("REFRESH_TOKEN_REMEMBER_ME_DAYS", "30"))
    else:
        days = int(os.getenv("REFRESH_TOKEN_DAYS", "1"))
    return days * 24 * 60 * 60


def _is_secure() -> bool:
    """Return True when not running in local development."""
    return os.getenv("ENVIRONMENT", "production").lower() != "development"
