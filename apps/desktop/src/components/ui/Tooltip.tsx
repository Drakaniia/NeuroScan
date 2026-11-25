import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * One provider for the whole window: the first tooltip waits, the ones after
 * it open instantly while the pointer moves along a toolbar.
 */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={450} skipDelayDuration={400}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function Tooltip({
  content,
  shortcut,
  children,
  side = "bottom",
  tone = "light",
  disabled = false,
}: {
  content: ReactNode;
  /** Keyboard shortcut shown after the label, e.g. "Ctrl+L". */
  shortcut?: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  tone?: "light" | "viewer";
  disabled?: boolean;
}) {
  if (disabled) return <>{children}</>;
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className={cn(
            "popover-motion tooltip-motion z-[120] flex max-w-xs items-center gap-2 rounded-md px-2 py-1 text-xs font-medium",
            tone === "light"
              ? "material-overlay text-ink"
              : "material-viewer text-viewer-ink",
          )}
        >
          {content}
          {shortcut ? (
            <span
              className={cn(
                "font-mono text-2xs",
                tone === "light" ? "text-ink-muted" : "text-viewer-muted",
              )}
            >
              {shortcut}
            </span>
          ) : null}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
