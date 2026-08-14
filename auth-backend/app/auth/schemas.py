from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    rememberMe: Optional[bool] = None


class LoginResponse(BaseModel):
    accessToken: str
    tokenType: str
    user: Dict[str, Any]


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    confirm_password: str


class RegisterResponse(BaseModel):
    id: str
    fullName: str
    email: str
    isActive: bool
    createdAt: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str


class ResetPasswordRequest(BaseModel):
    token: str
    password: str
    confirmPassword: str


class ResetPasswordResponse(BaseModel):
    message: str


class MeResponse(BaseModel):
    id: str
    fullName: str
    email: str
    isActive: bool
    createdAt: str


class LogoutRequest(BaseModel):
    refreshToken: Optional[str] = None


class LogoutResponse(BaseModel):
    message: str


class RefreshResponse(BaseModel):
    accessToken: str
    tokenType: str


class ErrorDetail(BaseModel):
    field: str
    message: str


class ErrorBody(BaseModel):
    code: str
    message: str
    details: List[ErrorDetail] = []


class ErrorResponse(BaseModel):
    error: ErrorBody
