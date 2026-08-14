# auth-backend

FastAPI authentication service providing JWT-based registration, login, token refresh, password reset, and logout endpoints.

---

## Features

- Email + password registration with bcrypt hashing
- JWT access tokens (short-lived) + rotating refresh tokens
- Remember-me support for extended refresh token TTL
- Forgot-password / reset-password flow via SMTP email
- Enumeration-resistant responses on login and forgot-password
- Rate limiting on login and forgot-password endpoints
- Token storage: access token in response body, refresh token in httpOnly cookie
- All reset and refresh tokens stored as SHA-256 hashes

---

## Project Structure

```
auth-backend/
├── app/
│   ├── main.py                  # FastAPI application factory
│   ├── config.py                # Settings loaded from environment
│   ├── database.py              # SQLAlchemy engine and session
│   ├── auth/
│   │   ├── router.py            # Route handlers (POST /auth/login, etc.)
│   │   ├── service.py           # Business logic
│   │   └── schemas.py           # Pydantic request/response models
│   └── models/
│       ├── user.py              # User ORM model
│       ├── password_reset.py    # PasswordReset ORM model
│       └── refresh_token.py     # RefreshToken ORM model
├── tests/
│   └── test_auth.py             # pytest integration tests
├── requirements.txt
├── Dockerfile
├── .env.example
└── README.md
```

---

## Endpoints

| Method | Path                    | Handler          | Description                              |
|--------|-------------------------|------------------|------------------------------------------|
| POST   | `/auth/register`        | `register`       | Create a new user account                |
| POST   | `/auth/login`           | `login`          | Authenticate and receive tokens          |
| GET    | `/auth/me`              | `me`             | Return the current authenticated user    |
| POST   | `/auth/logout`          | `logout`         | Revoke the current refresh token         |
| POST   | `/auth/refresh`         | `refresh`        | Issue a new access token via refresh     |
| POST   | `/auth/forgot-password` | `forgotPassword` | Send a password-reset email              |
| POST   | `/auth/reset-password`  | `resetPassword`  | Reset password using a valid reset token |

All error responses follow the envelope:

```json
{
  "error": {
    "code": "SOME_CODE",
    "message": "Human-readable message.",
    "details": {}
  }
}
```

---

## Requirements

- Python 3.12+
- PostgreSQL 15+

---

## Local Setup

### 1. Clone and enter the directory

```bash
git clone <repo-url>
cd auth-backend
```

### 2. Create a virtual environment

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

```bash
cp .env.example .env
# Edit .env and fill in all required values
```

### 5. Apply the database schema

Run the SQL from `schema.sql` against your PostgreSQL instance:

```bash
psql -U <user> -d auth_db -f schema.sql
```

### 6. Start the development server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

---

## Docker

Build and run the container directly:

```bash
docker build -t auth-backend .
docker run --env-file .env -p 8000:8000 auth-backend
```

Or use Docker Compose from the repository root (recommended — starts both the backend and a PostgreSQL database):

```bash
docker compose up --build
```

---

## Running Tests

```bash
pytest
```

Tests cover: register → login → refresh → forgot-password → reset-password → logout, plus negative cases (duplicate email, weak password, password mismatch, expired token, invalid token).

---

## Environment Variables

All variables are loaded from `.env` (or the real environment). Copy `.env.example` to `.env` and fill in every value before starting the server.

### Database

| Variable       | Description                                              | Example                                               |
|----------------|----------------------------------------------------------|-------------------------------------------------------|
| `DATABASE_URL` | Full SQLAlchemy connection URL for PostgreSQL via psycopg | `postgresql+psycopg://user:password@localhost:5432/auth_db` |

### JWT

| Variable                        | Description                                              | Default  |
|---------------------------------|----------------------------------------------------------|----------|
| `JWT_SECRET_KEY`                | Long random secret used to sign JWTs. **Change this.**   | —        |
| `JWT_ALGORITHM`                 | Signing algorithm                                        | `HS256`  |
| `JWT_ACCESS_TOKEN_TTL_MINUTES`  | Lifetime of an access token in minutes                   | `15`     |

### Password Hashing

| Variable         | Description                              | Default |
|------------------|------------------------------------------|---------|
| `BCRYPT_ROUNDS`  | bcrypt cost factor (minimum 12)          | `12`    |

### Password Reset

| Variable                   | Description                                            | Default |
|----------------------------|--------------------------------------------------------|---------|
| `RESET_TOKEN_TTL_MINUTES`  | Lifetime of a password-reset token in minutes          | `60`    |

### Refresh Tokens

| Variable                             | Description                                                           | Default |
|--------------------------------------|-----------------------------------------------------------------------|---------|
| `REFRESH_TOKEN_TTL_DAYS`             | Lifetime of a standard refresh token in days                          | `7`     |
| `REFRESH_TOKEN_TTL_REMEMBER_ME_DAYS` | Lifetime of a remember-me refresh token in days                       | `30`    |

### SMTP (Password Reset Emails)

| Variable         | Description                                   | Example                    |
|------------------|-----------------------------------------------|----------------------------|
| `SMTP_HOST`      | SMTP server hostname                          | `smtp.example.com`         |
| `SMTP_PORT`      | SMTP server port                              | `587`                      |
| `SMTP_USERNAME`  | SMTP authentication username                  | `no-reply@example.com`     |
| `SMTP_PASSWORD`  | SMTP authentication password                  | `smtp-password`            |
| `SMTP_FROM`      | Sender address used in outgoing emails        | `no-reply@example.com`     |
| `SMTP_USE_TLS`   | Whether to use STARTTLS (`true` / `false`)    | `true`                     |

### Rate Limiting

| Variable                                  | Description                                                      | Default |
|-------------------------------------------|------------------------------------------------------------------|---------|
| `RATE_LIMIT_LOGIN_REQUESTS`               | Maximum login attempts per window                                | `10`    |
| `RATE_LIMIT_LOGIN_WINDOW_SECONDS`         | Rolling window size for login rate limit in seconds              | `60`    |
| `RATE_LIMIT_FORGOT_PASSWORD_REQUESTS`     | Maximum forgot-password attempts per window                      | `5`     |
| `RATE_LIMIT_FORGOT_PASSWORD_WINDOW_SECONDS` | Rolling window size for forgot-password rate limit in seconds  | `60`    |

### Application

| Variable       | Description                                                        | Example                    |
|----------------|--------------------------------------------------------------------|----------------------------|
| `APP_BASE_URL` | Public base URL of the frontend app (used in reset-password links) | `http://localhost:3000`    |
| `CORS_ORIGIN`  | Allowed CORS origin for the frontend                               | `http://localhost:3000`    |

---

## Security Notes

- Passwords are hashed with bcrypt using at least `BCRYPT_ROUNDS=12` rounds. Plaintext passwords are never logged or stored.
- Password-reset tokens and refresh tokens are stored as SHA-256 hashes. The raw token is sent only once (via email or response) and never persisted.
- Login and forgot-password responses are enumeration-resistant: the same message is returned regardless of whether the email exists.
- Refresh tokens rotate on every use. The old token is revoked immediately.
- Set `JWT_SECRET_KEY` to a cryptographically random value of at least 32 bytes in production.
