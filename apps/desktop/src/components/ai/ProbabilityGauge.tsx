import type { Verdict } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const FILL: Record<Verdict, string> = {
  positive: "bg-danger",
  indeterminate: "bg-warning",
  negative: "bg-success",
};

/**
 * The screening probability on a 0–100 % scale, with the model's decision
 * threshold τ and its low-confidence band drawn on the same axis, so the
 * reader sees how far the result sits from the operating point. The fill
 * grows from zero when a new result arrives (transform only).
 */
export function ProbabilityGauge({
  probability,
  threshold,
  band,
  verdict,
  tone = "light",
}: {
  probability: number;
  threshold: number;
  band: number;
  verdict: Verdict;
  tone?: "light" | "viewer";
}) {
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  const pct = (value: number) => `${clamp(value) * 100}%`;
  return (
    <div>
      {/* biome-ignore lint/a11y/useSemanticElements: the gauge draws the threshold and band, which <meter> cannot */}
      <div
        className={cn(
          "relative h-2 rounded-full",
          tone === "light" ? "bg-black/[0.07]" : "bg-white/10",
        )}
        role="meter"
        aria-label="Screening probability"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(probability * 100)}
        aria-valuetext={`${(probability * 100).toFixed(1)} percent; decision threshold ${(threshold * 100).toFixed(1)} percent`}
      >
        <div
          aria-hidden="true"
          className="absolute -inset-y-1 rounded-[3px] bg-warning/20 shadow-[inset_0_0_0_0.5px_rgb(var(--ns-warning)/0.35)]"
          style={{
            left: pct(threshold - band),
            width: pct(
              Math.min(1, threshold + band) - Math.max(0, threshold - band),
            ),
          }}
        />
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-y-0 left-0 w-full origin-left rounded-full transition-transform duration-slow ease-out",
            FILL[verdict],
          )}
          style={{
            transform: `scaleX(${clamp(probability)})`,
          }}
        />
        <div
          aria-hidden="true"
          className={cn(
            "absolute -inset-y-1.5 w-[2px] rounded-full",
            tone === "light" ? "bg-ink" : "bg-viewer-ink",
          )}
          style={{ left: `calc(${pct(threshold)} - 1px)` }}
        />
      </div>
      <div
        className={cn(
          "mt-1.5 flex justify-between font-mono text-2xs tabular",
          tone === "light" ? "text-ink-muted" : "text-viewer-muted",
        )}
      >
        <span>0</span>
        <span>
          τ {(threshold * 100).toFixed(0)}% ± {(band * 100).toFixed(0)}
        </span>
        <span>100</span>
      </div>
    </div>
  );
}
