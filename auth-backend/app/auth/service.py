from datetime import datetime, timezone
from typing import Optional

from fastapi import Request, Response

from app.auth.schemas import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    RegisterResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    MeResponse,
    LogoutRequest,
    LogoutResponse,
    RefreshRequest,
    RefreshResponse,
)
from app.models.user import User
from app.auth.repository import AuthRepository
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    hash_token,
)
from app.core.config import settings
from app.core.exceptions import (
    AuthenticationError,
    ValidationError,
    NotFoundError,
)


class AuthService:
    def __init__(self, repository: AuthRepository) -> None:
        self.repository = repository

    async def register(self, body: RegisterRequest) -> RegisterResponse:
        existing = await self.repository.get_user_by_email(body.email)
        if existing is not None:
            raise ValidationError(
                code="EMAIL_TAKEN",
                message="An account with this email address already exists.",
            )

        password_hash = hash_password(body.password)
        user = await self.repository.create_user(
            full_name=body.full_name,
            email=body.email,
            password_hash=password_hash,
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
        user = await self.repository.get_user_by_email(body.email)
        if user is None or not verify_password(body.password, user.password_hash):
            raise AuthenticationError(
                code="INVALID_CREDENTIALS",
                message="Invalid email or password.",
            )

        if not user.is_active:
            raise AuthenticationError(
                code="ACCOUNT_INACTIVE",
                message="Invalid email or password.",
            )

        access_token = create_access_token(subject=str(user.id))
        raw_refresh_token, refresh_token_hash = create_refresh_token()

        remember_me: bool = body.remember_me if body.remember_me is not None else False
        expires_at = (
            datetime.now(timezone.utc)
            + (
                settings.REFRESH_TOKEN_REMEMBER_ME_EXPIRE
                if remember_me
                else settings.REFRESH_TOKEN_EXPIRE
            )
        )

        await self.repository.create_refresh_token(
            user_id=user.id,
            token_hash=refresh_token_hash,
            expires_at=expires_at,
            remember_me=remember_me,
        )

        response.set_cookie(
            key="refresh_token",
            value=raw_refresh_token,
            httponly=True,
            samesite="lax",
            secure=settings.COOKIE_SECURE,
            max_age=int(
                (
                    settings.REFRESH_TOKEN_REMEMBER_ME_EXPIRE
                    if remember_me
                    else settings.REFRESH_TOKEN_EXPIRE
                ).total_seconds()
            ),
        )

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
        )

    async def forgotPassword(self, body: ForgotPasswordRequest) -> ForgotPasswordResponse:
        generic_message = (
            "If an account with that email exists, a password reset link has been sent."
        )

        user = await self.repository.get_user_by_email(body.email)
        if user is None:
            return ForgotPasswordResponse(message=generic_message)

        raw_token, token_hash = create_refresh_token()
        expires_at = datetime.now(timezone.utc) + settings.PASSWORD_RESET_TOKEN_EXPIRE

        await self.repository.create_password_reset_token(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )

        # Email sending would be triggered here via an email service
        # Not implemented as a separate concern in this work item

        return ForgotPasswordResponse(message=generic_message)

    async def resetPassword(self, body: ResetPasswordRequest) -> ResetPasswordResponse:
        token_hash = hash_token(body.token)
        reset_record = await self.repository.get_valid_password_reset(
            token_hash=token_hash,
        )

        if reset_record is None:
            raise ValidationError(
                code="INVALID_RESET_TOKEN",
                message="This password reset link is invalid or has expired.",
            )

        new_password_hash = hash_password(body.password)
        await self.repository.update_user_password(
            user_id=reset_record.user_id,
            password_hash=new_password_hash,
        )
        await self.repository.mark_password_reset_used(reset_record.id)
        await self.repository.revoke_all_refresh_tokens(reset_record.user_id)

        return ResetPasswordResponse(
            message="Your password has been reset successfully."
        )

    async def me(self, current_user: User) -> MeResponse:
        return MeResponse(
            id=current_user.id,
            full_name=current_user.full_name,
            email=current_user.email,
            is_active=current_user.is_active,
            created_at=current_user.created_at,
            updated_at=current_user.updated_at,
        )

    async def logout(
        self,
        request: Request,
        response: Response,
        current_user: User,
    ) -> LogoutResponse:
        raw_refresh_token: Optional[str] = request.cookies.get("refresh_token")

        if raw_refresh_token:
            token_hash = hash_token(raw_refresh_token)
            await self.repository.revoke_refresh_token(token_hash=token_hash)

        response.delete_cookie(
            key="refresh_token",
            httponly=True,
            samesite="lax",
            secure=settings.COOKIE_SECURE,
        )

        return LogoutResponse(message="Logged out successfully.")

    async def refresh(
        self,
        request: Request,
        response: Response,
    ) -> RefreshResponse:
        raw_refresh_token: Optional[str] = request.cookies.get("refresh_token")

        if not raw_refresh_token:
            raise AuthenticationError(
                code="MISSING_REFRESH_TOKEN",
                message="Refresh token is missing.",
            )

        token_hash = hash_token(raw_refresh_token)
        token_record = await self.repository.get_valid_refresh_token(
            token_hash=token_hash,
        )

        if token_record is None:
            raise AuthenticationError(
                code="INVALID_REFRESH_TOKEN",
                message="Refresh token is invalid or has expired.",
            )

        user = await self.repository.get_user_by_id(token_record.user_id)
        if user is None or not user.is_active:
            raise AuthenticationError(
                code="INVALID_REFRESH_TOKEN",
                message="Refresh token is invalid or has expired.",
            )

        await self.repository.revoke_refresh_token(token_hash=token_hash)

        new_raw_refresh_token, new_refresh_token_hash = create_refresh_token()
        remember_me: bool = token_record.remember_me
        expires_at = (
            datetime.now(timezone.utc)
            + (
                settings.REFRESH_TOKEN_REMEMBER_ME_EXPIRE
                if remember_me
                else settings.REFRESH_TOKEN_EXPIRE
            )
        )

        await self.repository.create_refresh_token(
            user_id=user.id,
            token_hash=new_refresh_token_hash,
            expires_at=expires_at,
            remember_me=remember_me,
        )

        new_access_token = create_access_token(subject=str(user.id))

        response.set_cookie(
            key="refresh_token",
            value=new_raw_refresh_token,
            httponly=True,
            samesite="lax",
            secure=settings.COOKIE_SECURE,
            max_age=int(
                (
                    settings.REFRESH_TOKEN_REMEMBER_ME_EXPIRE
                    if remember_me
                    else settings.REFRESH_TOKEN_EXPIRE
                ).total_seconds()
            ),
        )

        return RefreshResponse(
            access_token=new_access_token,
            token_type="bearer",
        )
