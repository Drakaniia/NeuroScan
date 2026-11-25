import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Tooltip } from "./Tooltip";

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name, also shown as the tooltip. */
  label: string;
  icon: ReactNode;
  tone?: "light" | "viewer";
  active?: boolean;
  size?: "sm" | "md";
  /** Shortcut shown in the tooltip. */
  shortcut?: string;
  tooltipSide?: "top" | "right" | "bottom" | "left";
}

/** A square icon-only button that always has an accessible name. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      label,
      icon,
      tone = "light",
      active,
      size = "md",
      shortcut,
      tooltipSide,
      className,
      type = "button",
      title: _title,
      ...rest
    },
    ref,
  ) {
    return (
      <Tooltip
        content={label}
        shortcut={shortcut}
        tone={tone}
        side={tooltipSide}
      >
        <button
          ref={ref}
          type={type}
          aria-label={label}
          aria-pressed={active}
          className={cn(
            "pressable inline-flex shrink-0 items-center justify-center rounded-md disabled:cursor-not-allowed disabled:opacity-40",
            size === "sm" ? "size-7" : "size-8",
            tone === "light"
              ? active
                ? "bg-accent-soft text-accent-ink"
                : "text-ink-secondary hover:bg-black/[0.05] hover:text-ink active:bg-black/[0.08]"
              : active
                ? "bg-white/[0.18] text-white shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.2)]"
                : "text-viewer-muted hover:bg-white/[0.1] hover:text-viewer-ink",
            className,
          )}
          {...rest}
        >
          {icon}
        </button>
      </Tooltip>
    );
  },
);
