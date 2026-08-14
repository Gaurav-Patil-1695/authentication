from datetime import datetime, timezone
from typing import Optional

import hashlib

from fastapi import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.schemas import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    LogoutResponse,
    RefreshResponse,
)
from app.auth.repository import AuthRepository
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_token,
)
from app.core.config import settings
from app.core.exceptions import AppException


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = AuthRepository(db)

    async def register(self, body: RegisterRequest) -> RegisterResponse:
        existing = await self.repo.get_user_by_email(body.email)
        if existing:
            raise AppException(
                status_code=409,
                code="EMAIL_TAKEN",
                message="An account with this email already exists.",
            )
        pw_hash = hash_password(body.password)
        user = await self.repo.create_user(
            full_name=body.full_name,
            email=body.email,
            password_hash=pw_hash,
        )
        return RegisterResponse(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            is_active=user.is_active,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )

    async def login(self, body: LoginRequest, response: Response) -> LoginResponse:
        user = await self.repo.get_user_by_email(body.email)
        if not user or not verify_password(body.password, user.password_hash):
            raise AppException(
                status_code=401,
                code="INVALID_CREDENTIALS",
                message="Invalid email or password.",
            )
        if not user.is_active:
            raise AppException(
                status_code=403,
                code="ACCOUNT_INACTIVE",
                message="Your account is inactive.",
            )
        access_token = create_access_token({"sub": str(user.id)})
        raw_refresh, expires_at = create_refresh_token(remember_me=body.remember_me)
        token_hash = hash_token(raw_refresh)
        await self.repo.create_refresh_token(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            remember_me=body.remember_me,
        )
        max_age = settings.REFRESH_TOKEN_REMEMBER_ME_DAYS * 86400 if body.remember_me else settings.REFRESH_TOKEN_DAYS * 86400
        response.set_cookie(
            key="refresh_token",
            value=raw_refresh,
            httponly=True,
            samesite="lax",
            secure=settings.COOKIE_SECURE,
            max_age=max_age,
            path="/",
        )
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
        )

    async def forgot_password(self, body: ForgotPasswordRequest) -> ForgotPasswordResponse:
        user = await self.repo.get_user_by_email(body.email)
        if user and user.is_active:
            raw_token, expires_at = self.repo.generate_reset_token()
            token_hash = hash_token(raw_token)
            await self.repo.create_password_reset(
                user_id=user.id,
                token_hash=token_hash,
                expires_at=expires_at,
            )
            # In a real deployment, send email here
        return ForgotPasswordResponse(
            message="If that email address is registered, you will receive a password reset link shortly.",
        )

    async def reset_password(self, body: ResetPasswordRequest) -> ResetPasswordResponse:
        token_hash = hash_token(body.token)
        reset = await self.repo.get_valid_password_reset(token_hash)
        if not reset:
            raise AppException(
                status_code=400,
                code="INVALID_OR_EXPIRED_TOKEN",
                message="This password reset link is invalid or has expired.",
            )
        user = await self.repo.get_user_by_id(reset.user_id)
        if not user or not user.is_active:
            raise AppException(
                status_code=400,
                code="INVALID_OR_EXPIRED_TOKEN",
                message="This password reset link is invalid or has expired.",
            )
        pw_hash = hash_password(body.password)
        await self.repo.update_user_password(user.id, pw_hash)
        await self.repo.mark_reset_token_used(reset.id)
        await self.repo.revoke_all_refresh_tokens(user.id)
        return ResetPasswordResponse(
            message="Your password has been reset successfully. Please log in with your new password.",
        )

    async def logout(
        self,
        refresh_token: Optional[str],
        response: Response,
    ) -> LogoutResponse:
        if refresh_token:
            token_hash = hash_token(refresh_token)
            await self.repo.revoke_refresh_token_by_hash(token_hash)
        response.delete_cookie(
            key="refresh_token",
            path="/",
            httponly=True,
            samesite="lax",
            secure=settings.COOKIE_SECURE,
        )
        return LogoutResponse(message="You have been logged out successfully.")

    async def refresh(
        self,
        refresh_token: Optional[str],
        response: Response,
    ) -> RefreshResponse:
        if not refresh_token:
            raise AppException(
                status_code=401,
                code="MISSING_REFRESH_TOKEN",
                message="No refresh token provided.",
            )
        payload = decode_refresh_token(refresh_token)
        if not payload:
            raise AppException(
                status_code=401,
                code="INVALID_REFRESH_TOKEN",
                message="Invalid or expired refresh token.",
            )
        token_hash = hash_token(refresh_token)
        stored = await self.repo.get_refresh_token_by_hash(token_hash)
        if not stored or stored.revoked_at is not None:
            raise AppException(
                status_code=401,
                code="INVALID_REFRESH_TOKEN",
                message="Invalid or expired refresh token.",
            )
        now = datetime.now(timezone.utc)
        if stored.expires_at < now:
            raise AppException(
                status_code=401,
                code="INVALID_REFRESH_TOKEN",
                message="Invalid or expired refresh token.",
            )
        user = await self.repo.get_user_by_id(stored.user_id)
        if not user or not user.is_active:
            raise AppException(
                status_code=401,
                code="INVALID_REFRESH_TOKEN",
                message="Invalid or expired refresh token.",
            )
        # Revoke old token (rotation)
        await self.repo.revoke_refresh_token_by_hash(token_hash)
        # Issue new tokens
        access_token = create_access_token({"sub": str(user.id)})
        raw_refresh, expires_at = create_refresh_token(remember_me=stored.remember_me)
        new_hash = hash_token(raw_refresh)
        await self.repo.create_refresh_token(
            user_id=user.id,
            token_hash=new_hash,
            expires_at=expires_at,
            remember_me=stored.remember_me,
        )
        max_age = (
            settings.REFRESH_TOKEN_REMEMBER_ME_DAYS * 86400
            if stored.remember_me
            else settings.REFRESH_TOKEN_DAYS * 86400
        )
        response.set_cookie(
            key="refresh_token",
            value=raw_refresh,
            httponly=True,
            samesite="lax",
            secure=settings.COOKIE_SECURE,
            max_age=max_age,
            path="/",
        )
        return RefreshResponse(
            access_token=access_token,
            token_type="bearer",
        )
