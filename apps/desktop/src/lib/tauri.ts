/**
 * True inside the Tauri webview, false in a plain browser (`pnpm dev`).
 *
 * Tauri v1 injects its IPC bridge into every webview regardless of the
 * `withGlobalTauri` config flag, so the runtime is detectable without touching
 * `tauri.conf.json`. Everything desktop-only is gated on this: in the browser
 * the menu subscription becomes a no-op and the app behaves as it always has.
 */
export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_IPC__" in window;
}

/**
 * Opens a Help-menu destination outside the app.
 *
 * The browser path is a plain `window.open`. Inside the packaged app this hands
 * off to the system browser only once `allowlist.shell.open` (or the shell
 * plugin) is configured — see the menu bar spec, §14 Risk 9.
 */
export function openExternalUrl(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
