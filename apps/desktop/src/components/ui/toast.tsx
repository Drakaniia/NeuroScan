import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { Toaster, toast as sonner } from "sonner";

export type ToastTone = "success" | "error" | "info";

export interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Milliseconds; errors stay until dismissed unless set. */
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastApi {
  show: (toast: ToastInput) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

/**
 * Non-blocking notifications (sonner), bottom-right above the status bar.
 * Success and info dismiss themselves; errors persist until read, because a
 * failure the user never saw is a failure they cannot act on.
 */
function show(input: ToastInput) {
  const tone = input.tone ?? "info";
  const duration =
    input.duration ?? (tone === "error" ? Number.POSITIVE_INFINITY : 4500);
  const options = {
    description: input.description,
    duration,
    action: input.action
      ? { label: input.action.label, onClick: input.action.onClick }
      : undefined,
  };
  if (tone === "success") sonner.success(input.title, options);
  else if (tone === "error") sonner.error(input.title, options);
  else sonner.info(input.title, options);
}

const api: ToastApi = {
  show,
  success: (title, description) => show({ title, description, tone: "success" }),
  error: (title, description) => show({ title, description, tone: "error" }),
  info: (title, description) => show({ title, description, tone: "info" }),
};

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        visibleToasts={4}
        closeButton
        gap={8}
        offset={{ bottom: 40, right: 16 }}
        icons={{
          success: (
            <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
          ),
          error: <AlertCircle className="size-4 text-danger" aria-hidden="true" />,
          info: <Info className="size-4 text-accent" aria-hidden="true" />,
        }}
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              "material-overlay group pointer-events-auto flex w-[360px] max-w-[calc(100vw-2rem)] items-start gap-2.5 rounded-xl px-3.5 py-3 text-ink",
            icon: "mt-0.5 flex size-4 shrink-0 items-center justify-center",
            content: "min-w-0 flex-1",
            title: "text-sm font-semibold text-ink",
            description:
              "selectable mt-0.5 break-words text-xs text-ink-secondary",
            actionButton:
              "pressable mt-0.5 shrink-0 self-center rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-white hover:bg-accent-hover",
            closeButton:
              "!left-auto !right-1.5 !top-1.5 !size-6 !min-h-6 !min-w-6 !translate-x-0 !translate-y-0 !rounded-full !border-0 !bg-transparent !text-ink-faint opacity-0 transition-opacity hover:!bg-black/[0.06] hover:!text-ink group-hover:opacity-100 group-data-[type=error]:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100",
            error: "ring-1 ring-inset ring-danger-line",
          },
        }}
      />
    </>
  );
}

export function useToast(): ToastApi {
  return useMemo(() => api, []);
}
