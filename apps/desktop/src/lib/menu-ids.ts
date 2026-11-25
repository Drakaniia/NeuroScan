/**
 * Menu ids, and the one event the backend still sends.
 *
 * The ids are the shared contract of the application menu: the menu bar
 * renders from `menu-definition.ts`, the router resolves them through
 * `MENU_ROUTES` in `navigation.ts`, and `menu-events.test.ts` asserts the two
 * cannot drift apart.
 */

export const MENU_IDS = {
  fileNewPatient: "menu:file:new-patient",
  fileLock: "menu:file:lock",
  fileSignOut: "menu:file:sign-out",
  fileExit: "menu:file:exit",

  viewWorklist: "menu:view:worklist",
  viewPatients: "menu:view:patients",
  viewExaminations: "menu:view:examinations",
  viewAudit: "menu:view:audit",
  viewSettings: "menu:view:settings",

  helpAbout: "menu:help:about",
  helpShortcuts: "menu:help:shortcuts",
} as const;

export type MenuItemId = (typeof MENU_IDS)[keyof typeof MENU_IDS];

/**
 * Rust → webview: a guarded quit is waiting on the user's decision.
 * Mirrors `QUIT_REQUESTED_EVENT` in `src-tauri/src/quit_guard.rs`.
 */
export const QUIT_REQUESTED_EVENT = "app://quit-requested";
