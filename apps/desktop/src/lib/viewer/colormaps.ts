/**
 * Colormaps for the activation (CAM) overlay. Perceptually ordered maps
 * (inferno, viridis) are the default because they read correctly in
 * grayscale print and for colour-vision deficiencies; "hot" is offered for
 * readers used to it.
 */
export type ColormapName = "inferno" | "viridis" | "hot";

type Stop = readonly [number, number, number];

const STOPS: Record<ColormapName, readonly Stop[]> = {
  inferno: [
    [0, 0, 4],
    [31, 12, 72],
    [85, 15, 109],
    [136, 34, 106],
    [186, 54, 85],
    [227, 89, 51],
    [249, 140, 10],
    [249, 201, 50],
    [252, 255, 164],
  ],
  viridis: [
    [68, 1, 84],
    [72, 40, 120],
    [62, 74, 137],
    [49, 104, 142],
    [38, 130, 142],
    [31, 158, 137],
    [53, 183, 121],
    [109, 205, 89],
    [180, 222, 44],
    [253, 231, 37],
  ],
  hot: [
    [11, 0, 0],
    [128, 0, 0],
    [230, 0, 0],
    [255, 92, 0],
    [255, 190, 0],
    [255, 255, 80],
    [255, 255, 255],
  ],
};

export const COLORMAP_LABELS: Record<ColormapName, string> = {
  inferno: "Inferno",
  viridis: "Viridis",
  hot: "Hot",
};

const LUTS = new Map<ColormapName, Uint8ClampedArray>();

/** 256-entry RGB lookup table. */
export function colormapLut(name: ColormapName): Uint8ClampedArray {
  const cached = LUTS.get(name);
  if (cached) return cached;
  const stops = STOPS[name];
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i += 1) {
    const position = (i / 255) * (stops.length - 1);
    const lower = Math.floor(position);
    const upper = Math.min(lower + 1, stops.length - 1);
    const mix = position - lower;
    for (let c = 0; c < 3; c += 1) {
      lut[i * 3 + c] =
        stops[lower][c] + (stops[upper][c] - stops[lower][c]) * mix;
    }
  }
  LUTS.set(name, lut);
  return lut;
}

export function colormapGradient(name: ColormapName): string {
  const lut = colormapLut(name);
  const parts: string[] = [];
  for (let i = 0; i <= 8; i += 1) {
    const index = Math.round((i / 8) * 255) * 3;
    parts.push(
      `rgb(${lut[index]}, ${lut[index + 1]}, ${lut[index + 2]}) ${i * 12.5}%`,
    );
  }
  return `linear-gradient(to right, ${parts.join(", ")})`;
}
