from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config.settings import settings

# ---------------------------------------------------------------------------
# Shared limiter instance (keyed by client IP)
# ---------------------------------------------------------------------------

limiter = Limiter(key_func=get_remote_address)

# ---------------------------------------------------------------------------
# Named rate-limit strings (NFR-08)
# ---------------------------------------------------------------------------
# These are applied as decorators on the relevant route handlers.
# The actual limits are driven by environment-configurable settings so that
# they can be tightened or relaxed without changing code.

LOGIN_LIMIT: str = settings.LOGIN_RATE_LIMIT
FORGOT_PASSWORD_LIMIT: str = settings.FORGOT_PASSWORD_RATE_LIMIT
