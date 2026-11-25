import { AlertTriangle, Loader2 } from "lucide-react";
import {
  forwardRef,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { AnalysisRecord, ImageItem } from "@/lib/api/types";
import { type Frame, loadFrame } from "@/lib/viewer/frames";
import {
  activationCanvas,
  type OverlaySettings,
  sampleActivation,
  sampleFrame,
  type WindowLevel,
  windowToImageData,
} from "@/lib/viewer/render";
import { cn } from "@/lib/utils";

export type ViewerTool = "wl" | "pan";

export interface ViewState {
  /** 1 = fitted to the viewport. */
  zoom: number;
  panX: number;
  panY: number;
}

export const FITTED: ViewState = { zoom: 1, panX: 0, panY: 0 };

export interface ImageViewerHandle {
  /** Composite of what is on screen at the image's native resolution. */
  snapshot: (options: { overlay: boolean }) => HTMLCanvasElement | null;
}

export interface ImageViewerProps {
  image: ImageItem;
  analysis: AnalysisRecord | null;
  window: WindowLevel;
  onWindowChange: (window: WindowLevel) => void;
  invert: boolean;
  view: ViewState;
  onViewChange: (view: ViewState) => void;
  tool: ViewerTool;
  overlay: OverlaySettings;
  /** Force the overlay off (left pane of the comparison layout). */
  suppressOverlay?: boolean;
  /** Text drawn in the corners, DICOM-viewer style. */
  annotations?: { topLeft?: ReactNode; topRight?: ReactNode };
  label?: string;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 16;

/**
 * Canvas image viewer.
 *
 * The frame's full-precision values are windowed in the browser, so window
 * and level respond on every pointer move without a round trip. Left drag
 * uses the active tool, right drag always adjusts window/level, middle drag
 * always pans, the wheel zooms about the pointer and a double click fits.
 */
export const ImageViewer = forwardRef<ImageViewerHandle, ImageViewerProps>(
  function ImageViewer(
    {
      image,
      analysis,
      window: windowLevel,
      onWindowChange,
      invert,
      view,
      onViewChange,
      tool,
      overlay,
      suppressOverlay = false,
      annotations,
      label,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const imageDataRef = useRef<ImageData | null>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [frame, setFrame] = useState<Frame | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [size, setSize] = useState({ width: 0, height: 0 });
    const [cursor, setCursor] = useState<{
      x: number;
      y: number;
      value: number | null;
      activation: number | null;
    } | null>(null);
    const drag = useRef<{
      mode: "wl" | "pan";
      pointerId: number;
      startX: number;
      startY: number;
      startWindow: WindowLevel;
      startView: ViewState;
    } | null>(null);
    const pendingMove = useRef<{
      view?: ViewState;
      window?: WindowLevel;
      cursor?: {
        x: number;
        y: number;
        value: number | null;
        activation: number | null;
      } | null;
      hasCursor: boolean;
    } | null>(null);
    const rafId = useRef<number | null>(null);

    useEffect(
      () => () => {
        if (rafId.current !== null) cancelAnimationFrame(rafId.current);
      },
      [],
    );

    const showOverlay =
      overlay.visible && !suppressOverlay && Boolean(analysis?.activationMap);

    // Load pixels.
    useEffect(() => {
      let cancelled = false;
      setError(null);
      if (image.fileMissing) {
        setFrame(null);
        setError(
          "The stored image file is missing from the workstation's image store.",
        );
        return;
      }
      loadFrame(image.id, image.width, image.height)
        .then((loaded) => {
          if (!cancelled) setFrame(loaded);
        })
        .catch((caught: unknown) => {
          if (!cancelled) {
            setFrame(null);
            setError(caught instanceof Error ? caught.message : String(caught));
          }
        });
      return () => {
        cancelled = true;
      };
    }, [image.id, image.width, image.height, image.fileMissing]);

    // Track the viewport size.
    useLayoutEffect(() => {
      const element = containerRef.current;
      if (!element) return;
      const measure = () => {
        const rect = element.getBoundingClientRect();
        setSize((current) =>
          current.width === rect.width && current.height === rect.height
            ? current
            : { width: rect.width, height: rect.height },
        );
      };
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      return () => observer.disconnect();
    }, []);

    // Window the frame into an offscreen canvas.
    useEffect(() => {
      if (!frame) return;
      let canvas = imageCanvasRef.current;
      if (
        !canvas ||
        canvas.width !== frame.width ||
        canvas.height !== frame.height
      ) {
        canvas = document.createElement("canvas");
        canvas.width = frame.width;
        canvas.height = frame.height;
        imageCanvasRef.current = canvas;
        imageDataRef.current = null;
      }
      const data = windowToImageData(
        frame,
        windowLevel,
        invert,
        imageDataRef.current,
      );
      imageDataRef.current = data;
      canvas.getContext("2d")?.putImageData(data, 0, 0);
    }, [frame, windowLevel, invert]);

    // Build the overlay bitmap.
    useEffect(() => {
      const map = analysis?.activationMap;
      overlayCanvasRef.current = map ? activationCanvas(map, overlay) : null;
    }, [analysis?.activationMap, overlay]);

    const geometry = useCallback(() => {
      const iw = frame?.width ?? image.width;
      const ih = frame?.height ?? image.height;
      const fit = Math.min(size.width / iw, size.height / ih) || 1;
      const scale = fit * view.zoom;
      const ox = size.width / 2 + view.panX - (iw * scale) / 2;
      const oy = size.height / 2 + view.panY - (ih * scale) / 2;
      return { iw, ih, scale, ox, oy };
    }, [frame, image.width, image.height, size, view]);

    // Paint.
    // biome-ignore lint/correctness/useExhaustiveDependencies: repaint whenever any visual input changes
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || size.width === 0) return;
      const ratio = window.devicePixelRatio || 1;
      const width = Math.round(size.width * ratio);
      const height = Math.round(size.height * ratio);
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const source = imageCanvasRef.current;
      if (!frame || !source) return;
      const { iw, ih, scale, ox, oy } = geometry();
      ctx.setTransform(
        ratio * scale,
        0,
        0,
        ratio * scale,
        ratio * ox,
        ratio * oy,
      );
      ctx.imageSmoothingEnabled = view.zoom < 3;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(source, 0, 0, iw, ih);
      const overlayCanvas = overlayCanvasRef.current;
      if (showOverlay && overlayCanvas) {
        ctx.imageSmoothingEnabled = true;
        ctx.globalAlpha = Math.min(1, Math.max(0, overlay.opacity));
        ctx.drawImage(overlayCanvas, 0, 0, iw, ih);
        ctx.globalAlpha = 1;
      }
    }, [
      frame,
      size,
      view,
      windowLevel,
      invert,
      overlay,
      showOverlay,
      analysis?.activationMap,
      geometry,
    ]);

    useImperativeHandle(
      ref,
      () => ({
        snapshot: ({ overlay: withOverlay }) => {
          const source = imageCanvasRef.current;
          if (!frame || !source) return null;
          const out = document.createElement("canvas");
          out.width = frame.width;
          out.height = frame.height;
          const ctx = out.getContext("2d");
          if (!ctx) return null;
          ctx.drawImage(source, 0, 0);
          const overlayCanvas = overlayCanvasRef.current;
          if (withOverlay && overlayCanvas) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.globalAlpha = overlay.opacity;
            ctx.drawImage(overlayCanvas, 0, 0, frame.width, frame.height);
            ctx.globalAlpha = 1;
          }
          return out;
        },
      }),
      [frame, overlay.opacity],
    );

    // Wheel zoom about the pointer (non-passive so the page does not scroll).
    useEffect(() => {
      const element = containerRef.current;
      if (!element) return;
      const onWheel = (event: WheelEvent) => {
        event.preventDefault();
        const rect = element.getBoundingClientRect();
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;
        const { iw, ih, scale, ox, oy } = geometry();
        const nextZoom = Math.min(
          MAX_ZOOM,
          Math.max(MIN_ZOOM, view.zoom * Math.exp(-event.deltaY * 0.0015)),
        );
        const fit = scale / view.zoom;
        const nextScale = fit * nextZoom;
        const ix = (px - ox) / scale;
        const iy = (py - oy) / scale;
        const nextOx = px - ix * nextScale;
        const nextOy = py - iy * nextScale;
        onViewChange({
          zoom: nextZoom,
          panX: nextOx - size.width / 2 + (iw * nextScale) / 2,
          panY: nextOy - size.height / 2 + (ih * nextScale) / 2,
        });
      };
      element.addEventListener("wheel", onWheel, { passive: false });
      return () => element.removeEventListener("wheel", onWheel);
    }, [geometry, onViewChange, size, view.zoom]);

    const valueSpan = Math.max(1, image.valueMax - image.valueMin);

    const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!frame) return;
      const mode =
        event.button === 2
          ? "wl"
          : event.button === 1
            ? "pan"
            : event.button === 0
              ? tool
              : null;
      if (!mode) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = {
        mode,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startWindow: windowLevel,
        startView: view,
      };
    };

    const flushMove = useCallback(() => {
      rafId.current = null;
      const queued = pendingMove.current;
      pendingMove.current = null;
      if (!queued) return;
      if (queued.view) onViewChange(queued.view);
      if (queued.window) onWindowChange(queued.window);
      if (queued.hasCursor) setCursor(queued.cursor ?? null);
    }, [onViewChange, onWindowChange]);

    const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = drag.current;
      const queued = pendingMove.current ?? { hasCursor: false };
      if (state && state.pointerId === event.pointerId) {
        const dx = event.clientX - state.startX;
        const dy = event.clientY - state.startY;
        if (state.mode === "pan") {
          queued.view = {
            ...state.startView,
            panX: state.startView.panX + dx,
            panY: state.startView.panY + dy,
          };
        } else {
          const perPixel = valueSpan / 400;
          queued.window = {
            width: Math.max(1, state.startWindow.width + dx * perPixel),
            center: state.startWindow.center - dy * perPixel,
          };
        }
      }
      if (frame) {
        const rect = event.currentTarget.getBoundingClientRect();
        const { scale, ox, oy } = geometry();
        const x = (event.clientX - rect.left - ox) / scale;
        const y = (event.clientY - rect.top - oy) / scale;
        const value = sampleFrame(frame, x, y);
        const map = analysis?.activationMap;
        queued.hasCursor = true;
        queued.cursor =
          value === null
            ? null
            : {
                x: Math.floor(x),
                y: Math.floor(y),
                value,
                activation: map
                  ? sampleActivation(map, frame.width, frame.height, x, y)
                  : null,
              };
      }
      pendingMove.current = queued;
      if (rafId.current === null) {
        rafId.current = requestAnimationFrame(flushMove);
      }
    };

    const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (drag.current?.pointerId === event.pointerId) {
        drag.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }
    };

    const cursorClass =
      tool === "pan"
        ? "cursor-grab active:cursor-grabbing"
        : "cursor-crosshair";

    return (
      <div
        ref={containerRef}
        role="img"
        aria-label={
          label ??
          `${image.originalName}${image.frameCount > 1 ? `, frame ${image.frameIndex + 1}` : ""}`
        }
        className={cn(
          "relative h-full w-full touch-none overflow-hidden bg-viewer-bg",
          cursorClass,
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => setCursor(null)}
        onDoubleClick={() => onViewChange(FITTED)}
        onContextMenu={(event) => event.preventDefault()}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {!frame && !error ? (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-viewer-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Loading image…
          </div>
        ) : null}
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="flex max-w-sm items-start gap-2 rounded-lg border border-viewer-line bg-viewer-panel px-4 py-3 text-sm text-viewer-ink">
              <AlertTriangle
                className="mt-0.5 size-4 shrink-0 text-warning"
                aria-hidden="true"
              />
              <span>{error}</span>
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-0 select-none p-2.5 font-mono text-2xs leading-4 text-viewer-ink/85 [text-shadow:0_1px_2px_rgb(0_0_0/0.9)]">
          <div className="absolute left-2.5 top-2">{annotations?.topLeft}</div>
          <div className="absolute right-2.5 top-2 text-right">
            {annotations?.topRight}
          </div>
          <div className="absolute bottom-2 left-2.5">
            <div>
              W {Math.round(windowLevel.width)} · L{" "}
              {Math.round(windowLevel.center)}
              {invert ? " · inverted" : ""}
            </div>
            <div>Zoom {Math.round(view.zoom * 100)}%</div>
          </div>
          <div className="absolute bottom-2 right-2.5 text-right">
            {cursor ? (
              <>
                <div>
                  ({cursor.x}, {cursor.y}) value{" "}
                  {Number.isInteger(cursor.value)
                    ? cursor.value
                    : cursor.value?.toFixed(1)}
                </div>
                {showOverlay && cursor.activation !== null ? (
                  <div>activation {(cursor.activation * 100).toFixed(0)}%</div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>
    );
  },
);
