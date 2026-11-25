import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { imageUrls } from "@/lib/api/client";
import type { ImageItem, JobProgress, Verdict } from "@/lib/api/types";
import { formatPercent, VERDICT_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";

const DOT: Record<Verdict, string> = {
  positive: "bg-danger",
  indeterminate: "bg-warning",
  negative: "bg-success",
};

const EDGE: Record<Verdict, string> = {
  positive: "ring-danger/70",
  indeterminate: "ring-warning/70",
  negative: "ring-transparent",
};

/**
 * The examination's images in acquisition order, as a filmstrip. Up/Down
 * move the selection (handled by the workspace). Each frame shows its AI
 * state: flagged slices carry a coloured edge so they stand out while
 * scrolling, and the probability sits on the frame itself.
 */
export function ImageStrip({
  images,
  selectedId,
  onSelect,
  onRemove,
  canRemove,
  job,
}: {
  images: ImageItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (image: ImageItem) => void;
  canRemove: boolean;
  job: JobProgress | null;
}) {
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!selectedId) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-image-id="${selectedId}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  return (
    <ul
      ref={listRef}
      aria-label="Images in this examination"
      className="space-y-2.5 p-2.5"
    >
      {images.map((image) => {
        const selected = image.id === selectedId;
        const analysis = image.latestAnalysis;
        const running = job?.currentImageId === image.id;
        const verdict =
          analysis?.status === "completed" ? analysis.verdict : null;
        return (
          <li
            key={image.id}
            data-image-id={image.id}
            className="group relative"
          >
            <button
              type="button"
              onClick={() => onSelect(image.id)}
              aria-current={selected ? "true" : undefined}
              aria-label={`Image ${image.seq}, ${image.originalName}${verdict ? `, AI ${VERDICT_LABELS[verdict]}` : ""}`}
              className="pressable block w-full rounded-lg text-left outline-none focus-visible:shadow-focus-viewer"
            >
              <span
                className={cn(
                  "relative block aspect-square w-full overflow-hidden rounded-lg bg-black ring-1 ring-inset transition-shadow duration-fast",
                  verdict ? EDGE[verdict] : "ring-white/[0.06]",
                  selected &&
                    "shadow-[0_0_0_2px_rgb(var(--ns-viewer-bg)),0_0_0_4px_rgb(var(--ns-viewer-accent))]",
                )}
              >
                {image.fileMissing ? (
                  <span className="flex h-full items-center justify-center text-2xs text-viewer-muted">
                    File missing
                  </span>
                ) : (
                  <img
                    src={imageUrls.thumbnail(image.id)}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    className={cn(
                      "h-full w-full object-contain transition-opacity duration-fast",
                      selected ? "opacity-100" : "opacity-75 group-hover:opacity-100",
                    )}
                  />
                )}
                {running ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/55">
                    <Loader2
                      className="size-5 animate-spin text-white"
                      aria-hidden="true"
                    />
                  </span>
                ) : null}
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/85 to-transparent px-1.5 pb-1 pt-4 text-2xs">
                  <span className="flex items-center gap-1 font-semibold text-viewer-ink">
                    {image.seq}
                    {image.frameCount > 1 ? (
                      <span className="font-normal text-viewer-muted">
                        ·{image.frameIndex + 1}/{image.frameCount}
                      </span>
                    ) : null}
                    {image.warnings.length > 0 ? (
                      <AlertTriangle
                        className="size-3 text-warning"
                        aria-label="Input warning"
                      />
                    ) : null}
                  </span>
                  {analysis?.status === "failed" ? (
                    <span className="font-medium text-[rgb(255_150_140)]">
                      Failed
                    </span>
                  ) : verdict ? (
                    <span className="flex items-center gap-1">
                      <span
                        className={cn("size-1.5 rounded-full", DOT[verdict])}
                        aria-hidden="true"
                      />
                      <span className="tabular font-mono text-viewer-ink">
                        {formatPercent(analysis?.probability ?? null, 0)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-viewer-muted">—</span>
                  )}
                </span>
              </span>
            </button>
            {canRemove ? (
              <button
                type="button"
                onClick={() => onRemove(image)}
                aria-label={`Remove image ${image.seq}`}
                title="Remove image"
                className="pressable absolute right-1.5 top-1.5 flex size-6 min-h-6 min-w-6 items-center justify-center rounded-full bg-black/60 text-viewer-ink opacity-0 backdrop-blur-sm hover:bg-danger hover:text-white focus-visible:opacity-100 focus-visible:shadow-focus-viewer group-hover:opacity-100 [@media(hover:none)]:opacity-100"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
