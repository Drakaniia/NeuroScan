import { CheckCircle2, Clock, FileImage, Loader2, PenLine } from "lucide-react";
import type { ExamStatus, Impression, Priority } from "@/lib/api/types";
import {
  IMPRESSION_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Status chips: tinted fill with a half-pixel inner edge, no outer border, so
 * they read as labels on the row rather than as buttons.
 */
const BASE =
  "inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-medium";

const STATUS_STYLE: Record<ExamStatus, string> = {
  awaiting_images:
    "bg-black/[0.05] text-ink-secondary shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.08)]",
  ready:
    "bg-accent-soft text-accent-ink shadow-[inset_0_0_0_0.5px_rgb(var(--ns-accent-line))]",
  analyzing:
    "bg-progress-soft text-progress-ink shadow-[inset_0_0_0_0.5px_rgb(var(--ns-progress-line))]",
  awaiting_review:
    "bg-warning-soft text-warning-ink shadow-[inset_0_0_0_0.5px_rgb(var(--ns-warning-line))]",
  finalized:
    "bg-success-soft text-success-ink shadow-[inset_0_0_0_0.5px_rgb(var(--ns-success-line))]",
};

const STATUS_ICON = {
  awaiting_images: FileImage,
  ready: Clock,
  analyzing: Loader2,
  awaiting_review: PenLine,
  finalized: CheckCircle2,
} as const;

export function StatusBadge({
  status,
  className,
}: {
  status: ExamStatus;
  className?: string;
}) {
  const Icon = STATUS_ICON[status];
  return (
    <span className={cn(BASE, STATUS_STYLE[status], className)}>
      <Icon
        className={cn("size-3", status === "analyzing" && "animate-spin")}
        aria-hidden="true"
      />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  if (priority === "routine") {
    return (
      <span className="text-xs text-ink-muted">{PRIORITY_LABELS.routine}</span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-[5px] px-1.5 text-2xs font-bold uppercase tracking-[0.04em]",
        priority === "stat"
          ? "bg-danger text-white shadow-control-danger"
          : "bg-warning-soft text-warning-ink shadow-[inset_0_0_0_0.5px_rgb(var(--ns-warning-line))]",
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

/** The clinician's conclusion — visually distinct from the AI verdict. */
export function ImpressionBadge({
  impression,
  signed,
}: {
  impression: Impression | null;
  signed: boolean;
}) {
  if (!impression) return <span className="text-xs text-ink-faint">—</span>;
  return (
    <span
      className={cn(
        "inline-flex h-[22px] max-w-full items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-xs font-medium text-ink",
        signed
          ? "bg-surface shadow-[0_0_0_0.5px_rgb(0_0_0/0.2),0_1px_1px_rgb(0_0_0/0.04)]"
          : "border border-dashed border-line-strong bg-surface",
      )}
    >
      {signed ? (
        <CheckCircle2 className="size-3 shrink-0 text-success" aria-hidden="true" />
      ) : (
        <PenLine className="size-3 shrink-0 text-ink-muted" aria-hidden="true" />
      )}
      <span className="truncate">{IMPRESSION_LABELS[impression]}</span>
      {signed ? null : (
        <span className="shrink-0 font-normal text-ink-muted">(draft)</span>
      )}
    </span>
  );
}

export function Tag({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "warning" | "danger" | "success";
  className?: string;
}) {
  const tones = {
    neutral:
      "bg-black/[0.05] text-ink-secondary shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.06)]",
    accent:
      "bg-accent-soft text-accent-ink shadow-[inset_0_0_0_0.5px_rgb(var(--ns-accent-line))]",
    warning:
      "bg-warning-soft text-warning-ink shadow-[inset_0_0_0_0.5px_rgb(var(--ns-warning-line))]",
    danger:
      "bg-danger-soft text-danger-ink shadow-[inset_0_0_0_0.5px_rgb(var(--ns-danger-line))]",
    success:
      "bg-success-soft text-success-ink shadow-[inset_0_0_0_0.5px_rgb(var(--ns-success-line))]",
  };
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-[5px] px-1.5 text-2xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
