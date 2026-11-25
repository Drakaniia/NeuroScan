import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useSession } from "@/lib/session";
import { AuthLayout } from "./AuthLayout";
import { PasswordRules, passwordChecks } from "./PasswordRules";

type Fields = "currentPassword" | "newPassword" | "confirm";

export function ChangePasswordForm({
  onDone,
  submitLabel = "Change password",
}: {
  onDone?: () => void;
  submitLabel?: string;
}) {
  const { session, changePassword } = useSession();
  const username = session?.user.username ?? "";
  const [values, setValues] = useState<Record<Fields, string>>({
    currentPassword: "",
    newPassword: "",
    confirm: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Fields, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found: Partial<Record<Fields, string>> = {};
    if (!values.currentPassword)
      found.currentPassword = "Enter your current password.";
    if (
      !passwordChecks(username, values.newPassword).every((rule) => rule.ok)
    ) {
      found.newPassword = "The new password does not meet the requirements.";
    }
    if (values.newPassword !== values.confirm)
      found.confirm = "The passwords do not match.";
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;
    setBusy(true);
    setFormError(null);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      setValues({ currentPassword: "", newPassword: "", confirm: "" });
      onDone?.();
    } catch (caught) {
      if (caught instanceof ApiError && caught.field) {
        const field: Fields =
          caught.field === "currentPassword"
            ? "currentPassword"
            : "newPassword";
        setErrors({ [field]: caught.message });
      } else {
        setFormError(errorMessage(caught));
      }
    } finally {
      setBusy(false);
    }
  };

  const fields: { key: Fields; label: string; autoComplete: string }[] = [
    {
      key: "currentPassword",
      label: "Current password",
      autoComplete: "current-password",
    },
    { key: "newPassword", label: "New password", autoComplete: "new-password" },
    {
      key: "confirm",
      label: "Confirm new password",
      autoComplete: "new-password",
    },
  ];

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      {formError ? <Callout tone="danger">{formError}</Callout> : null}
      {fields.map((field) => (
        <Field
          key={field.key}
          label={field.label}
          required
          error={errors[field.key]}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              type="password"
              autoComplete={field.autoComplete}
              value={values[field.key]}
              onChange={(event) => {
                const value = event.target.value;
                setValues((current) => ({ ...current, [field.key]: value }));
              }}
            />
          )}
        </Field>
      ))}
      <PasswordRules username={username} password={values.newPassword} />
      <Button type="submit" variant="primary" loading={busy}>
        {submitLabel}
      </Button>
    </form>
  );
}

/** Forced after an administrator issued a temporary password. */
export function ChangePasswordScreen() {
  const { logout } = useSession();
  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Your account has a temporary password. Choose a personal password to continue."
      footer={
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => void logout()}
        >
          Sign out
        </Button>
      }
    >
      <ChangePasswordForm submitLabel="Save and continue" />
    </AuthLayout>
  );
}
