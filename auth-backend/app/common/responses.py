from typing import Any

from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.common.errors import AppError, ErrorCode


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Any | None = None


class ErrorEnvelope(BaseModel):
    error: ErrorDetail


def error_response(
    code: ErrorCode,
    message: str,
    status_code: int = 400,
    details: Any | None = None,
) -> JSONResponse:
    body = ErrorEnvelope(
        error=ErrorDetail(
            code=code.value,
            message=message,
            details=details,
        )
    )
    return JSONResponse(
        status_code=status_code,
        content=body.model_dump(exclude_none=True),
    )


def exception_to_response(exc: AppError) -> JSONResponse:
    return error_response(
        code=exc.code,
        message=exc.message,
        status_code=exc.status_code,
        details=exc.details,
    )
