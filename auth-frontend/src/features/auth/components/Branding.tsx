import React from 'react';

function Branding(): JSX.Element {
  return (
    <div className="branding">
      <div className="branding__logo" aria-hidden="true">
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="branding__logo-icon"
        >
          <rect width="48" height="48" rx="12" fill="var(--color-accent-primary)" />
          <path
            d="M24 12C18.477 12 14 16.477 14 22C14 25.311 15.585 28.249 18 30.122V36H30V30.122C32.415 28.249 34 25.311 34 22C34 16.477 29.523 12 24 12Z"
            fill="var(--color-surface-card)"
          />
          <rect x="19" y="34" width="10" height="2" rx="1" fill="var(--color-surface-card)" />
          <rect x="20" y="37" width="8" height="2" rx="1" fill="var(--color-surface-card)" />
        </svg>
      </div>
      <span className="branding__wordmark">AuthStarter</span>
    </div>
  );
}

export default Branding;
