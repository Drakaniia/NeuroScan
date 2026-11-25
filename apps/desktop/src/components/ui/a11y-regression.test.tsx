import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProbabilityGauge } from "@/components/ai/ProbabilityGauge";
import { SearchInput } from "@/components/ui/SearchInput";
import { AppErrorBoundary } from "@/routes/__root";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("UI audit regressions", () => {
  it("keeps the ProbabilityGauge bar mounted across updates so transitions retarget", () => {
    const { container, rerender } = render(
      <ProbabilityGauge
        probability={0.25}
        threshold={0.5}
        band={0.1}
        verdict="negative"
      />,
    );
    const bar = container.querySelector('[style*="scaleX"]');
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute("style")).toContain("scaleX(0.25)");

    rerender(
      <ProbabilityGauge
        probability={0.82}
        threshold={0.5}
        band={0.1}
        verdict="positive"
      />,
    );
    const nextBar = container.querySelector('[style*="scaleX"]');
    expect(nextBar).toBe(bar);
    expect(nextBar?.getAttribute("style")).toContain("scaleX(0.82)");
  });

  it("exposes a 24px+ clear button and clears on Escape in SearchInput", () => {
    const onChange = vi.fn();
    render(
      <SearchInput
        value="MRN-100"
        onChange={onChange}
        label="Search patients"
        placeholder="Search"
      />,
    );
    const clear = screen.getByRole("button", { name: "Clear search" });
    expect(clear.className).toContain("min-h-6");
    expect(clear.className).toContain("min-w-6");

    const input = screen.getByRole("searchbox", { name: "Search patients" });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("catches render crashes in AppErrorBoundary and recovers via Return to Worklist", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const onReturnHome = vi.fn();
    let shouldThrow = true;
    function CrashingChild() {
      if (shouldThrow) throw new Error("Simulated viewer failure");
      return <p>Recovered screen</p>;
    }

    render(
      <AppErrorBoundary onReturnHome={onReturnHome}>
        <CrashingChild />
      </AppErrorBoundary>,
    );

    expect(
      screen.getByText("Something went wrong on this screen"),
    ).toBeTruthy();
    expect(screen.getByText("Simulated viewer failure")).toBeTruthy();

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "Return to Worklist" }));
    expect(onReturnHome).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Recovered screen")).toBeTruthy();
  });
});
