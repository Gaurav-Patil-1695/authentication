import React, { useState, useId } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../../../api/auth';

interface RegisterFormState {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

interface RegisterFormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
  general?: string;
}

function getPasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  return score;
}

function validateForm(values: RegisterFormState): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  if (!values.fullName || values.fullName.trim().length < 1) {
    errors.fullName = 'Full name is required.';
  } else if (values.fullName.trim().length > 120) {
    errors.fullName = 'Full name is required.';
  }

  if (!values.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = 'Enter a valid email address.';
  }

  if (!values.password) {
    errors.password = 'Password must be at least 8 characters.';
  } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(values.password)) {
    errors.password = 'Password must be at least 8 characters.';
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (!values.acceptTerms) {
    errors.acceptTerms = 'You must accept the Terms to continue.';
  }

  return errors;
}

const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColors = ['', 'var(--color-error)', 'var(--color-warning)', 'var(--color-info)', 'var(--color-success)'];

export default function RegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const uid = useId();

  const [values, setValues] = useState<RegisterFormState>({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
  });

  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const passwordStrength = getPasswordStrength(values.password);

  const fullNameId = `${uid}-fullName`;
  const emailId = `${uid}-email`;
  const passwordId = `${uid}-password`;
  const confirmPasswordId = `${uid}-confirmPassword`;
  const acceptTermsId = `${uid}-acceptTerms`;

  const fullNameErrId = `${uid}-fullName-err`;
  const emailErrId = `${uid}-email-err`;
  const passwordErrId = `${uid}-password-err`;
  const confirmPasswordErrId = `${uid}-confirmPassword-err`;
  const acceptTermsErrId = `${uid}-acceptTerms-err`;
  const generalErrId = `${uid}-general-err`;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const { name, value, type, checked } = e.target;
    setValues(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const validationErrors = validateForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage('');

    try {
      await register({
        fullName: values.fullName.trim(),
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,
        acceptTerms: values.acceptTerms,
      });
      setSuccessMessage('Account created! Redirecting to login…');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { error?: { code?: string; message?: string } } } }).response;
        const code = response?.data?.error?.code;
        if (code === 'EMAIL_TAKEN') {
          setErrors({ email: 'That email is already registered.' });
        } else {
          const msg = response?.data?.error?.message || 'Registration failed. Please try again.';
          setErrors({ general: msg });
        }
      } else {
        setErrors({ general: 'Registration failed. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <style>{`
        :root {
          --color-accent-primary: #4f46e5;
          --color-accent-primary-hover: #4338ca;
          --color-accent-primary-active: #3730a3;
          --color-accent-disabled: #c7d2fe;
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
          --radius-full: 9999px;
          --radius-input: 8px;
          --space-2xl: 48px;
          --space-lg: 24px;
          --space-md: 16px;
          --space-sm: 8px;
          --space-xl: 32px;
          --space-xs: 4px;
        }

        .auth-layout {
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

        .auth-layout__branding {
          margin-bottom: var(--space-lg);
          text-align: center;
        }

        .auth-layout__logo {
          font-size: 30px;
          font-weight: 700;
          line-height: 1.2;
          color: var(--color-accent-primary);
        }

        .auth-layout__tagline {
          font-size: 14px;
          font-weight: 500;
          line-height: 1.5;
          color: var(--color-text-secondary);
          margin-top: var(--space-xs);
        }

        .auth-card {
          background-color: var(--color-surface);
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
          font-weight: 500;
          line-height: 1.5;
          color: var(--color-text-secondary);
          margin: 0 0 var(--space-xl) 0;
        }

        .auth-card__banner {
          border-radius: var(--radius-input);
          padding: var(--space-sm) var(--space-md);
          margin-bottom: var(--space-md);
          font-size: 14px;
          font-weight: 500;
          line-height: 1.5;
        }

        .auth-card__banner--error {
          background-color: #fef2f2;
          color: var(--color-error);
          border: 1px solid #fecaca;
        }

        .auth-card__banner--success {
          background-color: #f0fdf4;
          color: var(--color-success);
          border: 1px solid #bbf7d0;
        }

        .auth-card__form {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }

        .auth-card__field {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .auth-card__field label {
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
          font-size: 16px;
          font-family: var(--family-base);
          font-weight: 400;
          line-height: 1.5;
          color: var(--color-text-primary);
          background-color: var(--color-surface);
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
          box-shadow: 0 0 0 3px rgba(220,38,38,0.2);
        }

        .auth-card__input--with-toggle {
          padding-right: 44px;
        }

        .auth-card__toggle-btn {
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
          line-height: 1;
        }

        .auth-card__toggle-btn:focus-visible {
          outline: 2px solid var(--color-focus-ring);
          outline-offset: 1px;
        }

        .field--error {
          font-size: 12px;
          font-weight: 400;
          line-height: 1.5;
          color: var(--color-error);
          margin: 0;
        }

        .auth-card__password-strength {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
          margin-top: var(--space-xs);
        }

        .auth-card__strength-bars {
          display: flex;
          gap: var(--space-xs);
        }

        .auth-card__strength-bar {
          flex: 1;
          height: 4px;
          border-radius: var(--radius-full);
          background-color: var(--color-border);
          transition: background-color 0.2s ease;
        }

        .auth-card__strength-label {
          font-size: 12px;
          font-weight: 400;
          line-height: 1.5;
          color: var(--color-text-muted);
        }

        .auth-card__checkbox-row {
          display: flex;
          align-items: flex-start;
          gap: var(--space-sm);
        }

        .auth-card__checkbox {
          width: 16px;
          height: 16px;
          margin-top: 2px;
          flex-shrink: 0;
          accent-color: var(--color-accent-primary);
          cursor: pointer;
        }

        .auth-card__checkbox-label {
          font-size: 14px;
          font-weight: 400;
          line-height: 1.5;
          color: var(--color-text-secondary);
          cursor: pointer;
        }

        .auth-card__submit {
          width: 100%;
          padding: var(--space-sm) var(--space-md);
          font-size: 16px;
          font-family: var(--family-base);
          font-weight: 600;
          line-height: 1.5;
          color: #ffffff;
          background-color: var(--color-accent-primary);
          border: none;
          border-radius: var(--radius-button);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-sm);
          transition: background-color 0.15s ease;
          margin-top: var(--space-xs);
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

        .auth-card__submit:focus-visible {
          outline: 2px solid var(--color-focus-ring);
          outline-offset: 2px;
        }

        .auth-card__spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #ffffff;
          border-radius: var(--radius-full);
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .auth-card__footer {
          text-align: center;
          font-size: 14px;
          font-weight: 400;
          line-height: 1.5;
          color: var(--color-text-secondary);
          margin: var(--space-lg) 0 0 0;
        }

        .auth-card__footer .link {
          color: var(--color-link);
          font-weight: 500;
          text-decoration: none;
        }

        .auth-card__footer .link:hover {
          text-decoration: underline;
        }

        .auth-card__footer .link:focus-visible {
          outline: 2px solid var(--color-focus-ring);
          outline-offset: 1px;
          border-radius: 2px;
        }
      `}</style>

      <div className="auth-layout__branding">
        <div className="auth-layout__logo">auth-starter</div>
        <div className="auth-layout__tagline">Secure authentication, ready to go.</div>
      </div>

      <div className="auth-card">
        <h1 className="auth-card__title">Create an account</h1>
        <p className="auth-card__subtitle">Sign up to get started today.</p>

        <div aria-live="polite">
          {errors.general && (
            <div
              className="auth-card__banner auth-card__banner--error"
              role="alert"
              id={generalErrId}
            >
              {errors.general}
            </div>
          )}
          {successMessage && (
            <div className="auth-card__banner auth-card__banner--success" role="status">
              {successMessage}
            </div>
          )}
        </div>

        <form className="auth-card__form" onSubmit={handleSubmit} noValidate>
          {/* Full Name */}
          <div className="auth-card__field">
            <label htmlFor={fullNameId}>Full name</label>
            <div className="auth-card__input-wrapper">
              <input
                id={fullNameId}
                name="fullName"
                type="text"
                autoComplete="name"
                className={`auth-card__input${errors.fullName ? ' auth-card__input--error' : ''}`}
                value={values.fullName}
                onChange={handleChange}
                aria-describedby={errors.fullName ? fullNameErrId : undefined}
                aria-invalid={!!errors.fullName}
                disabled={isSubmitting}
                maxLength={120}
              />
            </div>
            {errors.fullName && (
              <p className="field--error" id={fullNameErrId}>
                {errors.fullName}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="auth-card__field">
            <label htmlFor={emailId}>Email address</label>
            <div className="auth-card__input-wrapper">
              <input
                id={emailId}
                name="email"
                type="email"
                autoComplete="email"
                className={`auth-card__input${errors.email ? ' auth-card__input--error' : ''}`}
                value={values.email}
                onChange={handleChange}
                aria-describedby={errors.email ? emailErrId : undefined}
                aria-invalid={!!errors.email}
                disabled={isSubmitting}
              />
            </div>
            {errors.email && (
              <p className="field--error" id={emailErrId}>
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="auth-card__field">
            <label htmlFor={passwordId}>Password</label>
            <div className="auth-card__input-wrapper">
              <input
                id={passwordId}
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className={`auth-card__input auth-card__input--with-toggle${errors.password ? ' auth-card__input--error' : ''}`}
                value={values.password}
                onChange={handleChange}
                aria-describedby={errors.password ? passwordErrId : undefined}
                aria-invalid={!!errors.password}
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="auth-card__toggle-btn"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(prev => !prev)}
                tabIndex={0}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {values.password.length > 0 && (
              <div className="auth-card__password-strength" aria-label={`Password strength: ${strengthLabels[passwordStrength] || 'Very weak'}`}>
                <div className="auth-card__strength-bars" aria-hidden="true">
                  {[1, 2, 3, 4].map(level => (
                    <div
                      key={level}
                      className="auth-card__strength-bar"
                      style={{
                        backgroundColor: passwordStrength >= level ? strengthColors[passwordStrength] : 'var(--color-border)',
                      }}
                    />
                  ))}
                </div>
                <span className="auth-card__strength-label" style={{ color: passwordStrength > 0 ? strengthColors[passwordStrength] : 'var(--color-text-muted)' }}>
                  {passwordStrength > 0 ? strengthLabels[passwordStrength] : ''}
                </span>
              </div>
            )}
            {errors.password && (
              <p className="field--error" id={passwordErrId}>
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="auth-card__field">
            <label htmlFor={confirmPasswordId}>Confirm password</label>
            <div className="auth-card__input-wrapper">
              <input
                id={confirmPasswordId}
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className={`auth-card__input auth-card__input--with-toggle${errors.confirmPassword ? ' auth-card__input--error' : ''}`}
                value={values.confirmPassword}
                onChange={handleChange}
                aria-describedby={errors.confirmPassword ? confirmPasswordErrId : undefined}
                aria-invalid={!!errors.confirmPassword}
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="auth-card__toggle-btn"
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                onClick={() => setShowConfirmPassword(prev => !prev)}
                tabIndex={0}
              >
                {showConfirmPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="field--error" id={confirmPasswordErrId}>
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Accept Terms */}
          <div className="auth-card__field">
            <div className="auth-card__checkbox-row">
              <input
                id={acceptTermsId}
                name="acceptTerms"
                type="checkbox"
                className="auth-card__checkbox"
                checked={values.acceptTerms}
                onChange={handleChange}
                aria-describedby={errors.acceptTerms ? acceptTermsErrId : undefined}
                aria-invalid={!!errors.acceptTerms}
                disabled={isSubmitting}
              />
              <label htmlFor={acceptTermsId} className="auth-card__checkbox-label">
                I agree to the{' '}
                <a href="/terms" className="link" target="_blank" rel="noopener noreferrer">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="link" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>.
              </label>
            </div>
            {errors.acceptTerms && (
              <p className="field--error" id={acceptTermsErrId}>
                {errors.acceptTerms}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="auth-card__submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
          >
            {isSubmitting && <span className="auth-card__spinner" aria-hidden="true" />}
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-card__footer">
          Already have an account?{' '}
          <Link to="/login" className="link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
