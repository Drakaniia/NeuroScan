import { Outlet, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { createAppShortcuts } from "@/lib/navigation";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { PatientFormDialog } from "@/screens/patients/PatientFormDialog";
import { CommandPalette } from "./CommandPalette";
import { ShellContext, type ShellActions } from "./shell-context";
import { ShortcutsDialog } from "./ShortcutsDialog";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";

/**
 * The signed-in frame: the floating sidebar, the routed screen, the status
 * bar, and the few surfaces reachable from anywhere (command palette,
 * register patient, shortcuts).
 */
export function AppShell({
  registerOpen,
  setRegisterOpen,
  shortcutsOpen,
  setShortcutsOpen,
}: {
  registerOpen: boolean;
  setRegisterOpen: (open: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const { can, lock } = useSession();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const actions = useMemo<ShellActions>(
    () => ({
      registerPatient: () => {
        if (can("patient_write")) setRegisterOpen(true);
        else
          toast.info(
            "Not available",
            "Your role does not permit registering patients.",
          );
      },
      showShortcuts: () => setShortcutsOpen(true),
      openCommandPalette: () => setPaletteOpen(true),
    }),
    [can, setRegisterOpen, setShortcutsOpen, toast],
  );

  const go = useCallback(
    (to: Parameters<typeof navigate>[0]["to"]) => void navigate({ to }),
    [navigate],
  );
  const shortcuts = useMemo(
    () => ({
      ...createAppShortcuts((to) => go(to)),
      "ctrl+k": () => setPaletteOpen((open) => !open),
      "ctrl+n": actions.registerPatient,
      "ctrl+l": () => void lock(),
      "?": actions.showShortcuts,
      "shift+?": actions.showShortcuts,
    }),
    [actions, go, lock],
  );
  useKeyboardShortcuts(shortcuts);

  return (
    <ShellContext.Provider value={actions}>
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main
          id="main-content"
          tabIndex={-1}
          className="print-root relative flex min-h-0 min-w-0 flex-1 flex-col outline-none"
        >
          <Outlet />
        </main>
      </div>
      <StatusBar />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onRegisterPatient={actions.registerPatient}
        onShowShortcuts={actions.showShortcuts}
      />
      <PatientFormDialog
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSaved={(patient) => {
          toast.success(
            "Patient registered",
            `MRN ${patient.mrn} · ${patient.familyName}, ${patient.givenName}`,
          );
          void navigate({
            to: "/patients/$patientId",
            params: { patientId: patient.id },
          });
        }}
      />
      <ShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </ShellContext.Provider>
  );
}

/**
 * Scrolling page body with the standard content width and padding. Once the
 * content scrolls, a soft glass edge appears where it passes beneath the title
 * bar — a scroll-edge effect instead of a permanent divider.
 */
export function Page({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  return (
    <div
      className="relative min-h-0 flex-1 overflow-y-auto"
      onScroll={(event) => {
        const next = event.currentTarget.scrollTop > 2;
        if (next !== scrolled) setScrolled(next);
      }}
    >
      <div
        aria-hidden="true"
        className={cn(
          "material-bar pointer-events-none sticky top-0 z-20 -mb-5 h-5 transition-opacity duration-normal [mask-image:linear-gradient(to_bottom,black_30%,transparent)]",
          scrolled ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "animate-fade-in",
          wide
            ? "px-6 pb-8 pt-4"
            : "mx-auto w-full max-w-[1320px] px-7 pb-8 pt-4",
        )}
      >
        {children}
      </div>
    </div>
  );
}
