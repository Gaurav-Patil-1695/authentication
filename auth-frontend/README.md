# auth-frontend

React + TypeScript frontend for the Auth Starter project. Provides login, registration, password reset, and profile screens backed by the `auth-backend` FastAPI service.

---

## Tech stack

| Tool | Version |
|---|---|
| React | 18 |
| TypeScript | 5 |
| Vite | 5 |
| React Router | 6 |
| Vitest | 1 |

---

## Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- The `auth-backend` service running (default: `http://localhost:8000`)

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy the example env file and fill in values
cp .env.example .env

# 3. Start the development server
npm run dev
```

The dev server starts at `http://localhost:5173` by default.

API requests to `/api/v1/*` are proxied to the backend URL configured in `vite.config.ts` (defaults to `http://localhost:8000`), so no CORS configuration is needed during local development.

---

## Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite development server with HMR |
| `npm run build` | Type-check with `tsc` then produce a production build in `dist/` |
| `npm run test` | Run the Vitest test suite once |
| `npm run lint` | Run ESLint across `src/` (zero warnings policy) |

---

## Environment variables

All variables exposed to the browser must be prefixed with `VITE_`. Copy `.env.example` to `.env` and set each value before starting the app.

### `.env.example` reference

```dotenv
# Base URL for the backend API
# Used by the API client in src/api/auth.ts when Vite's dev proxy is not in use
# (e.g. in production builds or Docker deployments).
VITE_API_BASE_URL=http://localhost:8000
```

| Variable | Required | Default (example) | Description |
|---|---|---|---|
| `VITE_API_BASE_URL` | Yes | `http://localhost:8000` | Full origin of the `auth-backend` service. In development the Vite proxy rewrites `/api/v1` requests to this origin automatically. In production this value is embedded into the built bundle and must point to the publicly reachable backend. |

> **Never** commit a `.env` file containing real secrets to version control. The `.gitignore` at the repo root excludes `.env` files by default.

---

## Project structure

```
auth-frontend/
├── index.html                  # HTML entry point
├── vite.config.ts              # Vite + proxy configuration
├── tsconfig.json               # TypeScript compiler options
├── package.json
├── .env.example                # Environment variable template
└── src/
    ├── main.tsx                # React tree mount
    ├── App.tsx                 # Router + route guards
    ├── api/
    │   └── auth.ts             # Typed API client (login, register, me, logout, …)
    ├── context/
    │   └── AuthContext.tsx     # AuthContext + AuthProvider
    ├── hooks/
    │   └── useAuthForm.ts      # Controlled-form + client-side validation hook
    ├── components/             # Shared UI primitives
    ├── features/
    │   └── auth/
    │       └── pages/
    │           ├── LoginPage.tsx
    │           ├── RegisterPage.tsx
    │           ├── ForgotPasswordPage.tsx
    │           └── ResetPasswordPage.tsx
    ├── pages/
    │   └── ProfilePage.tsx
    └── styles/
        └── tokens.css          # CSS custom properties from design tokens
```

---

## Authentication flow

1. **Register** — `POST /auth/register` — creates a new account with `full_name`, `email`, `password`, and `confirm_password`.
2. **Login** — `POST /auth/login` — returns a short-lived JWT access token and sets an httpOnly refresh-token cookie.
3. **Refresh** — `POST /auth/refresh` — silently rotates the access token using the refresh-token cookie.
4. **Forgot password** — `POST /auth/forgot-password` — sends a reset link to the supplied email address (response is identical regardless of whether the address exists).
5. **Reset password** — `POST /auth/reset-password` — consumes the one-time token from the reset link and sets a new password.
6. **Logout** — `POST /auth/logout` — revokes the refresh token and clears auth state.
7. **Profile** — `GET /auth/me` — returns the currently authenticated user; protected by `<RequireAuth>`.

---

## Route guards

| Component | Behaviour |
|---|---|
| `<RequireAuth>` | Redirects unauthenticated visitors to `/login` |
| `<RequireGuest>` | Redirects already-authenticated users to `/profile` |

---

## Password policy

Client-side validation mirrors the server rules exactly:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

Special characters are **not** required.

---

## Running with Docker

See the root `docker-compose.yml` for the full stack setup. The frontend service builds the static bundle and serves it via a lightweight HTTP server. Set `VITE_API_BASE_URL` to the backend service's public URL before building.

```bash
# From the repo root
docker compose up --build
```

---

## Linting and type-checking

```bash
# Lint (zero warnings)
npm run lint

# Type-check without emitting
npx tsc --noEmit
```

---

## Testing

```bash
npm run test
```

Tests cover:

- Client-side validation rules (exact error messages)
- Route guard behaviour (`<RequireAuth>`, `<RequireGuest>`)
