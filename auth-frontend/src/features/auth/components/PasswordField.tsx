import React, { useState } from 'react';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
  required?: boolean;
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  autoComplete,
  disabled = false,
  error,
  hint,
  required = false,
}: PasswordFieldProps): React.ReactElement {
  const [visible, setVisible] = useState(false);

  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedBy: string[] = [];
  if (hint) describedBy.push(hintId);
  if (error) describedBy.push(errorId);

  const hasError = Boolean(error);

  function handleToggle(): void {
    setVisible((prev) => !prev);
  }

  return (
    <div className={`auth-card__field password-field${hasError ? ' password-field--error' : ''}`}>
      <label className="password-field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="password-field__required" aria-hidden="true">
            {' *'}
          </span>
        )}
      </label>
      <div className="password-field__input-wrapper">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          required={required}
          aria-invalid={hasError}
          aria-describedby={describedBy.length > 0 ? describedBy.join(' ') : undefined}
          className={`password-field__input${hasError ? ' password-field__input--error' : ''}`}
        />
        <button
          type="button"
          className="password-field__toggle"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={handleToggle}
          disabled={disabled}
          tabIndex={0}
        >
          {visible ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      {hint && !hasError && (
        <span id={hintId} className="password-field__hint">
          {hint}
        </span>
      )}
      {hasError && (
        <span id={errorId} className="password-field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default PasswordField;
