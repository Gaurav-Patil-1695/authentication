import React from 'react';

interface TextFieldProps {
  id: string;
  label: string;
  type?: 'text' | 'email';
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

function TextField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  autoComplete,
  disabled = false,
  error,
  hint,
  required = false,
}: TextFieldProps): JSX.Element {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedBy: string[] = [];
  if (hint) describedBy.push(hintId);
  if (error) describedBy.push(errorId);

  const hasError = Boolean(error);

  return (
    <div className={`auth-card__field text-field${hasError ? ' text-field--error' : ''}`}>
      <label className="text-field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="text-field__required" aria-hidden="true">
            {' *'}
          </span>
        )}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        required={required}
        aria-invalid={hasError}
        aria-describedby={describedBy.length > 0 ? describedBy.join(' ') : undefined}
        className={`text-field__input${hasError ? ' text-field__input--error' : ''}`}
      />
      {hint && !hasError && (
        <span id={hintId} className="text-field__hint">
          {hint}
        </span>
      )}
      {hasError && (
        <span id={errorId} className="text-field__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default TextField;
