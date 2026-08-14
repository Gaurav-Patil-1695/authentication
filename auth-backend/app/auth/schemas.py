from __future__ import annotations

from datetime import datetime
from typing import Optional

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
    fullName: str
    email: str


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: Optional[bool] = Field(None, alias="rememberMe")

    model_config = {"populate_by_name": True}


class LoginResponse(BaseModel):
    accessToken: str
    tokenType: str


# ---------------------------------------------------------------------------
# Refresh  (FR-08)
# ---------------------------------------------------------------------------

class RefreshResponse(BaseModel):
    accessToken: str
    tokenType: str


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
    fullName: str
    email: str
    isActive: bool
    createdAt: datetime
