import { describe, expect, it } from "vitest";
import { defaultWindow, sampleActivation, windowToImageData } from "./render";

function target(width: number, height: number): ImageData {
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
    colorSpace: "srgb",
  } as ImageData;
}

describe("viewer windowing", () => {
  const frame = {
    width: 4,
    height: 1,
    values: new Float32Array([0, 50, 100, 200]),
  };

  it("maps values linearly through the window and clamps", () => {
    const image = windowToImageData(
      frame,
      { center: 100, width: 100 },
      false,
      target(4, 1),
    );
    // low edge 50 → 0, high edge 150 → 255
    expect(Array.from(image.data.filter((_, i) => i % 4 === 0))).toEqual([
      0, 0, 128, 255,
    ]);
  });

  it("inverts after windowing", () => {
    const image = windowToImageData(
      frame,
      { center: 100, width: 100 },
      true,
      target(4, 1),
    );
    expect(image.data[0]).toBe(255);
    expect(image.data[12]).toBe(0);
  });

  it("falls back to the value range when no window is stored", () => {
    expect(
      defaultWindow({
        windowCenter: 0,
        windowWidth: 0,
        valueMin: 10,
        valueMax: 30,
      }),
    ).toEqual({
      center: 20,
      width: 20,
    });
  });
});

describe("activation sampling", () => {
  it("interpolates the coarse map over the image", () => {
    const map = { width: 2, height: 1, values: [0, 1] };
    expect(sampleActivation(map, 100, 100, 0, 50)).toBeCloseTo(0);
    expect(sampleActivation(map, 100, 100, 99, 50)).toBeCloseTo(1);
    const middle = sampleActivation(map, 100, 100, 50, 50) ?? -1;
    expect(middle).toBeGreaterThan(0.4);
    expect(middle).toBeLessThan(0.6);
    expect(sampleActivation(map, 100, 100, -1, 0)).toBeNull();
  });
});
