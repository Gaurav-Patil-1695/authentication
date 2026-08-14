from __future__ import annotations

from functools import lru_cache
from typing import Optional

from pydantic import AnyUrl, EmailStr, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ------------------------------------------------------------------
    # Database
    # ------------------------------------------------------------------
    DATABASE_URL: str = Field(..., description="SQLAlchemy-compatible database URL")

    # ------------------------------------------------------------------
    # JWT
    # ------------------------------------------------------------------
    JWT_SECRET_KEY: str = Field(..., description="Secret key used to sign JWTs")
    JWT_ALGORITHM: str = Field(default="HS256", description="JWT signing algorithm")
    JWT_ACCESS_TOKEN_TTL_MINUTES: int = Field(
        default=15,
        gt=0,
        description="Lifetime of access tokens in minutes",
    )

    # ------------------------------------------------------------------
    # Bcrypt
    # ------------------------------------------------------------------
    BCRYPT_ROUNDS: int = Field(
        default=12,
        ge=12,
        description="bcrypt cost factor; must be >= 12 (NFR-01)",
    )

    # ------------------------------------------------------------------
    # Password-reset token
    # ------------------------------------------------------------------
    RESET_TOKEN_TTL_MINUTES: int = Field(
        default=60,
        gt=0,
        description="Lifetime of password-reset tokens in minutes",
    )

    # ------------------------------------------------------------------
    # Refresh token
    # ------------------------------------------------------------------
    REFRESH_TOKEN_TTL_DAYS: int = Field(
        default=7,
        gt=0,
        description="Lifetime of refresh tokens in days (standard session)",
    )
    REFRESH_TOKEN_TTL_DAYS_REMEMBER_ME: int = Field(
        default=30,
        gt=0,
        description="Lifetime of refresh tokens in days when remember-me is set",
    )

    # ------------------------------------------------------------------
    # SMTP
    # ------------------------------------------------------------------
    SMTP_HOST: str = Field(..., description="SMTP server hostname")
    SMTP_PORT: int = Field(default=587, gt=0, le=65535, description="SMTP server port")
    SMTP_USERNAME: str = Field(..., description="SMTP authentication username")
    SMTP_PASSWORD: str = Field(..., description="SMTP authentication password")
    SMTP_FROM_EMAIL: EmailStr = Field(..., description="Sender address for outgoing mail")
    SMTP_FROM_NAME: str = Field(default="Auth Service", description="Sender display name")
    SMTP_TLS: bool = Field(default=True, description="Use STARTTLS when connecting to SMTP")

    # ------------------------------------------------------------------
    # Rate limits  (NFR-08)
    # ------------------------------------------------------------------
    RATE_LIMIT_LOGIN_MAX_ATTEMPTS: int = Field(
        default=10,
        gt=0,
        description="Maximum login attempts per window",
    )
    RATE_LIMIT_LOGIN_WINDOW_SECONDS: int = Field(
        default=60,
        gt=0,
        description="Window size in seconds for login rate limiting",
    )
    RATE_LIMIT_FORGOT_PASSWORD_MAX_ATTEMPTS: int = Field(
        default=5,
        gt=0,
        description="Maximum forgot-password requests per window",
    )
    RATE_LIMIT_FORGOT_PASSWORD_WINDOW_SECONDS: int = Field(
        default=60,
        gt=0,
        description="Window size in seconds for forgot-password rate limiting",
    )

    # ------------------------------------------------------------------
    # Validators
    # ------------------------------------------------------------------
    @field_validator("DATABASE_URL")
    @classmethod
    def database_url_must_not_be_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("DATABASE_URL must not be empty")
        return stripped

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def jwt_secret_must_not_be_empty(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("JWT_SECRET_KEY must not be empty")
        if len(stripped) < 32:
            raise ValueError("JWT_SECRET_KEY must be at least 32 characters long")
        return stripped

    @field_validator("BCRYPT_ROUNDS")
    @classmethod
    def bcrypt_rounds_minimum(cls, v: int) -> int:
        if v < 12:
            raise ValueError("BCRYPT_ROUNDS must be >= 12 to satisfy NFR-01")
        return v

    @model_validator(mode="after")
    def refresh_ttl_ordering(self) -> "Settings":
        if self.REFRESH_TOKEN_TTL_DAYS_REMEMBER_ME < self.REFRESH_TOKEN_TTL_DAYS:
            raise ValueError(
                "REFRESH_TOKEN_TTL_DAYS_REMEMBER_ME must be >= REFRESH_TOKEN_TTL_DAYS"
            )
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached singleton Settings instance.

    Raises pydantic.ValidationError (fast-fail) if any required variable
    is missing or fails validation.
    """
    return Settings()  # type: ignore[call-arg]


settings: Settings = get_settings()
