from __future__ import annotations

import re
from typing import Any


# ---------------------------------------------------------------------------
# Password policy constants (mirrored from capabilities.yaml)
# ---------------------------------------------------------------------------

PASSWORD_MIN_LENGTH = 8
PASSWORD_REQUIRE_UPPERCASE = True
PASSWORD_REQUIRE_LOWERCASE = True
PASSWORD_REQUIRE_NUMBER = True
PASSWORD_REQUIRE_SPECIAL = False  # require_special_character=false


# ---------------------------------------------------------------------------
# Individual rule checkers
# ---------------------------------------------------------------------------


def _has_min_length(password: str) -> bool:
    return len(password) >= PASSWORD_MIN_LENGTH


def _has_uppercase(password: str) -> bool:
    return bool(re.search(r"[A-Z]", password))


def _has_lowercase(password: str) -> bool:
    return bool(re.search(r"[a-z]", password))


def _has_number(password: str) -> bool:
    return bool(re.search(r"[0-9]", password))


# ---------------------------------------------------------------------------
# Validation error collection helpers
# ---------------------------------------------------------------------------

PASSWORD_RULES = [
    (_has_min_length, "Password must be at least 8 characters."),
    (_has_uppercase, "Password must contain at least one uppercase letter."),
    (_has_lowercase, "Password must contain at least one lowercase letter."),
    (_has_number, "Password must contain at least one number."),
]


class ValidationError(Exception):
    """Raised when one or more field validations fail."""

    def __init__(self, errors: list[dict[str, Any]]) -> None:
        self.errors = errors
        super().__init__(str(errors))


# ---------------------------------------------------------------------------
# Field validators — messages VERBATIM from validation-rules.md
# ---------------------------------------------------------------------------


def validate_full_name(full_name: str | None) -> list[str]:
    """Return a list of error messages for the full_name field."""
    errors: list[str] = []
    if not full_name or not full_name.strip():
        errors.append("Full name is required.")
        return errors
    if len(full_name.strip()) < 2:
        errors.append("Full name must be at least 2 characters.")
    if len(full_name.strip()) > 100:
        errors.append("Full name must be at most 100 characters.")
    return errors


def validate_email(email: str | None) -> list[str]:
    """Return a list of error messages for the email field."""
    errors: list[str] = []
    if not email or not email.strip():
        errors.append("Email is required.")
        return errors
    # Basic RFC-compliant-enough pattern
    pattern = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    if not re.match(pattern, email.strip()):
        errors.append("Enter a valid email address.")
    if len(email.strip()) > 254:
        errors.append("Email must be at most 254 characters.")
    return errors


def validate_password(password: str | None) -> list[str]:
    """
    Validate the password against the active policy rules.
    Rules are checked in the order defined in validation-rules.md;
    messages are copied VERBATIM.
    """
    errors: list[str] = []
    if not password:
        errors.append("Password is required.")
        return errors
    if not _has_min_length(password):
        errors.append("Password must be at least 8 characters.")
    if PASSWORD_REQUIRE_UPPERCASE and not _has_uppercase(password):
        errors.append("Password must contain at least one uppercase letter.")
    if PASSWORD_REQUIRE_LOWERCASE and not _has_lowercase(password):
        errors.append("Password must contain at least one lowercase letter.")
    if PASSWORD_REQUIRE_NUMBER and not _has_number(password):
        errors.append("Password must contain at least one number.")
    # special character rule is disabled (require_special_character=false)
    return errors


def validate_confirm_password(
    password: str | None, confirm_password: str | None
) -> list[str]:
    """Return a list of error messages for the confirm_password field."""
    errors: list[str] = []
    if not confirm_password:
        errors.append("Please confirm your password.")
        return errors
    if password != confirm_password:
        errors.append("Passwords do not match.")
    return errors


def validate_terms_accepted(terms_accepted: bool | None) -> list[str]:
    """Return a list of error messages for the terms_accepted field."""
    errors: list[str] = []
    if not terms_accepted:
        errors.append("You must accept the terms and conditions.")
    return errors


# ---------------------------------------------------------------------------
# Composite validators for each endpoint payload
# ---------------------------------------------------------------------------


def validate_register_payload(
    *,
    full_name: str | None,
    email: str | None,
    password: str | None,
    confirm_password: str | None,
    terms_accepted: bool | None,
) -> dict[str, list[str]]:
    """
    Run all registration field validators and return a mapping of
    field name -> list of error messages.  Empty dict means no errors.
    """
    result: dict[str, list[str]] = {}

    fn_errors = validate_full_name(full_name)
    if fn_errors:
        result["fullName"] = fn_errors

    em_errors = validate_email(email)
    if em_errors:
        result["email"] = em_errors

    pw_errors = validate_password(password)
    if pw_errors:
        result["password"] = pw_errors

    cpw_errors = validate_confirm_password(password, confirm_password)
    if cpw_errors:
        result["confirmPassword"] = cpw_errors

    ta_errors = validate_terms_accepted(terms_accepted)
    if ta_errors:
        result["termsAccepted"] = ta_errors

    return result


def validate_login_payload(
    *,
    email: str | None,
    password: str | None,
) -> dict[str, list[str]]:
    """
    Run field validators for the login payload.
    Note: login uses a generic error message for security; individual
    field errors are only surfaced for obviously missing values.
    """
    result: dict[str, list[str]] = {}

    if not email or not email.strip():
        result["email"] = ["Email is required."]

    if not password:
        result["password"] = ["Password is required."]

    return result


def validate_forgot_password_payload(
    *,
    email: str | None,
) -> dict[str, list[str]]:
    """Run field validators for the forgot-password payload."""
    result: dict[str, list[str]] = {}

    em_errors = validate_email(email)
    if em_errors:
        result["email"] = em_errors

    return result


def validate_reset_password_payload(
    *,
    token: str | None,
    password: str | None,
    confirm_password: str | None,
) -> dict[str, list[str]]:
    """Run field validators for the reset-password payload."""
    result: dict[str, list[str]] = {}

    if not token or not token.strip():
        result["token"] = ["Reset token is required."]

    pw_errors = validate_password(password)
    if pw_errors:
        result["password"] = pw_errors

    cpw_errors = validate_confirm_password(password, confirm_password)
    if cpw_errors:
        result["confirmPassword"] = cpw_errors

    return result


# ---------------------------------------------------------------------------
# Password strength score (used by the frontend strength meter equivalent)
# ---------------------------------------------------------------------------


def password_strength_score(password: str) -> int:
    """
    Return a score from 0-4 reflecting how many of the four active policy
    rules the password satisfies:
      1 point each for: length >= 8, uppercase, lowercase, number.
    Special character is NOT counted (require_special_character=false).
    """
    score = 0
    if _has_min_length(password):
        score += 1
    if _has_uppercase(password):
        score += 1
    if _has_lowercase(password):
        score += 1
    if _has_number(password):
        score += 1
    return score
