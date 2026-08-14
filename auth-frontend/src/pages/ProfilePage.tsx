import React, { useContext, useState } from 'react';
import { AuthContext } from '../features/auth/context/AuthContext';
import { logout } from '../api/auth';

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

  .profile-page {
    min-height: 100vh;
    background-color: var(--color-bg-app);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--family-base);
    padding: var(--space-lg);
  }

  .profile-card {
    background-color: var(--color-surface);
    border-radius: var(--radius-card);
    box-shadow: var(--elevation-card);
    padding: var(--space-2xl);
    width: 100%;
    max-width: 480px;
  }

  .profile-card__branding {
    text-align: center;
    margin-bottom: var(--space-xl);
  }

  .profile-card__branding-logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background-color: var(--color-accent-primary);
    border-radius: var(--radius-button);
    margin-bottom: var(--space-sm);
  }

  .profile-card__branding-logo svg {
    width: 28px;
    height: 28px;
    fill: #ffffff;
  }

  .profile-card__title {
    font-size: 30px;
    font-weight: 700;
    line-height: 1.2;
    color: var(--color-text-primary);
    margin: 0 0 var(--space-xs) 0;
  }

  .profile-card__subtitle {
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .profile-card__avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--space-xl);
  }

  .profile-card__avatar-circle {
    width: 80px;
    height: 80px;
    border-radius: 9999px;
    background-color: var(--color-accent-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
    font-weight: 700;
    color: #ffffff;
    line-height: 1;
    user-select: none;
  }

  .profile-card__fields {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    margin-bottom: var(--space-xl);
  }

  .profile-card__field {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  .profile-card__field-label {
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
    color: var(--color-text-secondary);
  }

  .profile-card__field-value {
    font-size: 16px;
    font-weight: 400;
    line-height: 1.5;
    color: var(--color-text-primary);
    background-color: var(--color-muted-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-input);
    padding: var(--space-sm) var(--space-md);
  }

  .profile-card__field-value--muted {
    color: var(--color-text-muted);
    font-size: 14px;
  }

  .profile-card__divider {
    border: none;
    border-top: 1px solid var(--color-border);
    margin: 0 0 var(--space-xl) 0;
  }

  .profile-card__actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  .profile-card__button {
    width: 100%;
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-button);
    font-size: 16px;
    font-weight: 500;
    line-height: 1.5;
    cursor: pointer;
    border: none;
    transition: background-color 0.15s ease, box-shadow 0.15s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
  }

  .profile-card__button:focus-visible {
    outline: none;
    box-shadow: var(--elevation-focus);
  }

  .profile-card__button--primary {
    background-color: var(--color-accent-primary);
    color: #ffffff;
  }

  .profile-card__button--primary:hover:not(:disabled) {
    background-color: var(--color-accent-primary-hover);
  }

  .profile-card__button--primary:active:not(:disabled) {
    background-color: var(--color-accent-primary-active);
  }

  .profile-card__button--primary:disabled {
    background-color: var(--color-accent-disabled);
    cursor: not-allowed;
  }

  .profile-card__button--secondary {
    background-color: transparent;
    color: var(--color-error);
    border: 1px solid var(--color-error);
  }

  .profile-card__button--secondary:hover:not(:disabled) {
    background-color: rgba(220,38,38,0.06);
  }

  .profile-card__button--secondary:active:not(:disabled) {
    background-color: rgba(220,38,38,0.12);
  }

  .profile-card__button--secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .profile-card__banner {
    margin-bottom: var(--space-md);
    padding: var(--space-sm) var(--space-md);
    border-radius: var(--radius-input);
    font-size: 14px;
    font-weight: 500;
    line-height: 1.5;
  }

  .profile-card__banner--error {
    background-color: rgba(220,38,38,0.08);
    color: var(--color-error);
    border: 1px solid rgba(220,38,38,0.2);
  }

  .profile-card__spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255,255,255,0.4);
    border-top-color: #ffffff;
    border-radius: 9999px;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .profile-card__status-badge {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: 12px;
    font-weight: 400;
    line-height: 1.5;
    margin-top: var(--space-xs);
  }

  .profile-card__status-dot {
    width: 8px;
    height: 8px;
    border-radius: 9999px;
    flex-shrink: 0;
  }

  .profile-card__status-dot--active {
    background-color: var(--color-success);
  }

  .profile-card__status-dot--inactive {
    background-color: var(--color-text-muted);
  }

  .profile-card__status-text--active {
    color: var(--color-success);
  }

  .profile-card__status-text--inactive {
    color: var(--color-text-muted);
  }
`;

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === '') return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

const ProfilePage: React.FC = () => {
  const { user, logout: contextLogout } = useContext(AuthContext);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
      contextLogout();
    } catch {
      setLogoutError('An error occurred while signing out. Please try again.');
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className='profile-page'>
        <div className='profile-card' role='main'>
          <div className='profile-card__branding'>
            <div className='profile-card__branding-logo' aria-hidden='true'>
              <svg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
                <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z' />
              </svg>
            </div>
            <h1 className='profile-card__title'>My Profile</h1>
            <p className='profile-card__subtitle'>Your account information</p>
          </div>

          {user && (
            <div className='profile-card__avatar' aria-hidden='true'>
              <div className='profile-card__avatar-circle'>
                {getInitials(user.fullName ?? user.full_name ?? '')}
              </div>
            </div>
          )}

          <div
            aria-live='polite'
            aria-atomic='true'
          >
            {logoutError && (
              <div className='profile-card__banner profile-card__banner--error' role='alert'>
                {logoutError}
              </div>
            )}
          </div>

          <div className='profile-card__fields'>
            <div className='profile-card__field'>
              <span className='profile-card__field-label'>Full Name</span>
              <div className='profile-card__field-value'>
                {user?.fullName ?? user?.full_name ?? '—'}
              </div>
            </div>

            <div className='profile-card__field'>
              <span className='profile-card__field-label'>Email Address</span>
              <div className='profile-card__field-value'>
                {user?.email ?? '—'}
              </div>
            </div>

            <div className='profile-card__field'>
              <span className='profile-card__field-label'>Account Status</span>
              <div className='profile-card__field-value'>
                {user?.is_active !== undefined ? (
                  <span className='profile-card__status-badge'>
                    <span
                      className={`profile-card__status-dot ${
                        user.is_active
                          ? 'profile-card__status-dot--active'
                          : 'profile-card__status-dot--inactive'
                      }`}
                    />
                    <span
                      className={`${
                        user.is_active
                          ? 'profile-card__status-text--active'
                          : 'profile-card__status-text--inactive'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </span>
                ) : (
                  '—'
                )}
              </div>
            </div>

            {(user?.created_at) && (
              <div className='profile-card__field'>
                <span className='profile-card__field-label'>Member Since</span>
                <div className='profile-card__field-value profile-card__field-value--muted'>
                  {formatDate(user.created_at)}
                </div>
              </div>
            )}
          </div>

          <hr className='profile-card__divider' />

          <div className='profile-card__actions'>
            <button
              type='button'
              className='profile-card__button profile-card__button--secondary'
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-busy={isLoggingOut}
            >
              {isLoggingOut ? (
                <>
                  <span className='profile-card__spinner' aria-hidden='true' />
                  Signing out…
                </>
              ) : (
                'Sign Out'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfilePage;
