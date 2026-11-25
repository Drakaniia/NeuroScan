"use client";

import { appWindow } from "@tauri-apps/api/window";
import { useCallback, useEffect, useState } from "react";
import { isTauriRuntime } from "../tauri";

export interface WindowControls {
  isMaximized: boolean;
  minimize: () => void;
  toggleMaximize: () => void;
}

/**
 * Drives the custom title bar's minimize and maximize buttons.
 *
 * The window is borderless, so the OS provides no controls of its own. Closing is
 * deliberately not here: it goes through the quit guard, which owns the
 * "a screening run is still in progress" decision.
 *
 * Every call is a no-op outside Tauri, so the bar renders harmlessly in the
 * browser during `pnpm dev`.
 */
export function useWindowControls(): WindowControls {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    const sync = () => {
      void appWindow
        .isMaximized()
        .then(setIsMaximized)
        .catch(() => {
          // Reading the flag is not allowed or not available; the button keeps
          // its optimistic local state instead.
        });
    };

    sync();

    appWindow
      .onResized(sync)
      .then((off) => {
        if (cancelled) off();
        else unlisten = off;
      })
      .catch(() => {
        // Resize events unavailable; maximizing still works, the icon may lag.
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const minimize = useCallback(() => {
    if (!isTauriRuntime()) return;
    void appWindow.minimize().catch(() => {});
  }, []);

  const toggleMaximize = useCallback(() => {
    if (!isTauriRuntime()) return;
    // Optimistic, then corrected by the resize listener above.
    setIsMaximized((prev) => !prev);
    void appWindow.toggleMaximize().catch(() => {});
  }, []);

  return { isMaximized, minimize, toggleMaximize };
}
