import { KeyRound, LogIn, User } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { errorMessage } from "@/lib/api/client";
import { useSession } from "@/lib/session";
import { AuthLayout } from "./AuthLayout";

export function LoginScreen() {
  const { login, facilityName } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch (caught) {
      setError(errorMessage(caught).replace(/^Authentication failed: /, ""));
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Sign in" subtitle={facilityName ?? undefined}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error ? <Callout tone="danger">{error}</Callout> : null}
        <Field label="Username">
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              autoComplete="username"
              autoFocus
              spellCheck={false}
              leading={<User className="size-4" aria-hidden="true" />}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          )}
        </Field>
        <Field label="Password">
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              type="password"
              autoComplete="current-password"
              leading={<KeyRound className="size-4" aria-hidden="true" />}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}
        </Field>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={busy}
          icon={<LogIn className="size-4" aria-hidden="true" />}
          className="w-full"
        >
          Sign in
        </Button>
        <p className="text-xs text-ink-muted">
          Forgotten your password? An administrator can issue a temporary one
          from Settings › Users.
        </p>
      </form>
    </AuthLayout>
  );
}
