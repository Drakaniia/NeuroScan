import { describe, expect, it, vi } from "vitest";
import { createAppShortcuts } from "./navigation";

describe("navigation shortcuts", () => {
  it("maps the global accelerators to the clinical areas", () => {
    const navigate = vi.fn();
    const shortcuts = createAppShortcuts(navigate);

    shortcuts["ctrl+1"]();
    shortcuts["ctrl+2"]();
    shortcuts["ctrl+3"]();
    shortcuts["ctrl+,"]();
    shortcuts.f1();

    expect(navigate.mock.calls).toEqual([
      ["/"],
      ["/patients"],
      ["/exams"],
      ["/settings"],
      ["/about"],
    ]);
  });
});
