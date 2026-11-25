import type { ActivationMap } from "@/lib/api/types";
import { type ColormapName, colormapLut } from "./colormaps";
import type { Frame } from "./frames";

/**
 * Pixel pipelines for the viewer. The windowing formula is the same linear
 * VOI the backend applies for thumbnails and for the model input
 * (`imaging::decode::window_unit`), so what is on screen at the default
 * window matches what the model was shown.
 */

export interface WindowLevel {
  center: number;
  width: number;
}

export function windowToImageData(
  frame: Frame,
  window: WindowLevel,
  invert: boolean,
  target?: ImageData | null,
): ImageData {
  const { width, height, values } = frame;
  const image =
    target && target.width === width && target.height === height
      ? target
      : new ImageData(width, height);
  const data = image.data;
  const w = Math.max(1, window.width);
  const low = window.center - w / 2;
  for (let i = 0, p = 0; i < values.length; i += 1, p += 4) {
    // Same order of operations and rounding as `decode::render_u8` in the backend.
    let unit = (values[i] - low) / w;
    unit = unit < 0 ? 0 : unit > 1 ? 1 : unit;
    if (invert) unit = 1 - unit;
    const v = Math.round(unit * 255);
    data[p] = v;
    data[p + 1] = v;
    data[p + 2] = v;
    data[p + 3] = 255;
  }
  return image;
}

export interface OverlaySettings {
  visible: boolean;
  /** 0–1, applied when compositing. */
  opacity: number;
  /** Activations at or below this (0–1) are transparent. */
  floor: number;
  colormap: ColormapName;
}

export const DEFAULT_OVERLAY: OverlaySettings = {
  visible: true,
  opacity: 0.5,
  floor: 0.2,
  colormap: "inferno",
};

/**
 * The activation map as a small RGBA canvas at its native resolution (e.g.
 * 7×7). Drawn scaled with image smoothing it is bilinearly upsampled to the
 * image, which is how CAM itself is defined. Alpha ramps up from the floor so
 * cold regions do not tint the anatomy.
 */
export function activationCanvas(
  map: ActivationMap,
  settings: OverlaySettings,
): HTMLCanvasElement | null {
  if (
    map.width <= 0 ||
    map.height <= 0 ||
    map.values.length !== map.width * map.height
  )
    return null;
  const canvas = document.createElement("canvas");
  canvas.width = map.width;
  canvas.height = map.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const image = ctx.createImageData(map.width, map.height);
  const lut = colormapLut(settings.colormap);
  const floor = Math.min(0.95, Math.max(0, settings.floor));
  for (let i = 0; i < map.values.length; i += 1) {
    const value = Math.min(1, Math.max(0, map.values[i]));
    const index = Math.round(value * 255) * 3;
    const alpha = value <= floor ? 0 : (value - floor) / (1 - floor);
    image.data[i * 4] = lut[index];
    image.data[i * 4 + 1] = lut[index + 1];
    image.data[i * 4 + 2] = lut[index + 2];
    image.data[i * 4 + 3] = Math.round(alpha * 255);
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

/** Default window for an image: its stored VOI, falling back to its range. */
export function defaultWindow(image: {
  windowCenter: number;
  windowWidth: number;
  valueMin: number;
  valueMax: number;
}): WindowLevel {
  if (Number.isFinite(image.windowWidth) && image.windowWidth > 0) {
    return { center: image.windowCenter, width: image.windowWidth };
  }
  return {
    center: (image.valueMin + image.valueMax) / 2,
    width: Math.max(1, image.valueMax - image.valueMin),
  };
}

/** Window presets that make sense for the value range of this image. */
export function windowPresets(image: {
  valueMin: number;
  valueMax: number;
  windowCenter: number;
  windowWidth: number;
}): { label: string; window: WindowLevel }[] {
  const span = Math.max(1, image.valueMax - image.valueMin);
  const mid = (image.valueMin + image.valueMax) / 2;
  return [
    { label: "Default", window: defaultWindow(image) },
    { label: "Full range", window: { center: mid, width: span } },
    { label: "High contrast", window: { center: mid, width: span * 0.5 } },
    { label: "Low contrast", window: { center: mid, width: span * 1.5 } },
  ];
}

/** Value of the frame at image coordinates, or null outside it. */
export function sampleFrame(frame: Frame, x: number, y: number): number | null {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  if (ix < 0 || iy < 0 || ix >= frame.width || iy >= frame.height) return null;
  return frame.values[iy * frame.width + ix];
}

/** Activation (0–1) at image coordinates, bilinear like the overlay. */
export function sampleActivation(
  map: ActivationMap,
  imageWidth: number,
  imageHeight: number,
  x: number,
  y: number,
): number | null {
  if (x < 0 || y < 0 || x >= imageWidth || y >= imageHeight) return null;
  const fx = Math.min(
    map.width - 1,
    Math.max(0, (x / imageWidth) * map.width - 0.5),
  );
  const fy = Math.min(
    map.height - 1,
    Math.max(0, (y / imageHeight) * map.height - 0.5),
  );
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(map.width - 1, x0 + 1);
  const y1 = Math.min(map.height - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const at = (cx: number, cy: number) => map.values[cy * map.width + cx];
  const top = at(x0, y0) + (at(x1, y0) - at(x0, y0)) * tx;
  const bottom = at(x0, y1) + (at(x1, y1) - at(x0, y1)) * tx;
  return top + (bottom - top) * ty;
}
