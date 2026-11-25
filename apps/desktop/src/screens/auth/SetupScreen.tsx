import { ShieldCheck } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { ApiError, errorMessage } from "@/lib/api/client";
import { useSession } from "@/lib/session";
import { AuthLayout } from "./AuthLayout";
import { PasswordRules, passwordChecks } from "./PasswordRules";

type SetupForm = {
  facilityName: string;
  department: string;
  fullName: string;
  username: string;
  password: string;
  confirm: string;
};

/** First run: facility profile and the first administrator account. */
export function SetupScreen() {
  const { setup } = useSession();
  const [form, setForm] = useState<SetupForm>({
    facilityName: "",
    department: "",
    fullName: "",
    username: "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof SetupForm, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (key: keyof SetupForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const found: Partial<Record<keyof SetupForm, string>> = {};
    if (!form.facilityName.trim())
      found.facilityName = "Facility name is required.";
    if (!form.fullName.trim()) found.fullName = "Full name is required.";
    if (!form.username.trim()) found.username = "Username is required.";
    if (
      !passwordChecks(form.username, form.password).every((rule) => rule.ok)
    ) {
      found.password = "The password does not meet the requirements below.";
    }
    if (form.password !== form.confirm)
      found.confirm = "The passwords do not match.";
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;

    setBusy(true);
    setFormError(null);
    try {
      await setup({
        facilityName: form.facilityName.trim(),
        department: form.department.trim() || null,
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        password: form.password,
      });
    } catch (caught) {
      if (caught instanceof ApiError && caught.field && caught.field in form) {
        setErrors({ [caught.field]: caught.message });
      } else {
        setFormError(errorMessage(caught));
      }
    } finally {
      setBusy(false);
    }
  };

  const text = (
    key: keyof SetupForm,
    label: string,
    extra: Partial<React.ComponentProps<typeof Input>> = {},
    hint?: string,
    required = true,
  ) => (
    <Field label={label} required={required} error={errors[key]} hint={hint}>
      {({ id, describedBy, invalid }) => (
        <Input
          id={id}
          aria-describedby={describedBy}
          invalid={invalid}
          value={form[key]}
          onChange={(event) => update(key, event.target.value)}
          {...extra}
        />
      )}
    </Field>
  );

  return (
    <AuthLayout
      wide
      title="Set up this workstation"
      subtitle="Create the facility profile and the first administrator account. Further users are added from Settings."
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        {formError ? <Callout tone="danger">{formError}</Callout> : null}
        <fieldset>
          <legend className="type-headline mb-3 text-ink">Facility</legend>
          <div className="grid grid-cols-2 gap-3">
            {text("facilityName", "Facility name", { autoFocus: true })}
            {text(
              "department",
              "Department",
              { placeholder: "e.g. Radiology" },
              "Shown on reports.",
              false,
            )}
          </div>
        </fieldset>

        <div className="border-t border-line pt-5">
          <fieldset>
            <legend className="type-headline mb-3 text-ink">
              Administrator account
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {text("fullName", "Full name", { autoComplete: "name" })}
              {text(
                "username",
                "Username",
                {
                  autoComplete: "username",
                  spellCheck: false,
                  autoCorrect: "off",
                  autoCapitalize: "none",
                },
                "3–32 letters, digits, . _ -",
              )}
              {text("password", "Password", {
                type: "password",
                autoComplete: "new-password",
              })}
              {text("confirm", "Confirm password", {
                type: "password",
                autoComplete: "new-password",
              })}
            </div>
            <div className="mt-3">
              <PasswordRules
                username={form.username}
                password={form.password}
              />
            </div>
          </fieldset>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={busy}
          icon={<ShieldCheck className="size-4" aria-hidden="true" />}
          className="w-full"
        >
          Create administrator and sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
