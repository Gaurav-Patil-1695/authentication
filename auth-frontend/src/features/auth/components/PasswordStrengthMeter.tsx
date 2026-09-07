import React from 'react';

interface Rule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

const RULES: Rule[] = [
  {
    id: 'min-length',
    label: 'At least 8 characters',
    test: (password) => password.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'One uppercase letter',
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: 'lowercase',
    label: 'One lowercase letter',
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: 'number',
    label: 'One number',
    test: (password) => /[0-9]/.test(password),
  },
];

const STRENGTH_LABELS: Record<number, string> = {
  0: 'None',
  1: 'Weak',
  2: 'Fair',
  3: 'Good',
  4: 'Strong',
};

const STRENGTH_MODIFIERS: Record<number, string> = {
  0: 'none',
  1: 'weak',
  2: 'fair',
  3: 'good',
  4: 'strong',
};

interface PasswordStrengthMeterProps {
  password: string;
}

function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps): React.ReactElement {
  const results = RULES.map((rule) => ({
    ...rule,
    passed: rule.test(password),
  }));

  const passedCount = results.filter((r) => r.passed).length;
  const total = RULES.length;

  const strengthLabel = STRENGTH_LABELS[passedCount] ?? 'None';
  const strengthModifier = STRENGTH_MODIFIERS[passedCount] ?? 'none';

  return (
    <div className="password-strength" aria-label={`Password strength: ${strengthLabel}`}>
      <div className="password-strength__bar-row" aria-hidden="true">
        {Array.from({ length: total }).map((_, index) => (
          <div
            key={index}
            className={`password-strength__segment${
              index < passedCount
                ? ` password-strength__segment--${strengthModifier}`
                : ''
            }`}
          />
        ))}
      </div>
      {password.length > 0 && (
        <span className={`password-strength__label password-strength__label--${strengthModifier}`}>
          {strengthLabel}
        </span>
      )}
      <ul className="password-strength__checklist" aria-label="Password requirements">
        {results.map((rule) => (
          <li
            key={rule.id}
            className={`password-strength__check${
              rule.passed ? ' password-strength__check--passed' : ' password-strength__check--failed'
            }`}
          >
            <span
              className="password-strength__check-icon"
              aria-hidden="true"
            >
              {rule.passed ? '✓' : '✗'}
            </span>
            <span className="password-strength__check-label">{rule.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PasswordStrengthMeter;
