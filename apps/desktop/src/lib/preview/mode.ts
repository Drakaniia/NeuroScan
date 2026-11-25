/**
 * Design preview mode (development only).
 *
 * `pnpm dev` in a plain browser has no Tauri backend, so every clinical
 * screen would show "backend unavailable". Opening the dev server with
 * `?preview` (or `?preview=login|setup|locked`) answers backend commands from
 * in-memory fixtures instead, so the interface can be reviewed visually.
 *
 * Gated on `import.meta.env.DEV`: production builds strip it, and inside the
 * desktop app the real backend is always used.
 */
import { isTauriRuntime } from "@/lib/tauri";

export type PreviewPhase = "active" | "login" | "setup" | "locked";

const KEY = "neuroscan:preview";

export function previewPhase(): PreviewPhase | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;
  if (isTauriRuntime()) return null;
  const param = new URLSearchParams(window.location.search).get("preview");
  if (param !== null) {
    const phase: PreviewPhase =
      param === "login" || param === "setup" || param === "locked"
        ? param
        : "active";
    window.sessionStorage.setItem(KEY, phase);
    return phase;
  }
  const stored = window.sessionStorage.getItem(KEY);
  return stored ? (stored as PreviewPhase) : null;
}

export function isPreviewMode(): boolean {
  return previewPhase() !== null;
}
