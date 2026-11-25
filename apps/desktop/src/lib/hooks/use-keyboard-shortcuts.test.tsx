import { cleanup, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useKeyboardShortcuts } from "./use-keyboard-shortcuts";

/**
 * These pin the boundary between global shortcuts and the focused control:
 * a single screen binds bare keys ("0", " ", "+"), and they must never eat a
 * character the user typed or replace the focused button's own activation.
 */

let fixtures: HTMLElement[] = [];

function mount<T extends HTMLElement>(element: T): T {
  document.body.appendChild(element);
  fixtures.push(element);
  return element;
}

function numberInput() {
  const input = mount(document.createElement("input"));
  input.type = "number";
  input.focus();
  return input;
}

afterEach(() => {
  cleanup();
  for (const fixture of fixtures) fixture.remove();
  fixtures = [];
});

describe("useKeyboardShortcuts", () => {
  it("fires a bare shortcut when nothing owns the keystroke", () => {
    const action = vi.fn();
    renderHook(() => useKeyboardShortcuts({ " ": action }));

    fireEvent.keyDown(document.body, { key: " " });

    expect(action).toHaveBeenCalledTimes(1);
  });

  it("leaves a digit typed into a number field alone", () => {
    const reset = vi.fn();
    renderHook(() => useKeyboardShortcuts({ "0": reset }));
    const input = numberInput();

    const notPrevented = fireEvent.keyDown(input, { key: "0" });

    // `false` means preventDefault was not called, so the character lands.
    expect(notPrevented).toBe(true);
    expect(reset).not.toHaveBeenCalled();
  });

  it("does not take Space away from the focused button", () => {
    const toggle = vi.fn();
    renderHook(() => useKeyboardShortcuts({ " ": toggle }));
    const button = mount(document.createElement("button"));
    button.focus();

    fireEvent.keyDown(button, { key: " " });

    expect(toggle).not.toHaveBeenCalled();
  });

  it("still routes Space from the page body", () => {
    const toggle = vi.fn();
    renderHook(() => useKeyboardShortcuts({ " ": toggle }));

    fireEvent.keyDown(document.body, { key: " " });

    expect(toggle).toHaveBeenCalledTimes(1);
  });

  it("keeps modified commands working while a field has focus", () => {
    const open = vi.fn();
    renderHook(() => useKeyboardShortcuts({ "ctrl+o": open }));
    const input = numberInput();

    fireEvent.keyDown(input, { key: "o", ctrlKey: true });

    expect(open).toHaveBeenCalledTimes(1);
  });

  it("keeps Escape working while a field has focus", () => {
    const escapeKey = vi.fn();
    renderHook(() => useKeyboardShortcuts({ escape: escapeKey }));
    const input = numberInput();

    fireEvent.keyDown(input, { key: "Escape" });

    expect(escapeKey).toHaveBeenCalledTimes(1);
  });

  it("fires Delete from a focused checkbox, which Space activates but typing does not", () => {
    const remove = vi.fn();
    renderHook(() => useKeyboardShortcuts({ delete: remove }));
    const checkbox = mount(document.createElement("input"));
    checkbox.type = "checkbox";
    checkbox.focus();

    fireEvent.keyDown(checkbox, { key: "Delete" });

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
