import { listen } from "@tauri-apps/api/event";
import { MENU_IDS, QUIT_REQUESTED_EVENT } from "./menu-ids";
import { type AppRoute, MENU_ROUTES } from "./navigation";
import { isTauriRuntime } from "./tauri";

export interface MenuActionHandlers {
  navigate: (to: AppRoute) => void;
  newPatient: () => void;
  lock: () => void;
  signOut: () => void;
  showShortcuts: () => void;
  /** File > Exit and the close button: the backend decides whether to confirm first. */
  quit: () => void;
}

/**
 * Resolves one menu id into a handler call.
 *
 * Pure on purpose: every id in `menu-ids.ts` can be exercised in a test
 * without a Tauri runtime. Unknown ids fall through silently, so an id added
 * ahead of its feature can never throw.
 */
export function dispatchMenuAction(
  id: string,
  handlers: MenuActionHandlers,
): void {
  switch (id) {
    case MENU_IDS.fileExit:
      handlers.quit();
      return;
    case MENU_IDS.fileNewPatient:
      handlers.newPatient();
      return;
    case MENU_IDS.fileLock:
      handlers.lock();
      return;
    case MENU_IDS.fileSignOut:
      handlers.signOut();
      return;
    case MENU_IDS.helpShortcuts:
      handlers.showShortcuts();
      return;
    default: {
      const route = MENU_ROUTES[id as keyof typeof MENU_ROUTES];
      if (route) handlers.navigate(route);
    }
  }
}

/**
 * Subscribes to the backend's guarded-quit request.
 *
 * The backend raises this when an AI analysis is mid-flight and a quit was
 * asked for, whichever way it was asked for. A no-op outside Tauri.
 */
export async function subscribeToQuitRequests(
  onRequested: () => void,
): Promise<() => void> {
  if (!isTauriRuntime()) return () => {};
  return listen(QUIT_REQUESTED_EVENT, () => onRequested());
}
