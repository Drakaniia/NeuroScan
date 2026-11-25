import { Copy, Minus, Square, X } from "lucide-react";
import type { ReactNode } from "react";
import { QuitConfirmDialog } from "@/components/menu/QuitConfirmDialog";
import type { Permission } from "@/lib/api/types";
import { useQuitGuard } from "@/lib/hooks/use-quit-guard";
import { useWindowControls } from "@/lib/hooks/use-window-controls";
import { type MenuSection, visibleNodes } from "@/lib/menu-definition";
import type { MenuItemId } from "@/lib/menu-ids";
import { cn } from "@/lib/utils";
import { BrandMark } from "./BrandMark";
import { TitleBarMenu } from "./TitleBarMenu";

/**
 * The window frame. The window is borderless (`decorations: false`), so this
 * bar carries the product identity, the application menu (when signed in)
 * and the minimize / maximize / close controls. It is transparent over the
 * light-box canvas — chrome, not content — and `data-tauri-drag-region`
 * marks every empty stretch as the drag handle.
 */
export function TitleBar({
  sections,
  can,
  onMenuSelect,
  context,
}: {
  sections?: readonly MenuSection[];
  can?: (permission: Permission) => boolean;
  onMenuSelect?: (id: MenuItemId) => void;
  /** Facility name or other context shown beside the product name. */
  context?: ReactNode;
}) {
  const { isMaximized, minimize, toggleMaximize } = useWindowControls();
  const { isPending, requestQuit, confirmQuit, cancelQuit } = useQuitGuard();

  // Windows caption buttons: the platform's own shape and placement.
  const controlClass =
    "flex w-[46px] items-center justify-center text-ink-secondary transition-colors duration-fast hover:bg-black/[0.06] hover:text-ink active:bg-black/[0.1] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent";

  return (
    <>
      <div className="no-print relative z-40 flex h-[var(--titlebar-h)] shrink-0 select-none items-stretch">
        <div
          data-tauri-drag-region
          className="flex w-[calc(var(--sidebar-w)+8px)] shrink-0 items-center gap-2.5 pl-4 pr-2"
        >
          <BrandMark className="size-5" />
          <div data-tauri-drag-region className="flex min-w-0 flex-col">
            <span
              data-tauri-drag-region
              className="text-[13px] font-semibold leading-4 tracking-[-0.01em] text-ink"
            >
              NeuroScan
            </span>
            {context ? (
              <span
                data-tauri-drag-region
                className="truncate text-2xs leading-[13px] text-ink-muted"
              >
                {context}
              </span>
            ) : null}
          </div>
        </div>

        {sections && onMenuSelect ? (
          <div className="flex items-center">
            <TitleBarMenu
              sections={sections}
              nodesFor={(section) =>
                can ? visibleNodes(section, can) : section.nodes
              }
              onSelect={(id) => {
                if (id === "menu:file:exit") requestQuit();
                else onMenuSelect(id);
              }}
            />
          </div>
        ) : null}

        <div data-tauri-drag-region className="min-w-6 flex-1" />

        <div className="flex items-stretch">
          <button
            type="button"
            onClick={minimize}
            aria-label="Minimize window"
            className={controlClass}
          >
            <Minus className="size-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={toggleMaximize}
            aria-label={isMaximized ? "Restore window" : "Maximize window"}
            className={controlClass}
          >
            {isMaximized ? (
              <Copy
                className="size-3.5 -scale-x-100"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            ) : (
              <Square className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={requestQuit}
            aria-label="Close window"
            className={cn(
              controlClass,
              "hover:bg-[#c42b1c] hover:text-white active:bg-[#b0281a] active:text-white",
            )}
          >
            <X className="size-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>

      <QuitConfirmDialog
        open={isPending}
        onConfirm={confirmQuit}
        onCancel={cancelQuit}
      />
    </>
  );
}
