import { imageUrls } from "@/lib/api/client";
import { isPreviewMode } from "@/lib/preview/mode";
import { phantomSpec, phantomValues } from "@/lib/preview/phantom";

/**
 * Loads an image's grayscale values from the backend's frame endpoint
 * (little-endian float32, row-major) and keeps a few recent frames in memory
 * so scrolling back and forth through a series is instant. The cache is
 * bounded by bytes, not by count, because a single large raster can be tens
 * of megabytes.
 */

export interface Frame {
  width: number;
  height: number;
  values: Float32Array;
}

const MAX_CACHE_BYTES = 256 * 1024 * 1024;
const cache = new Map<string, Frame>();
const inflight = new Map<string, Promise<Frame>>();
let cachedBytes = 0;

function remember(id: string, frame: Frame) {
  const existing = cache.get(id);
  if (existing) cachedBytes -= existing.values.byteLength;
  cache.delete(id);
  cache.set(id, frame);
  cachedBytes += frame.values.byteLength;
  while (cachedBytes > MAX_CACHE_BYTES && cache.size > 1) {
    const oldest = cache.keys().next().value as string;
    const evicted = cache.get(oldest);
    cache.delete(oldest);
    cachedBytes -= evicted?.values.byteLength ?? 0;
  }
}

export function cachedFrame(id: string): Frame | undefined {
  const frame = cache.get(id);
  if (frame) {
    cache.delete(id);
    cache.set(id, frame);
  }
  return frame;
}

export async function loadFrame(
  id: string,
  width: number,
  height: number,
): Promise<Frame> {
  const cached = cachedFrame(id);
  if (cached) return cached;
  const pending = inflight.get(id);
  if (pending) return pending;

  const request = (async () => {
    if (import.meta.env.DEV && isPreviewMode()) {
      const frame = { width, height, values: phantomValues(phantomSpec(id)) };
      remember(id, frame);
      return frame;
    }
    const response = await fetch(imageUrls.frame(id), { cache: "no-store" });
    if (!response.ok) {
      const message =
        (await response.text().catch(() => "")) || `HTTP ${response.status}`;
      throw new Error(
        response.status === 401
          ? "The session is locked or has ended; images are hidden."
          : `The image could not be loaded: ${message}`,
      );
    }
    const values = new Float32Array(await response.arrayBuffer());
    if (values.length !== width * height) {
      throw new Error(
        `The stored image has ${values.length} pixels, but ${width}×${height} were expected.`,
      );
    }
    const frame = { width, height, values };
    remember(id, frame);
    return frame;
  })();

  inflight.set(id, request);
  try {
    return await request;
  } finally {
    inflight.delete(id);
  }
}

/** Drop every cached frame (on sign-out or lock). */
export function clearFrameCache() {
  cache.clear();
  cachedBytes = 0;
}
