import {
  AlertTriangle,
  CircleCheck,
  CircleHelp,
  CircleSlash,
} from "lucide-react";
import type { Verdict } from "@/lib/api/types";
import { VERDICT_HINTS, VERDICT_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

const STYLE: Record<Verdict, string> = {
  positive:
    "bg-danger-soft text-danger-ink shadow-[inset_0_0_0_0.5px_rgb(var(--ns-danger-line))]",
  indeterminate:
    "bg-warning-soft text-warning-ink shadow-[inset_0_0_0_0.5px_rgb(var(--ns-warning-line))]",
  negative:
    "bg-success-soft text-success-ink shadow-[inset_0_0_0_0.5px_rgb(var(--ns-success-line))]",
};

const ICON = {
  positive: AlertTriangle,
  indeterminate: CircleHelp,
  negative: CircleCheck,
} as const;

/**
 * The AI screening signal. Always prefixed "AI" so it is never mistaken for
 * the clinician's conclusion, which is shown with `ImpressionBadge` (a square
 * chip on paper, where this one is a tinted capsule).
 */
export function VerdictBadge({
  verdict,
  size = "md",
  prefix = true,
  className,
}: {
  verdict: Verdict | null;
  size?: "sm" | "md";
  prefix?: boolean;
  className?: string;
}) {
  const sizing =
    size === "sm" ? "h-5 px-1.5 text-2xs" : "h-[22px] px-2 text-xs";
  if (!verdict) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-black/[0.04] font-medium text-ink-muted",
          sizing,
          className,
        )}
      >
        <CircleSlash className="size-3" aria-hidden="true" />
        {prefix ? "AI · not run" : "Not run"}
      </span>
    );
  }
  const Icon = ICON[verdict];
  return (
    <span
      title={VERDICT_HINTS[verdict]}
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full font-medium",
        sizing,
        STYLE[verdict],
        className,
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {prefix ? (
        <>
          <span className="font-semibold opacity-70">AI</span>
          {VERDICT_LABELS[verdict]}
        </>
      ) : (
        VERDICT_LABELS[verdict]
      )}
    </span>
  );
}
