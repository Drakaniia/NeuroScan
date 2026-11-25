import { createContext, useContext } from "react";

export interface ShellActions {
  /** Open the patient registration dialog (respects permissions). */
  registerPatient: () => void;
  showShortcuts: () => void;
  /** Open the command palette (Ctrl+K). */
  openCommandPalette: () => void;
}

export const ShellContext = createContext<ShellActions | null>(null);

export function useShell(): ShellActions {
  const context = useContext(ShellContext);
  if (!context) throw new Error("useShell must be used inside AppShell");
  return context;
}
