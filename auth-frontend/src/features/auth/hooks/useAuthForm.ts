import { useState, useCallback, ChangeEvent, FocusEvent, FormEvent } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FieldValues = Record<string, string | boolean>;

export type FieldErrors = Record<string, string>;

export type TouchedFields = Record<string, boolean>;

export type ValidatorFn<T extends FieldValues> = (values: T) => FieldErrors;

export interface UseAuthFormOptions<T extends FieldValues> {
  initialValues: T;
  validate: ValidatorFn<T>;
  onSubmit: (values: T) => Promise<void>;
}

export interface UseAuthFormReturn<T extends FieldValues> {
  values: T;
  errors: FieldErrors;
  touched: TouchedFields;
  isSubmitting: boolean;
  submitError: string;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleBlur: (e: FocusEvent<HTMLInputElement>) => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => Promise<void>;
  setSubmitError: (message: string) => void;
  resetForm: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuthForm<T extends FieldValues>({
  initialValues,
  validate,
  onSubmit,
}: UseAuthFormOptions<T>): UseAuthFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // -------------------------------------------------------------------------
  // Derived helpers
  // -------------------------------------------------------------------------

  const runValidation = useCallback(
    (currentValues: T): FieldErrors => {
      return validate(currentValues);
    },
    [validate],
  );

  // -------------------------------------------------------------------------
  // handleChange
  // -------------------------------------------------------------------------

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { name, type, checked, value } = e.target;
      const newValue = type === 'checkbox' ? checked : value;

      setValues((prev) => ({
        ...prev,
        [name]: newValue,
      }));

      // Re-validate the changed field only when it has already been touched
      setTouched((prevTouched) => {
        if (prevTouched[name]) {
          const updatedValues = { ...values, [name]: newValue } as T;
          const newErrors = runValidation(updatedValues);
          setErrors((prev) => ({
            ...prev,
            [name]: newErrors[name] ?? '',
          }));
        }
        return prevTouched;
      });
    },
    [values, runValidation],
  );

  // -------------------------------------------------------------------------
  // handleBlur
  // -------------------------------------------------------------------------

  const handleBlur = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      const { name } = e.target;

      setTouched((prev) => ({ ...prev, [name]: true }));

      // Validate on first blur
      const fieldErrors = runValidation(values);
      setErrors((prev) => ({
        ...prev,
        [name]: fieldErrors[name] ?? '',
      }));
    },
    [values, runValidation],
  );

  // -------------------------------------------------------------------------
  // handleSubmit
  // -------------------------------------------------------------------------

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Touch every field so all errors become visible
      const allTouched: TouchedFields = Object.keys(values).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {},
      );
      setTouched(allTouched);

      // Full validation pass
      const validationErrors = runValidation(values);
      setErrors(validationErrors);

      const hasErrors = Object.values(validationErrors).some(
        (msg) => msg !== '' && msg !== undefined,
      );

      if (hasErrors) {
        return;
      }

      setIsSubmitting(true);
      setSubmitError('');

      try {
        await onSubmit(values);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setSubmitError(err.message);
        } else {
          setSubmitError('An unexpected error occurred. Please try again.');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, runValidation, onSubmit],
  );

  // -------------------------------------------------------------------------
  // resetForm
  // -------------------------------------------------------------------------

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    setSubmitError('');
  }, [initialValues]);

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------

  return {
    values,
    errors,
    touched,
    isSubmitting,
    submitError,
    handleChange,
    handleBlur,
    handleSubmit,
    setSubmitError,
    resetForm,
  };
}
