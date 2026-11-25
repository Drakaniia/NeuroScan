import { ConfirmDialog } from "@/components/ui/Dialog";

export interface QuitConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The guarded-quit confirmation, shown when an AI analysis is still running
 * and the user asked to leave (File › Exit, the close button, Alt+F4). Cancel
 * is focused, so the safe choice is the easy one.
 */
export function QuitConfirmDialog({
  open,
  onConfirm,
  onCancel,
}: QuitConfirmDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onClose={onCancel}
      onConfirm={onConfirm}
      title="Quit NeuroScan?"
      description="An AI analysis is still running. Quitting stops it; results already completed are saved and the examination can be analyzed again later."
      confirmLabel="Quit anyway"
      tone="danger"
    />
  );
}
