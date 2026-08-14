import React from 'react';

interface SubmitButtonProps {
  label: string;
  isLoading?: boolean;
  disabled?: boolean;
}

function SubmitButton({
  label,
  isLoading = false,
  disabled = false,
}: SubmitButtonProps): React.ReactElement {
  const isDisabled = disabled || isLoading;

  return (
    <button
      type="submit"
      className={`submit-button${isLoading ? ' submit-button--loading' : ''}`}
      disabled={isDisabled}
      aria-busy={isLoading}
    >
      {isLoading && (
        <svg
          className="submit-button__spinner"
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      )}
      <span className="submit-button__label">{label}</span>
    </button>
  );
}

export default SubmitButton;
