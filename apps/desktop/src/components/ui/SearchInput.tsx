import { Search, X } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/**
 * macOS-style search field: a soft recessed capsule that brightens into a
 * white well with an accent halo on focus. Escape clears before it closes
 * anything else.
 */
export const SearchInput = forwardRef<
  HTMLInputElement,
  {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    label: string;
    className?: string;
    /** Shortcut hint rendered inside the field while it is empty. */
    shortcut?: string;
  }
>(function SearchInput(
  { value, onChange, placeholder, label, className, shortcut },
  ref,
) {
  return (
    <div className={cn("group relative", className)}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-[15px] -translate-y-1/2 text-ink-muted"
        aria-hidden="true"
      />
      <input
        ref={ref}
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.stopPropagation();
            onChange("");
          }
        }}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="none"
        className="h-8 w-full rounded-lg bg-black/[0.05] pl-8 pr-14 text-sm text-ink shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.05)] transition-[background-color,box-shadow] duration-fast placeholder:text-ink-muted hover:bg-black/[0.07] focus:bg-surface focus:shadow-[0_0_0_1px_rgb(var(--ns-accent)),0_0_0_4px_rgb(var(--ns-accent)/0.18)] focus:outline-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="pressable absolute right-1 top-1/2 flex size-6 min-h-6 min-w-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/[0.18] text-white hover:bg-black/[0.3] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        >
          <X className="size-3" strokeWidth={3} aria-hidden="true" />
        </button>
      ) : shortcut ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-2xs text-ink-faint group-focus-within:opacity-0"
        >
          {shortcut}
        </span>
      ) : null}
    </div>
  );
});
