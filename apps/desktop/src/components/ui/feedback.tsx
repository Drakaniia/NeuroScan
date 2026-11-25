import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  RefreshCw,
} from "lucide-react";
import type { ReactNode } from "react";
import { errorMessage } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

export function Spinner({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      role="status"
      className={cn(
        "inline-flex items-center gap-2 text-sm text-ink-muted",
        className,
      )}
    >
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label ? <span>{label}</span> : <span className="sr-only">Loading</span>}
    </span>
  );
}

/**
 * Determinate when `value` is given (0–1), otherwise an indeterminate sweep —
 * used only while the backend genuinely cannot report a fraction.
 */
export function ProgressBar({
  value,
  label,
  tone = "accent",
  className,
}: {
  value?: number;
  label: string;
  tone?: "accent" | "progress" | "viewer";
  className?: string;
}) {
  const fill = {
    accent: "bg-accent",
    progress: "bg-progress",
    viewer: "bg-viewer-accent",
  }[tone];
  const determinate = typeof value === "number";
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={determinate ? Math.round(value * 100) : undefined}
      className={cn(
        "relative h-1 w-full overflow-hidden rounded-full",
        tone === "viewer" ? "bg-white/10" : "bg-black/[0.07]",
        className,
      )}
    >
      {determinate ? (
        <div
          className={cn(
            "h-full origin-left rounded-full transition-transform duration-slow ease-out",
            fill,
          )}
          style={{
            transform: `scaleX(${Math.max(0, Math.min(1, value))})`,
          }}
        />
      ) : (
        <div
          className={cn(
            "absolute inset-y-0 w-2/5 animate-indeterminate rounded-full",
            fill,
          )}
        />
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-surface text-ink-muted shadow-raised">
          {icon}
        </div>
      ) : null}
      <h3 className="type-headline text-ink">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-md text-sm text-ink-muted">{description}</p>
      ) : null}
      {action ? (
        <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>
      ) : null}
    </div>
  );
}

type CalloutTone = "info" | "warning" | "danger" | "success";

const CALLOUT: Record<
  CalloutTone,
  { box: string; icon: typeof Info; iconTone: string }
> = {
  info: {
    box: "bg-accent-soft/80 shadow-[inset_0_0_0_0.5px_rgb(var(--ns-accent-line))]",
    icon: Info,
    iconTone: "text-accent",
  },
  warning: {
    box: "bg-warning-soft/80 shadow-[inset_0_0_0_0.5px_rgb(var(--ns-warning-line))]",
    icon: AlertTriangle,
    iconTone: "text-warning",
  },
  danger: {
    box: "bg-danger-soft/80 shadow-[inset_0_0_0_0.5px_rgb(var(--ns-danger-line))]",
    icon: AlertCircle,
    iconTone: "text-danger",
  },
  success: {
    box: "bg-success-soft/80 shadow-[inset_0_0_0_0.5px_rgb(var(--ns-success-line))]",
    icon: CheckCircle2,
    iconTone: "text-success",
  },
};

const CALLOUT_TITLE: Record<CalloutTone, string> = {
  info: "text-accent-ink",
  warning: "text-warning-ink",
  danger: "text-danger-ink",
  success: "text-success-ink",
};

export function Callout({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: CalloutTone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const { box, icon: Icon, iconTone } = CALLOUT[tone];
  return (
    <div
      role={tone === "danger" ? "alert" : undefined}
      className={cn(
        "flex gap-2.5 rounded-lg px-3 py-2.5 text-sm",
        box,
        className,
      )}
    >
      <Icon
        className={cn("mt-0.5 size-4 shrink-0", iconTone)}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        {title ? (
          <p className={cn("font-semibold", CALLOUT_TITLE[tone])}>{title}</p>
        ) : null}
        {children ? (
          <div className={cn(title && "mt-0.5", "text-ink-secondary")}>
            {children}
          </div>
        ) : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}

/** A failed load, with the backend's explanation and a retry. */
export function ErrorState({
  error,
  onRetry,
  title = "This could not be loaded",
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <EmptyState
      icon={<AlertCircle className="size-5 text-danger" aria-hidden="true" />}
      title={title}
      description={errorMessage(error)}
      action={
        onRetry ? (
          <Button
            onClick={onRetry}
            icon={<RefreshCw className="size-4" aria-hidden="true" />}
          >
            Try again
          </Button>
        ) : undefined
      }
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-black/[0.06]", className)}
    />
  );
}

/** A solid paper card for clinical content, optionally with a header row. */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("paper overflow-hidden rounded-xl", className)}>
      {title || actions ? (
        <header className="flex min-h-12 items-center justify-between gap-3 border-b border-line/80 px-4 py-2.5">
          <div className="min-w-0">
            {title ? (
              <h2 className="text-sm font-semibold tracking-[-0.006em] text-ink">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
          ) : null}
        </header>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

/**
 * The title block of a screen. Large title, quiet supporting line, actions on
 * the trailing edge. `eyebrow` carries real context (the patient a screen
 * belongs to, a parent list), never a decorative category label.
 */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-5">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1 text-xs font-medium text-ink-muted">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="type-display text-ink">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-ink-muted">{description}</p>
        ) : null}
        {children}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}

export function Kbd({
  children,
  tone = "light",
}: {
  children: ReactNode;
  tone?: "light" | "viewer";
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] px-1 font-mono text-2xs font-medium",
        tone === "light"
          ? "bg-surface text-ink-secondary shadow-[0_0_0_0.5px_rgb(0_0_0/0.16),0_1px_0_rgb(0_0_0/0.1)]"
          : "bg-white/10 text-viewer-ink",
      )}
    >
      {children}
    </kbd>
  );
}

/** Label/value pairs in a compact definition grid. */
export function DefinitionList({
  items,
  columns = 2,
  className,
}: {
  items: { label: string; value: ReactNode; mono?: boolean }[];
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const grid = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
  }[columns];
  return (
    <dl className={cn("grid gap-x-6 gap-y-3.5", grid, className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-ink-muted">{item.label}</dt>
          <dd
            className={cn(
              "selectable mt-0.5 break-words text-sm font-medium text-ink",
              item.mono && "font-mono text-[12.5px] font-normal",
            )}
          >
            {item.value ?? "—"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
