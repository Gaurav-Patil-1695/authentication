from __future__ import annotations

from typing import Any

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="User email address.")
    password: str = Field(..., min_length=1, description="User password.")
    remember_me: bool = Field(False, description="Extend refresh token lifetime.")


class TokenPair(BaseModel):
    access_token: str = Field(..., description="Short-lived JWT access token.")
    token_type: str = Field(..., description="Token type, always 'bearer'.")


class LoginResponse(BaseModel):
    tokens: TokenPair
    user_id: str = Field(..., description="UUID of the authenticated user.")
    full_name: str = Field(..., description="Full name of the authenticated user.")
    email: str = Field(..., description="Email address of the authenticated user.")


class ErrorDetail(BaseModel):
    code: str = Field(..., description="Machine-readable error code.")
    message: str = Field(..., description="Human-readable error message.")
    details: dict[str, Any] | None = Field(None, description="Optional additional error details.")


class ErrorResponse(BaseModel):
    error: ErrorDetail
