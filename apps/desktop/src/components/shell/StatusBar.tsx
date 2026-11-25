import { HardDrive, ShieldAlert } from "lucide-react";
import { useSession } from "@/lib/session";

/**
 * Always-visible footer: the decision-support disclaimer and where the data
 * lives. The disclaimer is never hidden by any screen. It sits directly on
 * the canvas, quiet but legible, and is never covered by glass.
 */
export function StatusBar() {
  const { appVersion } = useSession();

  return (
    <footer className="no-print flex h-[var(--statusbar-h)] shrink-0 items-center gap-4 px-4 text-2xs text-ink-muted">
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <ShieldAlert
          className="size-3.5 shrink-0 text-warning"
          aria-hidden="true"
        />
        <span className="truncate">
          <span className="font-semibold text-ink-secondary">
            Decision support only
          </span>{" "}
          — not a diagnostic device. AI output must be reviewed by a qualified
          clinician.
        </span>
      </span>

      <span
        className="hidden items-center gap-1.5 lg:flex"
        title="All images and records are stored and processed on this workstation."
      >
        <HardDrive className="size-3.5" aria-hidden="true" />
        Local processing · offline
      </span>
      {appVersion ? (
        <span className="tabular font-mono">v{appVersion}</span>
      ) : null}
    </footer>
  );
}
