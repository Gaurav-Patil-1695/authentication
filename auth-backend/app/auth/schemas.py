from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    full_name: str = Field(..., alias="fullName")
    email: EmailStr
    password: str
    confirm_password: str = Field(..., alias="confirmPassword")

    model_config = {"populate_by_name": True}


class RegisterResponse(BaseModel):
    id: str
    full_name: str = Field(..., serialization_alias="fullName")
    email: str

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool | None = Field(None, alias="rememberMe")

    model_config = {"populate_by_name": True}


class LoginResponse(BaseModel):
    access_token: str = Field(..., serialization_alias="accessToken")
    token_type: str = Field(..., serialization_alias="tokenType")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Refresh  (FR-08)
# ---------------------------------------------------------------------------

class RefreshResponse(BaseModel):
    access_token: str = Field(..., serialization_alias="accessToken")
    token_type: str = Field(..., serialization_alias="tokenType")

    model_config = {"populate_by_name": True}


# ---------------------------------------------------------------------------
# Forgot Password
# ---------------------------------------------------------------------------

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str


# ---------------------------------------------------------------------------
# Reset Password
# ---------------------------------------------------------------------------

class ResetPasswordRequest(BaseModel):
    token: str
    password: str
    confirm_password: str = Field(..., alias="confirmPassword")

    model_config = {"populate_by_name": True}


class ResetPasswordResponse(BaseModel):
    message: str


# ---------------------------------------------------------------------------
# Me
# ---------------------------------------------------------------------------

class MeResponse(BaseModel):
    id: str
    full_name: str = Field(..., serialization_alias="fullName")
    email: str
    is_active: bool = Field(..., serialization_alias="isActive")
    created_at: datetime = Field(..., serialization_alias="createdAt")

    model_config = {"populate_by_name": True}
