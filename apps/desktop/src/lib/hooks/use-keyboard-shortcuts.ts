"use client";

import { useEffect } from "react";

/**
 * Whether the focused control consumes this keystroke itself.
 *
 * A text field turns a printable key into a character and a button turns Space
 * into a press — a global shortcut must not steal either. Only bare printable
 * keys consult this; modified commands and named keys (Escape, Delete, arrows)
 * are never "typed" input, so they keep working from a focused field.
 */
function ownsKeystroke(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;

  switch (target.tagName) {
    case "INPUT":
    case "TEXTAREA":
    case "SELECT":
    case "BUTTON":
      return true;
    case "A":
      return target.hasAttribute("href");
    default:
      return target.getAttribute("role") === "button";
  }
}

/**
 * Hook to handle global keyboard shortcuts
 * Follows Apple Design: Efficient keyboard navigation for power users
 */
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      // The platform-primary modifier: Cmd on macOS, Ctrl everywhere else. The
      // registry spells both as `ctrl+`, so the native menu accelerators and
      // these in-page shortcuts stay described by one set of keys.
      const primary = e.metaKey || e.ctrlKey;
      const combo = [
        primary && "ctrl",
        e.shiftKey && "shift",
        e.altKey && "alt",
        key,
      ]
        .filter(Boolean)
        .join("+");

      // A bare printable key belongs to whatever has focus: a number field keeps
      // its digits, a focused button keeps its Space.
      const isBareCharacter = !primary && !e.altKey && key.length === 1;
      if (isBareCharacter && ownsKeystroke(e.target)) return;

      if (shortcuts[combo]) {
        e.preventDefault();
        shortcuts[combo]();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}
