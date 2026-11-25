import { MENU_IDS, type MenuItemId } from "./menu-ids";

export type AppRoute =
  | "/"
  | "/patients"
  | "/exams"
  | "/audit"
  | "/settings"
  | "/about";

type Navigate = (to: AppRoute) => void;

/**
 * Route targets for the menu's navigation ids.
 *
 * The menu bar and `useKeyboardShortcuts` both resolve through this file, so
 * a menu item and its accelerator can never disagree about where they go.
 * Ids that are not plain navigation (new patient, lock, sign out, exit,
 * shortcuts) are resolved by `dispatchMenuAction`.
 */
export const MENU_ROUTES: Partial<Record<MenuItemId, AppRoute>> = {
  [MENU_IDS.viewWorklist]: "/",
  [MENU_IDS.viewPatients]: "/patients",
  [MENU_IDS.viewExaminations]: "/exams",
  [MENU_IDS.viewAudit]: "/audit",
  [MENU_IDS.viewSettings]: "/settings",
  [MENU_IDS.helpAbout]: "/about",
};

/** Global navigation accelerators, active everywhere inside the shell. */
export function createAppShortcuts(navigate: Navigate) {
  return {
    "ctrl+1": () => navigate("/"),
    "ctrl+2": () => navigate("/patients"),
    "ctrl+3": () => navigate("/exams"),
    "ctrl+,": () => navigate("/settings"),
    f1: () => navigate("/about"),
  };
}
