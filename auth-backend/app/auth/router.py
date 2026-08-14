from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, status
from typing import Optional

from app.auth.service import AuthService
from app.auth.schemas import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    MeResponse,
    LogoutResponse,
    RefreshResponse,
    ErrorResponse,
)
from app.core.dependencies import get_current_user, get_auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="register",
)
async def register(
    body: RegisterRequest,
    service: AuthService = Depends(get_auth_service),
) -> RegisterResponse:
    return await service.register(body)


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    operation_id="login",
)
async def login(
    body: LoginRequest,
    response: Response,
    service: AuthService = Depends(get_auth_service),
) -> LoginResponse:
    return await service.login(body, response)


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    status_code=status.HTTP_202_ACCEPTED,
    operation_id="forgotPassword",
)
async def forgotPassword(
    body: ForgotPasswordRequest,
    service: AuthService = Depends(get_auth_service),
) -> ForgotPasswordResponse:
    return await service.forgot_password(body)


@router.post(
    "/reset-password",
    response_model=ResetPasswordResponse,
    status_code=status.HTTP_200_OK,
    operation_id="resetPassword",
)
async def resetPassword(
    body: ResetPasswordRequest,
    service: AuthService = Depends(get_auth_service),
) -> ResetPasswordResponse:
    return await service.reset_password(body)


@router.get(
    "/me",
    response_model=MeResponse,
    status_code=status.HTTP_200_OK,
    operation_id="me",
)
async def me(
    current_user=Depends(get_current_user),
) -> MeResponse:
    return MeResponse(
        id=current_user.id,
        full_name=current_user.full_name,
        email=current_user.email,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
    )


@router.post(
    "/logout",
    response_model=LogoutResponse,
    status_code=status.HTTP_200_OK,
    operation_id="logout",
)
async def logout(
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None, alias="refresh_token"),
    service: AuthService = Depends(get_auth_service),
) -> LogoutResponse:
    return await service.logout(refresh_token=refresh_token, response=response)


@router.post(
    "/refresh",
    response_model=RefreshResponse,
    status_code=status.HTTP_200_OK,
    operation_id="refresh",
)
async def refresh(
    response: Response,
    refresh_token: Optional[str] = Cookie(default=None, alias="refresh_token"),
    service: AuthService = Depends(get_auth_service),
) -> RefreshResponse:
    return await service.refresh(refresh_token=refresh_token, response=response)
