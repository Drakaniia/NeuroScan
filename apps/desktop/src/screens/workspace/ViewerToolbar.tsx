import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import {
  ChevronDown,
  Columns2,
  Contrast,
  Download,
  Flame,
  Maximize,
  RotateCcw,
  SlidersHorizontal,
  SunMedium,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Segmented } from "@/components/ui/form";
import type { ViewerTool } from "@/components/viewer/ImageViewer";
import { cn } from "@/lib/utils";
import {
  COLORMAP_LABELS,
  type ColormapName,
  colormapGradient,
} from "@/lib/viewer/colormaps";
import type { OverlaySettings, WindowLevel } from "@/lib/viewer/render";

function Divider() {
  return (
    <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-white/10" />
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a toolbar group, not a form fieldset
    <div
      role="group"
      aria-label={label}
      className="flex shrink-0 items-center gap-0.5"
    >
      {children}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-xs text-viewer-ink">
        {label}
        <span className="tabular font-mono text-2xs text-viewer-muted">
          {value}%
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 w-full"
        aria-valuetext={`${value} percent`}
      />
      {hint ? (
        <span className="mt-0.5 block text-2xs text-viewer-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export interface ViewerToolbarProps {
  tool: ViewerTool;
  onToolChange: (tool: ViewerTool) => void;
  onZoom: (factor: number) => void;
  onFit: () => void;
  onReset: () => void;
  invert: boolean;
  onInvert: () => void;
  presets: { label: string; window: WindowLevel }[];
  onPreset: (window: WindowLevel) => void;
  overlay: OverlaySettings;
  onOverlayChange: (overlay: OverlaySettings) => void;
  overlayAvailable: boolean;
  compare: boolean;
  onCompare: () => void;
  onExport: () => void;
  exportBusy: boolean;
  canExport: boolean;
}

/**
 * The viewer's tools in one glass capsule. Common actions are one click;
 * window presets and heatmap tuning open from their own buttons, anchored
 * where they were invoked.
 */
export function ViewerToolbar(props: ViewerToolbarProps) {
  const { overlay, onOverlayChange, overlayAvailable } = props;
  const menuSurface =
    "popover-motion material-viewer z-[70] rounded-xl p-1.5 text-viewer-ink outline-none";

  return (
    <div className="flex h-12 shrink-0 items-center justify-center px-3">
      <div
        role="toolbar"
        aria-label="Image viewer tools"
        className="material-viewer flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl px-1.5 py-1 [scrollbar-width:none]"
      >
        <Group label="Mouse tool">
          <Segmented<ViewerTool>
            label="Mouse tool"
            tone="viewer"
            size="sm"
            value={props.tool}
            onChange={props.onToolChange}
            options={[
              { value: "wl", label: "W/L", title: "Window / level (W)" },
              { value: "pan", label: "Pan", title: "Pan (P)" },
            ]}
          />
        </Group>
        <Divider />
        <Group label="Zoom">
          <IconButton
            tone="viewer"
            size="sm"
            label="Zoom out"
            shortcut="−"
            icon={<ZoomOut className="size-4" aria-hidden="true" />}
            onClick={() => props.onZoom(0.8)}
          />
          <IconButton
            tone="viewer"
            size="sm"
            label="Zoom in"
            shortcut="+"
            icon={<ZoomIn className="size-4" aria-hidden="true" />}
            onClick={() => props.onZoom(1.25)}
          />
          <IconButton
            tone="viewer"
            size="sm"
            label="Fit to window"
            shortcut="F"
            icon={<Maximize className="size-4" aria-hidden="true" />}
            onClick={props.onFit}
          />
        </Group>
        <Divider />
        <Group label="Grayscale">
          <IconButton
            tone="viewer"
            size="sm"
            label="Invert grayscale"
            shortcut="I"
            icon={<Contrast className="size-4" aria-hidden="true" />}
            active={props.invert}
            onClick={props.onInvert}
          />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger
              aria-label="Window preset"
              className="pressable flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-viewer-muted outline-none hover:bg-white/[0.1] hover:text-viewer-ink focus-visible:shadow-focus-viewer data-[state=open]:bg-white/[0.14] data-[state=open]:text-viewer-ink"
            >
              <SunMedium className="size-4" aria-hidden="true" />
              Window
              <ChevronDown className="size-3" aria-hidden="true" />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                sideOffset={8}
                align="center"
                className={cn(menuSurface, "min-w-[180px]")}
              >
                <DropdownMenu.Label className="px-2.5 pb-1 pt-1 text-2xs font-medium text-viewer-muted">
                  Window presets
                </DropdownMenu.Label>
                {props.presets.map((preset) => (
                  <DropdownMenu.Item
                    key={preset.label}
                    onSelect={() => props.onPreset(preset.window)}
                    className="flex h-7 cursor-default items-center justify-between gap-6 rounded-md px-2.5 text-[13px] outline-none data-[highlighted]:bg-viewer-accent data-[highlighted]:text-black"
                  >
                    {preset.label}
                    <span className="tabular font-mono text-2xs opacity-60">
                      W {Math.round(preset.window.width)} · L{" "}
                      {Math.round(preset.window.center)}
                    </span>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          <IconButton
            tone="viewer"
            size="sm"
            label="Reset view and window"
            shortcut="R"
            icon={<RotateCcw className="size-4" aria-hidden="true" />}
            onClick={props.onReset}
          />
        </Group>
        <Divider />
        <Group label="AI heatmap">
          <IconButton
            tone="viewer"
            size="sm"
            label={
              overlayAvailable
                ? overlay.visible
                  ? "Hide AI heatmap"
                  : "Show AI heatmap"
                : "No AI heatmap for this image"
            }
            shortcut={overlayAvailable ? "H" : undefined}
            icon={<Flame className="size-4" aria-hidden="true" />}
            active={overlay.visible && overlayAvailable}
            disabled={!overlayAvailable}
            onClick={() =>
              onOverlayChange({ ...overlay, visible: !overlay.visible })
            }
          />
          <Popover.Root>
            <Popover.Trigger
              aria-label="Heatmap settings"
              disabled={!overlayAvailable}
              className="pressable flex size-7 items-center justify-center rounded-md text-viewer-muted outline-none hover:bg-white/[0.1] hover:text-viewer-ink focus-visible:shadow-focus-viewer disabled:cursor-not-allowed disabled:opacity-40 data-[state=open]:bg-white/[0.14] data-[state=open]:text-viewer-ink"
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                sideOffset={8}
                align="center"
                className={cn(
                  menuSurface,
                  "viewer-surface w-[248px] space-y-3.5 p-3.5",
                )}
              >
                <p className="text-xs font-semibold text-viewer-ink">
                  AI heatmap
                </p>
                <Slider
                  label="Opacity"
                  value={Math.round(overlay.opacity * 100)}
                  min={0}
                  max={100}
                  step={5}
                  onChange={(value) =>
                    onOverlayChange({ ...overlay, opacity: value / 100 })
                  }
                />
                <Slider
                  label="Floor"
                  value={Math.round(overlay.floor * 100)}
                  min={0}
                  max={80}
                  step={5}
                  hint="Activations below this level are not drawn."
                  onChange={(value) =>
                    onOverlayChange({ ...overlay, floor: value / 100 })
                  }
                />
                <div>
                  <p className="mb-1.5 text-xs text-viewer-ink">Colormap</p>
                  <div
                    role="radiogroup"
                    aria-label="Heatmap colormap"
                    className="grid grid-cols-2 gap-1.5"
                  >
                    {(Object.keys(COLORMAP_LABELS) as ColormapName[]).map(
                      (name) => {
                        const selected = overlay.colormap === name;
                        return (
                          // biome-ignore lint/a11y/useSemanticElements: swatch radio with full radio semantics
                          <button
                            key={name}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() =>
                              onOverlayChange({ ...overlay, colormap: name })
                            }
                            className={cn(
                              "pressable rounded-md p-1 text-left outline-none focus-visible:shadow-focus-viewer",
                              selected
                                ? "bg-white/[0.14] ring-1 ring-inset ring-viewer-accent"
                                : "hover:bg-white/[0.07]",
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className="block h-2 w-full rounded-sm"
                              style={{
                                backgroundImage: colormapGradient(name),
                              }}
                            />
                            <span className="mt-1 block text-2xs text-viewer-ink">
                              {COLORMAP_LABELS[name]}
                            </span>
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </Group>
        <Divider />
        <Group label="Layout and export">
          <IconButton
            tone="viewer"
            size="sm"
            label="Compare original and AI overlay side by side"
            icon={<Columns2 className="size-4" aria-hidden="true" />}
            active={props.compare}
            disabled={!overlayAvailable}
            onClick={props.onCompare}
          />
          {props.canExport ? (
            <IconButton
              tone="viewer"
              size="sm"
              label="Export annotated image (PNG)"
              icon={<Download className="size-4" aria-hidden="true" />}
              disabled={props.exportBusy}
              onClick={props.onExport}
            />
          ) : null}
        </Group>
      </div>
    </div>
  );
}
