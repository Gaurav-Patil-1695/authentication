// Client-side mirror of validation-rules.md
// Rule order and exact messages match the server authoritative rules.
// Password policy: min 8 chars, uppercase, lowercase, number; special character NOT required.

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export interface PasswordStrength {
  score: number; // 0-4, one point per passing rule
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  minLength: boolean;
}

// ---------------------------------------------------------------------------
// Individual field validators
// ---------------------------------------------------------------------------

export function validateFullName(value: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, message: 'Full name is required.' };
  }
  if (value.trim().length < 2) {
    return { valid: false, message: 'Full name must be at least 2 characters.' };
  }
  if (value.trim().length > 100) {
    return { valid: false, message: 'Full name must not exceed 100 characters.' };
  }
  return { valid: true };
}

export function validateEmail(value: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, message: 'Email is required.' };
  }
  // RFC-5322 simplified pattern
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(value.trim())) {
    return { valid: false, message: 'Enter a valid email address.' };
  }
  return { valid: true };
}

export function validatePassword(value: string): ValidationResult {
  if (!value || value.length === 0) {
    return { valid: false, message: 'Password is required.' };
  }
  if (value.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters.' };
  }
  if (!/[A-Z]/.test(value)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(value)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(value)) {
    return { valid: false, message: 'Password must contain at least one number.' };
  }
  return { valid: true };
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string,
): ValidationResult {
  if (!confirmPassword || confirmPassword.length === 0) {
    return { valid: false, message: 'Please confirm your password.' };
  }
  if (password !== confirmPassword) {
    return { valid: false, message: 'Passwords do not match.' };
  }
  return { valid: true };
}

export function validateTerms(accepted: boolean): ValidationResult {
  if (!accepted) {
    return { valid: false, message: 'You must accept the terms and conditions.' };
  }
  return { valid: true };
}

export function validateLoginEmail(value: string): ValidationResult {
  return validateEmail(value);
}

export function validateLoginPassword(value: string): ValidationResult {
  if (!value || value.length === 0) {
    return { valid: false, message: 'Password is required.' };
  }
  return { valid: true };
}

export function validateResetToken(value: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { valid: false, message: 'Reset token is required.' };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Password strength checker (4 active rules; special char NOT required)
// ---------------------------------------------------------------------------

export function checkPasswordStrength(value: string): PasswordStrength {
  const minLength = value.length >= 8;
  const uppercase = /[A-Z]/.test(value);
  const lowercase = /[a-z]/.test(value);
  const number = /[0-9]/.test(value);

  const score = [minLength, uppercase, lowercase, number].filter(Boolean).length;

  return { score, uppercase, lowercase, number, minLength };
}

// ---------------------------------------------------------------------------
// Form-level validators (return a map of field -> message or undefined)
// ---------------------------------------------------------------------------

export interface RegisterFormErrors {
  full_name?: string;
  email?: string;
  password?: string;
  confirm_password?: string;
  terms?: string;
}

export function validateRegisterForm(fields: {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  terms: boolean;
}): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  const fullNameResult = validateFullName(fields.full_name);
  if (!fullNameResult.valid) errors.full_name = fullNameResult.message;

  const emailResult = validateEmail(fields.email);
  if (!emailResult.valid) errors.email = emailResult.message;

  const passwordResult = validatePassword(fields.password);
  if (!passwordResult.valid) errors.password = passwordResult.message;

  const confirmResult = validateConfirmPassword(fields.password, fields.confirm_password);
  if (!confirmResult.valid) errors.confirm_password = confirmResult.message;

  const termsResult = validateTerms(fields.terms);
  if (!termsResult.valid) errors.terms = termsResult.message;

  return errors;
}

export interface LoginFormErrors {
  email?: string;
  password?: string;
}

export function validateLoginForm(fields: {
  email: string;
  password: string;
}): LoginFormErrors {
  const errors: LoginFormErrors = {};

  const emailResult = validateLoginEmail(fields.email);
  if (!emailResult.valid) errors.email = emailResult.message;

  const passwordResult = validateLoginPassword(fields.password);
  if (!passwordResult.valid) errors.password = passwordResult.message;

  return errors;
}

export interface ForgotPasswordFormErrors {
  email?: string;
}

export function validateForgotPasswordForm(fields: {
  email: string;
}): ForgotPasswordFormErrors {
  const errors: ForgotPasswordFormErrors = {};

  const emailResult = validateEmail(fields.email);
  if (!emailResult.valid) errors.email = emailResult.message;

  return errors;
}

export interface ResetPasswordFormErrors {
  password?: string;
  confirm_password?: string;
}

export function validateResetPasswordForm(fields: {
  password: string;
  confirm_password: string;
}): ResetPasswordFormErrors {
  const errors: ResetPasswordFormErrors = {};

  const passwordResult = validatePassword(fields.password);
  if (!passwordResult.valid) errors.password = passwordResult.message;

  const confirmResult = validateConfirmPassword(fields.password, fields.confirm_password);
  if (!confirmResult.valid) errors.confirm_password = confirmResult.message;

  return errors;
}

// ---------------------------------------------------------------------------
// Utility: check if a form-errors object has any errors
// ---------------------------------------------------------------------------

export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some((v) => v !== undefined);
}
