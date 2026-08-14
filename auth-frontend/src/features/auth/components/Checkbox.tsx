import React from 'react';

interface CheckboxProps {
  id: string;
  label: React.ReactNode;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}

function Checkbox({
  id,
  label,
  checked,
  onChange,
  onBlur,
  disabled = false,
  error,
  required = false,
}: CheckboxProps): React.ReactElement {
  const errorId = `${id}-error`;
  const hasError = Boolean(error);

  return (
    <div className={`checkbox${hasError ? ' checkbox--error' : ''}`}>
      <label className="checkbox__label" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          className="checkbox__input"
        />
        <span className="checkbox__indicator" aria-hidden="true" />
        <span className="checkbox__text">
          {label}
          {required && (
            <span className="checkbox__required" aria-hidden="true">
              {' *'}
            </span>
          )}
        </span>
      </label>
      {hasError && (
        <span id={errorId} className="checkbox__error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export default Checkbox;
