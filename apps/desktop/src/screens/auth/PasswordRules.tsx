import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Live checklist mirroring the backend policy (`auth::validate_password`).
 * The backend remains the authority; this only shows progress while typing.
 */
export function passwordChecks(username: string, password: string) {
  const lowered = password.toLowerCase();
  const name = username.trim().toLowerCase();
  return [
    { label: "At least 10 characters", ok: [...password].length >= 10 },
    {
      label: "Contains a letter and a digit",
      ok: /\p{L}/u.test(password) && /\d/.test(password),
    },
    {
      label: "Does not contain the username",
      ok: password.length > 0 && (!name || !lowered.includes(name)),
    },
  ];
}

export function PasswordRules({
  username,
  password,
}: {
  username: string;
  password: string;
}) {
  return (
    <ul className="space-y-1" aria-label="Password requirements">
      {passwordChecks(username, password).map((rule) => (
        <li
          key={rule.label}
          className={cn(
            "flex items-center gap-1.5 text-xs",
            rule.ok ? "text-success-ink" : "text-ink-muted",
          )}
        >
          {rule.ok ? (
            <Check className="size-3.5" aria-hidden="true" />
          ) : (
            <Circle className="size-3" aria-hidden="true" />
          )}
          {rule.label}
          <span className="sr-only">{rule.ok ? " (met)" : " (not met)"}</span>
        </li>
      ))}
    </ul>
  );
}
