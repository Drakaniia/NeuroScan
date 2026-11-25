import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "./IconButton";

export function Pagination({
  offset,
  limit,
  total,
  onChange,
  noun,
}: {
  offset: number;
  limit: number;
  total: number;
  onChange: (offset: number) => void;
  noun: string;
}) {
  if (total === 0) return null;
  const from = offset + 1;
  const to = Math.min(offset + limit, total);
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line/80 px-4 py-2 text-xs text-ink-muted">
      <span className="tabular">
        <span className="font-medium text-ink-secondary">
          {from.toLocaleString()}–{to.toLocaleString()}
        </span>{" "}
        of {total.toLocaleString()} {noun}
      </span>
      <div className="flex items-center gap-1">
        {pages > 1 ? (
          <span className="tabular mr-1">
            Page {page} of {pages}
          </span>
        ) : null}
        <IconButton
          size="sm"
          label="Previous page"
          tooltipSide="top"
          icon={<ChevronLeft className="size-4" aria-hidden="true" />}
          disabled={offset === 0}
          onClick={() => onChange(Math.max(0, offset - limit))}
        />
        <IconButton
          size="sm"
          label="Next page"
          tooltipSide="top"
          icon={<ChevronRight className="size-4" aria-hidden="true" />}
          disabled={to >= total}
          onClick={() => onChange(offset + limit)}
        />
      </div>
    </div>
  );
}
