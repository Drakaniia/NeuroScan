import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** `alertdialog` for confirmations of consequential actions. */
  role?: "dialog" | "alertdialog";
  /** Prevent closing by Escape / backdrop while an action is in flight. */
  dismissible?: boolean;
}

/**
 * Modal sheet on a dimmed scrim. Focus moves in on open (to `[data-autofocus]`
 * when present) and returns to the trigger on close; Tab is contained; Escape
 * and the scrim close it unless an action is running. The panel materialises
 * — scale and blur together — rather than merely fading.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  role = "dialog",
  dismissible = true,
}: DialogProps) {
  const width = {
    sm: "max-w-[400px]",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  }[size];

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && dismissible) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="scrim-motion fixed inset-0 z-[80] bg-[rgb(16_18_27/0.32)]" />
        <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center p-6">
          <DialogPrimitive.Content
            role={role}
            onOpenAutoFocus={(event) => {
              const panel = event.currentTarget as HTMLElement | null;
              const body = panel?.querySelector("[data-dialog-body]");
              const target =
                panel?.querySelector<HTMLElement>("[data-autofocus]") ??
                body?.querySelector<HTMLElement>(FOCUSABLE) ??
                panel?.querySelector<HTMLElement>(FOCUSABLE);
              if (target) {
                event.preventDefault();
                target.focus();
              }
            }}
            onEscapeKeyDown={(event) => {
              event.stopPropagation();
              if (!dismissible) event.preventDefault();
            }}
            onPointerDownOutside={(event) => {
              if (!dismissible) event.preventDefault();
            }}
            onInteractOutside={(event) => {
              if (!dismissible) event.preventDefault();
            }}
            className={cn(
              "dialog-motion pointer-events-auto relative flex max-h-full w-full flex-col overflow-hidden rounded-xl bg-surface shadow-modal focus:outline-none",
              width,
            )}
          >
            <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-4">
              <div className="min-w-0">
                <DialogPrimitive.Title className="type-headline text-ink">
                  {title}
                </DialogPrimitive.Title>
                {description ? (
                  <DialogPrimitive.Description className="mt-1 text-sm text-ink-muted">
                    {description}
                  </DialogPrimitive.Description>
                ) : (
                  <DialogPrimitive.Description className="sr-only">
                    {title}
                  </DialogPrimitive.Description>
                )}
              </div>
              {dismissible ? (
                <DialogPrimitive.Close
                  aria-label="Close"
                  className="pressable -mr-1.5 -mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-black/[0.06] hover:text-ink"
                >
                  <X className="size-4" aria-hidden="true" />
                </DialogPrimitive.Close>
              ) : null}
            </header>
            <div
              data-dialog-body=""
              className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-1"
            >
              {children}
            </div>
            {footer ? (
              <footer className="flex items-center justify-end gap-2 border-t border-line bg-surface-muted/70 px-5 py-3">
                {footer}
              </footer>
            ) : null}
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  tone = "primary",
  loading = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  tone?: "primary" | "danger";
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      role="alertdialog"
      dismissible={!loading}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            data-autofocus
          >
            Cancel
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
