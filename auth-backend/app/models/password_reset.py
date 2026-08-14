from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID


@dataclass
class PasswordReset:
    id: UUID
    user_id: UUID
    token_hash: str
    expires_at: datetime
    used_at: Optional[datetime]
    created_at: datetime
