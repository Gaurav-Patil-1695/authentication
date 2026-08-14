from fastapi import APIRouter, Response, status

from app.auth.schemas import (
    LoginRequest,
    LoginResponse,
    ErrorResponse,
)
from app.auth.service import login as login_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/login",
    response_model=LoginResponse,
    responses={
        401: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
    },
    status_code=status.HTTP_200_OK,
    operation_id="login",
)
async def login(payload: LoginRequest, response: Response) -> LoginResponse:
    """Authenticate a user with email and password and return access/refresh tokens."""
    return await login_service(payload=payload, response=response)
