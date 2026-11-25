"use client";

import { invoke } from "@tauri-apps/api/tauri";
import { useCallback, useEffect, useState } from "react";
import { subscribeToQuitRequests } from "../menu-events";
import { isTauriRuntime } from "../tauri";

export interface QuitGuard {
  /** True while the backend is waiting on the user's decision. */
  isPending: boolean;
  /** Ask to quit. The backend decides silently-quit vs confirm. */
  requestQuit: () => void;
  /** Tell the backend to quit. */
  confirmQuit: () => void;
  /** Stand the guard down: clears the pending flag and the fallback timer. */
  cancelQuit: () => void;
}

/**
 * Drives the guarded quit.
 *
 * The backend decides *when* a quit needs confirming — it is the layer that knows
 * whether a screening run is mid-flight — and starts a fallback timer. This hook
 * is the webview's half: it asks, answers, and shows the confirmation. Answering
 * promptly is what keeps the native fallback dialog from appearing.
 */
export function useQuitGuard(): QuitGuard {
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    subscribeToQuitRequests(() => setIsPending(true)).then((off) => {
      if (cancelled) off();
      else unsubscribe = off;
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const requestQuit = useCallback(() => {
    if (!isTauriRuntime()) return;
    void invoke("request_quit");
  }, []);

  const confirmQuit = useCallback(() => {
    if (!isTauriRuntime()) return;
    void invoke("confirm_quit");
  }, []);

  const cancelQuit = useCallback(() => {
    setIsPending(false);
    if (!isTauriRuntime()) return;
    void invoke("cancel_quit");
  }, []);

  return { isPending, requestQuit, confirmQuit, cancelQuit };
}
