import React, { useState } from 'react';
import { forgotPassword } from '../../../api/auth';

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

  .forgot-password-layout {
    min-height: 100vh;
    background-color: var(--color-bg-app);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: var(--family-base);
    padding: var(--space-md);
  }

  .forgot-password-layout__branding {
    margin-bottom: var(--space-lg);
    text-align: center;
  }

  .forgot-password-layout__logo {
    font-size: 30px;
    font-weight: 700;
    color: var(--color-accent-primary);
    line-height: 1.2;
  }

  .forgot-password-layout__tagline {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-top: var(--space-xs);
  }

  .auth-card {
    background-color: var(--color-surface);
    border-radius: var(--radius-card);
    box-shadow: var(--elevation-card);
    padding: var(--space-2xl);
    width: 100%;
    max-width: 400px;
  }

  .auth-card__title {
    font-size: 30px;
    font-weight: 700;
    color: var(--color-text-primary);
    line-height: 1.2;
    margin: 0 0 var(--space-sm) 0;
  }

  .auth-card__subtitle {
    font-size: 14px;
    font-weight: 400;
    color: var(--color-text-secondary);
    line-height: 1.5;
    margin: 0 0 var(--space-xl) 0;
  }

  .auth-card__field {
    margin-bottom: var(--space-md);
    display: flex;
    flex-direction: column;
  }

  .auth-card__label {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-primary);
    margin-bottom: var(--space-xs);
  }

  .auth-card__input {
    font-family: var(--family-base);
    font-size: 16px;
    font-weight: 400;
    line-height: 1.5;
    color: var(--color-text-primary);
    background-color: var(--color-surface);
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-input);
    padding: var(--space-sm) var(--space-md);
    width: 100%;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .auth-card__input:focus {
    border-color: var(--color-accent-primary);
    box-shadow: var(--elevation-focus);
  }

  .auth-card__input.field--error {
    border-color: var(--color-error);
  }

  .auth-card__error {
    font-size: 12px;
    font-weight: 400;
    color: var(--color-error);
    line-height: 1.5;
    margin-top: var(--space-xs);
  }

  .auth-card__submit {
    font-family: var(--family-base);
    font-size: 16px;
    font-weight: 600;
    color: var(--color-surface);
    background-color: var(--color-accent-primary);
    border: none;
    border-radius: var(--radius-button);
    padding: var(--space-sm) var(--space-md);
    width: 100%;
    cursor: pointer;
    transition: background-color 0.15s;
    margin-top: var(--space-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    min-height: 44px;
  }

  .auth-card__submit:hover:not(:disabled) {
    background-color: var(--color-accent-primary-hover);
  }

  .auth-card__submit:active:not(:disabled) {
    background-color: var(--color-accent-primary-active);
  }

  .auth-card__submit:disabled {
    background-color: var(--color-accent-disabled);
    cursor: not-allowed;
  }

  .auth-card__spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    display: inline-block;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .auth-card__banner {
    border-radius: var(--radius-input);
    padding: var(--space-sm) var(--space-md);
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
    margin-bottom: var(--space-md);
  }

  .auth-card__banner--success {
    background-color: #f0fdf4;
    color: var(--color-success);
    border: 1px solid #bbf7d0;
  }

  .auth-card__banner--error {
    background-color: #fef2f2;
    color: var(--color-error);
    border: 1px solid #fecaca;
  }

  .auth-card__footer {
    margin-top: var(--space-lg);
    text-align: center;
    font-size: 14px;
    font-weight: 500;
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
`;

function validateEmail(value: string): string {
  if (!value.trim()) {
    return 'Email is required.';
  }
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(value.trim())) {
    return 'Enter a valid email address.';
  }
  return '';
}

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [bannerError, setBannerError] = useState('');

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) {
      setEmailError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccessMessage('');
    setBannerError('');

    const err = validateEmail(email);
    if (err) {
      setEmailError(err);
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPassword({ email: email.trim() });
      setSuccessMessage(
        'If that email is registered, you will receive a password reset link shortly.'
      );
      setEmail('');
    } catch {
      setBannerError(
        'Something went wrong. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const emailFieldId = 'forgot-email';
  const emailErrorId = 'forgot-email-error';
  const bannerId = 'forgot-banner';

  return (
    <>
      <style>{styles}</style>
      <div className="forgot-password-layout">
        <div className="forgot-password-layout__branding" aria-label="AuthStarter">
          <div className="forgot-password-layout__logo">AuthStarter</div>
          <div className="forgot-password-layout__tagline">Secure authentication, simplified.</div>
        </div>

        <div className="auth-card" role="main">
          <h1 className="auth-card__title">Forgot password</h1>
          <p className="auth-card__subtitle">
            Enter your email address and we&rsquo;ll send you a link to reset your password.
          </p>

          <div aria-live="polite" aria-atomic="true">
            {successMessage && (
              <div
                id={bannerId}
                className="auth-card__banner auth-card__banner--success"
                role="status"
              >
                {successMessage}
              </div>
            )}
            {bannerError && (
              <div
                id={bannerId}
                className="auth-card__banner auth-card__banner--error"
                role="alert"
              >
                {bannerError}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-card__field">
              <label className="auth-card__label" htmlFor={emailFieldId}>
                Email address
              </label>
              <input
                id={emailFieldId}
                type="email"
                className={`auth-card__input${emailError ? ' field--error' : ''}`}
                value={email}
                onChange={handleEmailChange}
                autoComplete="email"
                aria-describedby={emailError ? emailErrorId : undefined}
                aria-invalid={emailError ? 'true' : 'false'}
                disabled={isSubmitting}
                placeholder="you@example.com"
              />
              {emailError && (
                <span id={emailErrorId} className="auth-card__error" role="alert">
                  {emailError}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="auth-card__submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting && (
                <span className="auth-card__spinner" aria-hidden="true" />
              )}
              {isSubmitting ? 'Sending...' : 'Send reset link'}
            </button>
          </form>

          <div className="auth-card__footer">
            Remember your password?{' '}
            <a href="/login" className="auth-card__link">
              Sign in
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default ForgotPasswordPage;
