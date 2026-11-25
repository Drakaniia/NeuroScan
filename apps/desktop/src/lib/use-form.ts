import { useCallback, useState } from "react";
import { ApiError, errorMessage } from "@/lib/api/client";

/**
 * Minimal form state: values, per-field errors (client checks first, then
 * the backend's `validation` errors mapped onto the field it names), and a
 * form-level error for everything else.
 */
export function useForm<T extends Record<string, unknown>>(initial: T) {
  const [values, setValues] = useState<T>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const set = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) =>
      current[key] ? { ...current, [key]: undefined } : current,
    );
  }, []);

  const reset = useCallback((next: T) => {
    setValues(next);
    setErrors({});
    setFormError(null);
  }, []);

  /** Apply client-side checks; returns true when the form may be submitted. */
  const check = useCallback((found: Partial<Record<keyof T, string>>) => {
    setErrors(found);
    setFormError(null);
    return !Object.values(found).some(Boolean);
  }, []);

  /** Route a failed submission to the right field or the form. */
  const fail = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError && error.field && error.field in values) {
        setErrors({ [error.field]: error.message } as Partial<
          Record<keyof T, string>
        >);
      } else {
        setFormError(errorMessage(error));
      }
    },
    [values],
  );

  return { values, set, errors, formError, setFormError, check, fail, reset };
}
