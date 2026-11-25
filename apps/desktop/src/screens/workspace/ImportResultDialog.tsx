import { CheckCircle2, Copy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { ImportSummary } from "@/lib/api/types";
import { pluralize } from "@/lib/format";

/** Stable keys for outcomes whose file names may repeat (same name in two folders). */
function withKeys(outcomes: ImportSummary["outcomes"]) {
  const seen = new Map<string, number>();
  return outcomes.map((outcome) => {
    const count = (seen.get(outcome.fileName) ?? 0) + 1;
    seen.set(outcome.fileName, count);
    return { outcome, key: `${outcome.fileName}#${count}` };
  });
}

/** Per-file outcome of an import, shown when anything was skipped or warned. */
export function ImportResultDialog({
  summary,
  onClose,
}: {
  summary: ImportSummary | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={summary !== null}
      onClose={onClose}
      title="Import result"
      description={
        summary
          ? `${pluralize(summary.importedImages, "image")} added from ${pluralize(summary.importedFiles, "file")} · ${summary.duplicates} duplicate · ${summary.rejected} rejected${summary.skipped ? ` · ${summary.skipped} non-image files ignored` : ""}`
          : undefined
      }
      size="lg"
      footer={
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <ul className="divide-y divide-line/70 overflow-hidden rounded-xl bg-surface-muted shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.07)]">
        {withKeys(summary?.outcomes ?? []).map(({ outcome, key }) => (
          <li key={key} className="flex items-start gap-2.5 px-3.5 py-2.5">
            {outcome.status === "imported" ? (
              <CheckCircle2
                className="mt-0.5 size-4 shrink-0 text-success"
                aria-label="Imported"
              />
            ) : outcome.status === "duplicate" ? (
              <Copy
                className="mt-0.5 size-4 shrink-0 text-ink-muted"
                aria-label="Duplicate"
              />
            ) : (
              <XCircle
                className="mt-0.5 size-4 shrink-0 text-danger"
                aria-label="Rejected"
              />
            )}
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-medium text-ink"
                title={outcome.fileName}
              >
                {outcome.fileName}
                {outcome.frames > 1 ? (
                  <span className="font-normal text-ink-muted">
                    {" "}
                    · {outcome.frames} frames
                  </span>
                ) : null}
              </p>
              {outcome.message ? (
                <p className="text-xs text-ink-secondary">{outcome.message}</p>
              ) : null}
              {outcome.warnings.map((warning) => (
                <p key={warning} className="text-xs text-warning-ink">
                  {warning}
                </p>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Dialog>
  );
}
