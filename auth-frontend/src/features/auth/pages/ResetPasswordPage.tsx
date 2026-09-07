import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../../../api/auth';

const styles = `
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

  .reset-password-app {
    min-height: 100vh;
    background-color: var(--color-bg-app);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: var(--family-base);
    color: var(--color-text-primary);
    padding: var(--space-md);
  }

  .reset-password-app__branding {
    margin-bottom: var(--space-lg);
    text-align: center;
  }

  .reset-password-app__logo {
    font-size: 30px;
    font-weight: 700;
    color: var(--color-accent-primary);
    line-height: 1.2;
  }

  .reset-password-app__tagline {
    font-size: 14px;
    color: var(--color-text-secondary);
    margin-top: var(--space-xs);
  }

  .auth-card {
    background: var(--color-surface);
    border-radius: var(--radius-card);
    box-shadow: var(--elevation-card);
    padding: var(--space-xl);
    width: 100%;
    max-width: 420px;
  }

  .auth-card__title {
    font-size: 30px;
    font-weight: 700;
    line-height: 1.2;
    color: var(--color-text-primary);
    margin: 0 0 var(--space-xs) 0;
  }

  .auth-card__subtitle {
    font-size: 14px;
    font-weight: 400;
    line-height: 1.5;
    color: var(--color-text-secondary);
    margin: 0 0 var(--space-xl) 0;
  }

  .auth-card__field {
    margin-bottom: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .auth-card__label {
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
    color: var(--color-text-primary);
  }

  .auth-card__input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .auth-card__input {
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    padding-right: 44px;
    font-size: 16px;
    font-family: var(--family-base);
    line-height: 1.5;
    color: var(--color-text-primary);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-input);
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .auth-card__input:focus {
    border-color: var(--color-accent-primary);
    box-shadow: var(--elevation-focus);
  }

  .auth-card__input--error {
    border-color: var(--color-error);
  }

  .auth-card__input--error:focus {
    border-color: var(--color-error);
    box-shadow: 0 0 0 3px rgba(220,38,38,0.2);
  }

  .auth-card__toggle {
    position: absolute;
    right: var(--space-sm);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-xs);
    color: var(--color-text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    transition: color 0.15s ease;
  }

  .auth-card__toggle:hover {
    color: var(--color-text-secondary);
  }

  .auth-card__toggle:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 2px;
  }

  .field--error {
    font-size: 12px;
    line-height: 1.5;
    color: var(--color-error);
    margin-top: var(--space-xs);
  }

  .password-strength {
    margin-top: var(--space-xs);
  }

  .password-strength__bar {
    display: flex;
    gap: var(--space-xs);
    margin-bottom: var(--space-xs);
  }

  .password-strength__segment {
    height: 4px;
    flex: 1;
    border-radius: var(--radius-full);
    background: var(--color-border);
    transition: background 0.2s ease;
  }

  .password-strength__segment--active-1 {
    background: var(--color-error);
  }

  .password-strength__segment--active-2 {
    background: var(--color-warning);
  }

  .password-strength__segment--active-3 {
    background: var(--color-info);
  }

  .password-strength__segment--active-4 {
    background: var(--color-success);
  }

  .password-strength__label {
    font-size: 12px;
    line-height: 1.5;
    color: var(--color-text-muted);
  }

  .auth-card__submit {
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    font-size: 16px;
    font-weight: 600;
    font-family: var(--family-base);
    line-height: 1.5;
    color: var(--color-surface);
    background: var(--color-accent-primary);
    border: none;
    border-radius: var(--radius-button);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    margin-top: var(--space-lg);
    transition: background 0.15s ease;
  }

  .auth-card__submit:hover:not(:disabled) {
    background: var(--color-accent-primary-hover);
  }

  .auth-card__submit:active:not(:disabled) {
    background: var(--color-accent-primary-active);
  }

  .auth-card__submit:disabled {
    background: var(--color-accent-disabled);
    cursor: not-allowed;
  }

  .auth-card__submit:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 2px;
  }

  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .auth-card__banner {
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-input);
    font-size: 14px;
    line-height: 1.5;
    margin-bottom: var(--space-md);
  }

  .auth-card__banner--error {
    background: #fef2f2;
    color: var(--color-error);
    border: 1px solid #fecaca;
  }

  .auth-card__banner--success {
    background: #f0fdf4;
    color: var(--color-success);
    border: 1px solid #bbf7d0;
  }

  .auth-card__footer {
    margin-top: var(--space-lg);
    text-align: center;
    font-size: 14px;
    color: var(--color-text-secondary);
  }

  .auth-card__link {
    color: var(--color-link);
    text-decoration: none;
    font-weight: 500;
  }

  .auth-card__link:hover {
    text-decoration: underline;
  }

  .auth-card__link:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 2px;
    border-radius: 2px;
  }
`;

function getPasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  return score;
}

function strengthLabel(score: number): string {
  if (score === 0) return '';
  if (score === 1) return 'Weak';
  if (score === 2) return 'Fair';
  if (score === 3) return 'Good';
  return 'Strong';
}

interface FormState {
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  password?: string;
  confirmPassword?: string;
}

function validate(values: FormState): FormErrors {
  const errors: FormErrors = {};

  if (!values.password) {
    errors.password = 'Password is required.';
  } else if (values.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.';
  } else if (!/[A-Z]/.test(values.password)) {
    errors.password = 'Password must contain at least one uppercase letter.';
  } else if (!/[a-z]/.test(values.password)) {
    errors.password = 'Password must contain at least one lowercase letter.';
  } else if (!/[0-9]/.test(values.password)) {
    errors.password = 'Password must contain at least one number.';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return errors;
}

const EyeIcon: React.FC<{ visible: boolean }> = ({ visible }) =>
  visible ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [values, setValues] = useState<FormState>({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(values.password);

  const handleChange = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...values, [field]: e.target.value };
    setValues(next);
    if (errors[field]) {
      const nextErrors = validate(next);
      setErrors((prev) => ({ ...prev, [field]: nextErrors[field] }));
    }
  };

  const handleBlur = (field: keyof FormState) => () => {
    const nextErrors = validate(values);
    setErrors((prev) => ({ ...prev, [field]: nextErrors[field] }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors = validate(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (!token) {
      setBannerError('Reset token is missing or invalid. Please request a new password reset link.');
      return;
    }

    setIsSubmitting(true);
    setBannerError(null);

    try {
      await resetPassword({ token, password: values.password, confirmPassword: values.confirmPassword });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.';
      setBannerError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="reset-password-app">
        <div className="reset-password-app__branding" aria-label="Auth Starter">
          <div className="reset-password-app__logo">auth-starter</div>
          <div className="reset-password-app__tagline">Secure authentication, out of the box.</div>
        </div>

        <main className="auth-card" role="main">
          <h1 className="auth-card__title">Set new password</h1>
          <p className="auth-card__subtitle">Choose a strong password for your account.</p>

          <div aria-live="polite">
            {bannerError && (
              <div className="auth-card__banner auth-card__banner--error" role="alert">
                {bannerError}
              </div>
            )}
            {success && (
              <div className="auth-card__banner auth-card__banner--success" role="status">
                Your password has been reset. Redirecting you to login…
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-card__field">
              <label className="auth-card__label" htmlFor="password">
                New Password
              </label>
              <div className="auth-card__input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`auth-card__input${errors.password ? ' auth-card__input--error' : ''}`}
                  value={values.password}
                  onChange={handleChange('password')}
                  onBlur={handleBlur('password')}
                  autoComplete="new-password"
                  aria-describedby={errors.password ? 'password-error' : 'password-strength-label'}
                  aria-invalid={Boolean(errors.password)}
                  disabled={isSubmitting || success}
                />
                <button
                  type="button"
                  className="auth-card__toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  <EyeIcon visible={showPassword} />
                </button>
              </div>
              {errors.password && (
                <span id="password-error" className="field--error" role="alert">
                  {errors.password}
                </span>
              )}
              {values.password && (
                <div className="password-strength" aria-label="Password strength">
                  <div className="password-strength__bar" role="presentation">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`password-strength__segment${strength >= i ? ` password-strength__segment--active-${strength}` : ''}`}
                      />
                    ))}
                  </div>
                  <span id="password-strength-label" className="password-strength__label">
                    {strengthLabel(strength)}
                  </span>
                </div>
              )}
            </div>

            <div className="auth-card__field">
              <label className="auth-card__label" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <div className="auth-card__input-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  className={`auth-card__input${errors.confirmPassword ? ' auth-card__input--error' : ''}`}
                  value={values.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  onBlur={handleBlur('confirmPassword')}
                  autoComplete="new-password"
                  aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
                  aria-invalid={Boolean(errors.confirmPassword)}
                  disabled={isSubmitting || success}
                />
                <button
                  type="button"
                  className="auth-card__toggle"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                  tabIndex={0}
                >
                  <EyeIcon visible={showConfirm} />
                </button>
              </div>
              {errors.confirmPassword && (
                <span id="confirmPassword-error" className="field--error" role="alert">
                  {errors.confirmPassword}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="auth-card__submit"
              disabled={isSubmitting || success}
              aria-busy={isSubmitting}
            >
              {isSubmitting && <span className="spinner" aria-hidden="true" />}
              {isSubmitting ? 'Resetting…' : 'Reset Password'}
            </button>
          </form>

          <div className="auth-card__footer">
            <a href="/login" className="auth-card__link">
              Back to sign in
            </a>
          </div>
        </main>
      </div>
    </>
  );
};

export default ResetPasswordPage;
