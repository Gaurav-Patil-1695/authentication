from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
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
from app.auth.service import (
    login,
    register,
    forgotPassword,
    resetPassword,
    me,
    logout,
    refresh,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
async def login_endpoint(request: LoginRequest, response: Response) -> LoginResponse:
    return await login(request, response)


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register_endpoint(request: RegisterRequest) -> RegisterResponse:
    return await register(request)


@router.post("/forgot-password", response_model=ForgotPasswordResponse, status_code=status.HTTP_202_ACCEPTED)
async def forgot_password_endpoint(request: ForgotPasswordRequest) -> ForgotPasswordResponse:
    return await forgotPassword(request)


@router.post("/reset-password", response_model=ResetPasswordResponse, status_code=status.HTTP_200_OK)
async def reset_password_endpoint(request: ResetPasswordRequest) -> ResetPasswordResponse:
    return await resetPassword(request)


@router.get("/me", response_model=MeResponse, status_code=status.HTTP_200_OK)
async def me_endpoint(http_request: Request) -> MeResponse:
    return await me(http_request)


@router.post("/logout", response_model=LogoutResponse, status_code=status.HTTP_200_OK)
async def logout_endpoint(request: LogoutRequest, response: Response) -> LogoutResponse:
    return await logout(request, response)


@router.post("/refresh", response_model=RefreshResponse, status_code=status.HTTP_200_OK)
async def refresh_endpoint(request: RefreshRequest, response: Response) -> RefreshResponse:
    return await refresh(request, response)
