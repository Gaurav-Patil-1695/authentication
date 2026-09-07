import React, { useState, useId } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../../../../api/auth';

interface LoginFormState {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface LoginFormErrors {
  email?: string;
  password?: string;
  form?: string;
}

function validate(values: LoginFormState): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (!values.email || values.email.trim() === '') {
    errors.email = 'Enter a valid email address.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!values.password || values.password.length < 1) {
    errors.password = 'Password is required.';
  }

  return errors;
}

export default function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const emailId = useId();
  const passwordId = useId();
  const rememberMeId = useId();
  const emailErrorId = useId();
  const passwordErrorId = useId();
  const formErrorId = useId();

  const [values, setValues] = useState<LoginFormState>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setValues((prev) => ({ ...prev, email: e.target.value }));
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setValues((prev) => ({ ...prev, password: e.target.value }));
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
  }

  function handleRememberMeChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setValues((prev) => ({ ...prev, rememberMe: e.target.checked }));
  }

  function handleTogglePassword(): void {
    setShowPassword((prev) => !prev);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const validationErrors = validate(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);
    try {
      await login({
        email: values.email.trim(),
        password: values.password,
        rememberMe: values.rememberMe,
      });
      navigate('/');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Invalid email or password.';
      setErrors({ form: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <div className="auth-layout__branding">
        <span className="auth-layout__logo" aria-hidden="true">&#9679;</span>
        <span className="auth-layout__brand-name">auth-starter</span>
      </div>

      <form
        className="auth-card"
        aria-labelledby="login-title"
        onSubmit={handleSubmit}
        noValidate
      >
        <h1 className="auth-card__title" id="login-title">
          Sign in
        </h1>

        {errors.form && (
          <div
            id={formErrorId}
            className="auth-card__banner auth-card__banner--error"
            role="alert"
            aria-live="polite"
          >
            {errors.form}
          </div>
        )}

        <div className="auth-card__field">
          <label className="auth-card__label" htmlFor={emailId}>
            Email address
          </label>
          <input
            id={emailId}
            className={`auth-card__input${errors.email ? ' auth-card__input--error' : ''}`}
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={handleEmailChange}
            aria-describedby={errors.email ? emailErrorId : undefined}
            aria-invalid={errors.email ? 'true' : 'false'}
            disabled={isSubmitting}
            required
          />
          {errors.email && (
            <span
              id={emailErrorId}
              className="auth-card__field-error field--error"
              role="alert"
            >
              {errors.email}
            </span>
          )}
        </div>

        <div className="auth-card__field">
          <div className="auth-card__label-row">
            <label className="auth-card__label" htmlFor={passwordId}>
              Password
            </label>
            <Link className="link auth-card__forgot" to="/forgot-password">
              Forgot password?
            </Link>
          </div>
          <div className="auth-card__input-wrapper">
            <input
              id={passwordId}
              className={`auth-card__input${errors.password ? ' auth-card__input--error' : ''}`}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={values.password}
              onChange={handlePasswordChange}
              aria-describedby={errors.password ? passwordErrorId : undefined}
              aria-invalid={errors.password ? 'true' : 'false'}
              disabled={isSubmitting}
              required
            />
            <button
              type="button"
              className="auth-card__password-toggle"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={handleTogglePassword}
              tabIndex={0}
            >
              {showPassword ? '\uD83D\uDE48' : '\uD83D\uDC41'}
            </button>
          </div>
          {errors.password && (
            <span
              id={passwordErrorId}
              className="auth-card__field-error field--error"
              role="alert"
            >
              {errors.password}
            </span>
          )}
        </div>

        <div className="auth-card__field auth-card__field--checkbox">
          <input
            id={rememberMeId}
            className="auth-card__checkbox"
            type="checkbox"
            checked={values.rememberMe}
            onChange={handleRememberMeChange}
            disabled={isSubmitting}
          />
          <label className="auth-card__label auth-card__label--checkbox" htmlFor={rememberMeId}>
            Remember me
          </label>
        </div>

        <button
          className="btn btn--primary auth-card__submit"
          type="submit"
          disabled={isSubmitting}
          aria-busy={isSubmitting ? 'true' : 'false'}
        >
          {isSubmitting ? (
            <>
              <span className="btn__spinner" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </button>

        <p className="auth-card__footer">
          Don&apos;t have an account?{' '}
          <Link className="link" to="/register">
            Create account
          </Link>
        </p>
      </form>

      <style>{`
        :root {
          --color-accent-disabled: #c7d2fe;
          --color-accent-primary: #4f46e5;
          --color-accent-primary-active: #3730a3;
          --color-accent-primary-hover: #4338ca;
          --color-bg-app: #f1f5f9;
          --color-border: #E2E8F0;
          --color-border-strong: #CBD5E1;
          --color-error: #DC2626;
          --color-focus-ring: #818cf8;
          --color-info: #2563EB;
          --color-link: #4f46e5;
          --color-muted-surface: #f8fafc;
          --color-success: #16A34A;
          --color-surface: #FFFFFF;
          --color-text-muted: #94A3B8;
          --color-text-primary: #0F172A;
          --color-text-secondary: #475569;
          --color-warning: #D97706;
          --elevation-1: 0 1px 2px rgba(15,23,42,0.06);
          --elevation-2: 0 4px 12px rgba(15,23,42,0.08);
          --elevation-card: 0 12px 32px rgba(15,23,42,0.12);
          --elevation-focus: 0 0 0 3px rgba(129,140,248,0.45);
          --family-base: Inter, 'Segoe UI', system-ui, -apple-system, sans-serif;
          --radius-button: 8px;
          --radius-card: 16px;
          --radius-input: 8px;
          --space-xs: 4px;
          --space-sm: 8px;
          --space-md: 16px;
          --space-lg: 24px;
          --space-xl: 32px;
          --space-2xl: 48px;
        }

        *, *::before, *::after {
          box-sizing: border-box;
        }

        .auth-layout {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background-color: var(--color-bg-app);
          font-family: var(--family-base);
          padding: var(--space-md);
        }

        .auth-layout__branding {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-lg);
          color: var(--color-accent-primary);
          font-size: 18px;
          font-weight: 600;
          line-height: 1.25;
        }

        .auth-layout__logo {
          font-size: 20px;
        }

        .auth-layout__brand-name {
          color: var(--color-text-primary);
        }

        .auth-card {
          background-color: var(--color-surface);
          border-radius: var(--radius-card);
          box-shadow: var(--elevation-card);
          padding: var(--space-xl);
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }

        .auth-card__title {
          font-size: 30px;
          font-weight: 700;
          line-height: 1.2;
          color: var(--color-text-primary);
          margin: 0 0 var(--space-xs);
        }

        .auth-card__banner {
          padding: var(--space-sm) var(--space-md);
          border-radius: var(--radius-input);
          font-size: 14px;
          font-weight: 500;
          line-height: 1.5;
        }

        .auth-card__banner--error {
          background-color: #fef2f2;
          color: var(--color-error);
          border: 1px solid #fecaca;
        }

        .auth-card__field {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .auth-card__field--checkbox {
          flex-direction: row;
          align-items: center;
          gap: var(--space-sm);
        }

        .auth-card__label-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }

        .auth-card__label {
          font-size: 14px;
          font-weight: 500;
          line-height: 1.5;
          color: var(--color-text-secondary);
        }

        .auth-card__label--checkbox {
          cursor: pointer;
          color: var(--color-text-secondary);
        }

        .auth-card__forgot {
          font-size: 14px;
          font-weight: 500;
        }

        .auth-card__input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .auth-card__input {
          width: 100%;
          padding: var(--space-sm) var(--space-md);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-input);
          font-size: 16px;
          font-family: var(--family-base);
          color: var(--color-text-primary);
          background-color: var(--color-surface);
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .auth-card__input-wrapper .auth-card__input {
          padding-right: 44px;
        }

        .auth-card__input:focus {
          border-color: var(--color-accent-primary);
          box-shadow: var(--elevation-focus);
        }

        .auth-card__input--error {
          border-color: var(--color-error);
        }

        .auth-card__input--error:focus {
          box-shadow: 0 0 0 3px rgba(220,38,38,0.25);
        }

        .auth-card__input:disabled {
          background-color: var(--color-muted-surface);
          color: var(--color-text-muted);
          cursor: not-allowed;
        }

        .auth-card__password-toggle {
          position: absolute;
          right: var(--space-sm);
          background: none;
          border: none;
          cursor: pointer;
          padding: var(--space-xs);
          font-size: 18px;
          line-height: 1;
          color: var(--color-text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-button);
          transition: color 0.15s ease;
        }

        .auth-card__password-toggle:hover {
          color: var(--color-text-secondary);
        }

        .auth-card__password-toggle:focus-visible {
          outline: 2px solid var(--color-focus-ring);
          outline-offset: 2px;
        }

        .auth-card__checkbox {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: var(--color-accent-primary);
          flex-shrink: 0;
        }

        .auth-card__field-error {
          font-size: 12px;
          line-height: 1.5;
          color: var(--color-error);
        }

        .field--error {
          color: var(--color-error);
        }

        .auth-card__submit {
          margin-top: var(--space-xs);
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-sm);
          padding: var(--space-sm) var(--space-lg);
          border-radius: var(--radius-button);
          font-size: 16px;
          font-weight: 500;
          font-family: var(--family-base);
          line-height: 1.5;
          cursor: pointer;
          border: none;
          transition: background-color 0.15s ease, box-shadow 0.15s ease;
          width: 100%;
        }

        .btn--primary {
          background-color: var(--color-accent-primary);
          color: #ffffff;
        }

        .btn--primary:hover:not(:disabled) {
          background-color: var(--color-accent-primary-hover);
        }

        .btn--primary:active:not(:disabled) {
          background-color: var(--color-accent-primary-active);
        }

        .btn--primary:focus-visible {
          outline: none;
          box-shadow: var(--elevation-focus);
        }

        .btn--primary:disabled {
          background-color: var(--color-accent-disabled);
          cursor: not-allowed;
        }

        .btn__spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .auth-card__footer {
          font-size: 14px;
          font-weight: 400;
          line-height: 1.5;
          color: var(--color-text-secondary);
          text-align: center;
          margin: 0;
        }

        .link {
          color: var(--color-link);
          text-decoration: none;
          font-weight: 500;
        }

        .link:hover {
          text-decoration: underline;
        }

        .link:focus-visible {
          outline: 2px solid var(--color-focus-ring);
          outline-offset: 2px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}
