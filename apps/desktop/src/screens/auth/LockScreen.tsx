import { ArrowRight, Loader2, LogOut } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { errorMessage } from "@/lib/api/client";
import { ROLE_LABELS } from "@/lib/format";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { AuthLayout } from "./AuthLayout";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Shown instead of the workspace (not over it) when the session is locked, so
 * no patient information stays visible on an unattended screen. Modelled on
 * the desktop lock screen: who it belongs to, and one field to come back.
 */
export function LockScreen() {
  const { session, unlock, logout } = useSession();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const user = session?.user;
  const inputRef = useRef<HTMLInputElement>(null);

  // One field, nothing else to do: it takes focus when the screen appears.
  useEffect(() => inputRef.current?.focus(), []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password) {
      setError("Enter your password to unlock.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await unlock(password);
    } catch (caught) {
      setError(errorMessage(caught).replace(/^Authentication failed: /, ""));
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Workstation locked"
      header={
        <div className="mb-6 flex flex-col items-center text-center">
          <span
            aria-hidden="true"
            className="mb-3 flex size-[72px] items-center justify-center rounded-full bg-gradient-to-b from-[rgb(132_136_146)] to-[rgb(84_88_98)] text-2xl font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_8px_20px_-6px_rgb(16_18_27/0.35)]"
          >
            {user ? initials(user.fullName) : "?"}
          </span>
          <p className="type-title text-ink">{user?.fullName ?? "Locked"}</p>
          {user ? (
            <p className="text-sm text-ink-muted">{ROLE_LABELS[user.role]}</p>
          ) : null}
          <p className="mt-3 text-xs text-ink-muted">
            Workstation locked. Patient information is hidden until you unlock.
          </p>
        </div>
      }
      footer={
        <Button
          variant="ghost"
          className="w-full"
          icon={<LogOut className="size-4" aria-hidden="true" />}
          onClick={() => void logout()}
        >
          Sign out and switch user
        </Button>
      }
    >
      <form onSubmit={submit} noValidate>
        <label htmlFor="unlock-password" className="sr-only">
          Password
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            id="unlock-password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "unlock-error" : undefined}
            onChange={(event) => setPassword(event.target.value)}
            className={cn(
              "h-11 w-full rounded-full bg-surface pl-4 pr-12 text-[15px] text-ink transition-shadow duration-fast placeholder:text-ink-faint focus:outline-none",
              error
                ? "shadow-[0_0_0_1px_rgb(var(--ns-danger)),0_0_0_4px_rgb(var(--ns-danger)/0.16)]"
                : "shadow-[0_0_0_0.5px_rgb(0_0_0/0.16),0_1px_2px_rgb(16_18_27/0.06)] focus:shadow-[0_0_0_1px_rgb(var(--ns-accent)),0_0_0_4px_rgb(var(--ns-accent)/0.18)]",
            )}
          />
          <button
            type="submit"
            aria-label="Unlock"
            disabled={busy}
            className="pressable absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-accent text-white shadow-control-accent hover:bg-accent-hover disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <ArrowRight className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {error ? (
          <p
            id="unlock-error"
            role="alert"
            className="mt-2 animate-fade-in text-center text-xs text-danger-ink"
          >
            {error}
          </p>
        ) : null}
      </form>
    </AuthLayout>
  );
}
