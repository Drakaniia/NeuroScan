# Batch Processing — UI Structure Plan

> **For agentic workers:** Work task by task. Each task ends green (`pnpm lint`, `pnpm typecheck`, `pnpm test`) before the next starts. Boxes are checkable steps, not suggestions.

**Goal:** Replace the Batch screen's "report page with two cards on it" structure with a workbench: a light list of scans on the left, a dark lightbox for the selected scan on the right, and one run dock that owns progress and the run's actions. The window is the workspace, not a paper page with panels floating on it.

**Design basis:** Apple *Designing Fluid Interfaces* (2018), *Materials*, *Details of UI Typography* (2020), *Principles of Great Design*. Existing project specs: `docs/ui/01-design-overview.md`, `docs/ui/04-screen-specifications.md` (Batch Processing), `docs/ui/06-interaction-patterns.md`, `docs/ui/07-error-handling-feedback.md`, `docs/ui/12-design-validation.md`. Motion tokens already live in `apps/desktop/src/lib/ease.ts`; do not invent new ones.

**Sibling plan:** `docs/superpowers/plans/2026-10-25-single-screening-ui.md` (shipped). This plan reuses its decisions wherever they apply — full-bleed contract, light chrome / dark surface, dock in flow, tinted verdict pills, dark material classes — so the two screens read as one product.

---

## Why it reads as generic today

Structural, not cosmetic. Each item is visible in the current source.

1. **It is a reading column, not a workspace.** `__root.tsx` pads every non-full-bleed route (`mx-auto max-w-container px-4 py-10`), so at the default 1200×800 window the "workspace" is 1168px of a 1200px window with 40px of pale page above and below, and the whole thing scrolls as a document. A workbench — list, preview, live run — should own the window the way `/single` now does.
2. **Four stacked bands of equal weight.** Header row → split view → progress card → disclaimer paragraph, separated by `gap-4`, three of them as white cards with `rounded-xl border border-[#E3E6EA] shadow-card`. Nothing says which band is the work, which is status, and which is safety text. On Single, chrome answers wayfinding, the dark stage is the work, and the dock is the result.
3. **Two identical white cards side by side.** `ResultsTable` and `ImagePreview` both render `rounded-xl border bg-white shadow-card`. The preview is a *detail inspector* for the selected row, but structurally it is a peer panel — the classic "admin dashboard, two columns" silhouette.
4. **Three nested materials around the one object that matters.** Pale page → white panel → white/black rounded frame → `max-w-[38vh]` square → the scan. The subject of the screen is the smallest, most deeply nested thing on it. The viewer on `/single` is the surface itself.
5. **Progress is a page card, far from the queue it describes.** It shows `Processed / Errors / Remaining` while the filter row already shows the same counts, and the "Processing filename" headline sits at the bottom of the document, not beside the row being processed. Status is something you scroll past.
6. **The status column repeats itself 200 times.** `Done` / `Queued` / `Processing` as a word + icon in a dedicated column means a finished batch is one repeated word column, while verdict and probability — the reason anyone opens this screen — share the same visual weight.
7. **Checkboxes have no visible consequence.** `checkedIds` is fed only by the global Delete/Backspace shortcut; there is no visible bulk action, no "N selected", no way to clear the set except removing rows. A control with no surfaced effect is a dead affordance (`§16 Agency`).
8. **Drag-and-drop is drawn in the wrong place.** The whole split view dims and a centered floating card says "Drop to screen this folder" — over the stage, which never receives files, and over the rows it is about to add to. The one surface that changes is a dashed border that disappears the moment a list exists.
9. **The header is a wrapping button row, not chrome.** Back, title, subtitle, Export, Choose folder in one `flex-wrap` row with two competing emphases; the subtitle explains the screen ("Screen a whole folder of MRI scans with live progress"), which is documentation in the interface.
10. **The preview's own header says "Preview".** A label for a panel the user is already looking at; the file's identity is buried below the image, and the controls sit in a white block under a black picture frame — "photo in a card with a caption".
11. **The scan and its heatmap can drift apart.** The wrapper is `aspect-square` while both layers are `object-contain`; on a non-square scan the overlay's square bitmap letterboxes differently from the scan underneath. The Single screen already solved this by fitting a box to the scan's natural rect and drawing both layers `object-fill`.
12. **Light-only control surfaces on what should be dark.** `RangeSlider` is hard-coded `bg-slate-100` with `bg-slate-950/25` ticks; `IconButton` is hard-coded `text-[#333333] hover:bg-[#E6F0FF]`; `Button variant="ghost"` is `text-[#334155]`. Any dark surface in batch would ship unreadable controls unless these grow a surface/tone axis.
13. **Contrast defects in the light theme.** `VerdictBadge` uses solid `#28A745` / `#DC3545` with white text — about 3.1:1 and 4.0:1 at 12px, below AA. Secondary text uses `#94A3B8` (~2.5:1) and `#8A8F98` (~3.4:1) on white for things like "12 shown", τ and folder paths.
14. **Colour means two things.** A selected row is `bg-[#E6F0FF]`, which is exactly the secondary button's fill. The same colour says "button" and "selected row".
15. **Sizes are derived from the viewport, inside a padded page.** `max-h-[54vh]` on the table, `max-w-[38vh]` on the scan, `min-h-[320px]` on the empty state — three independent viewport guesses that break when the dock grows or the window is short.
16. **Row exit animation is unsupported where it is written.** `AnimatePresence` wraps `<motion.tr>` inside `<tbody>`; without `popLayout` the exit is unreliable, and `popLayout` is invalid inside a table. Rows should fade in and leave immediately.
17. **Toasts land on the file actions.** `position="top-right"` is where "Export CSV" and "Choose folder" live. The Single plan moved its toasts to `top-center` for the same reason (D7 there).

---

## Target anatomy

At the default 1200×800 window:

```
┌ TitleBar  h-9 · light · app chrome ──────────────────────────────────┐
├ BatchToolbar  h-12 · light · full bleed ──────────────────────────────┤
│ [←]  Batch Processing   [▤ 37 scans · 2 failed]     [Export] [Choose ⌘O] │
├───────────────────────────────────────┬───────────────────────────────┤
│ LIST  (light surface, no card)        │ STAGE  (dark, edge to edge)   │
│ ┌ [All 37][Tumor 4][No 31][Low 2] ┐   │  brain_t2_0041.png   [◉][↓]   │
│ │ FILE            VERDICT  P   ·    │   ┌─────────────────────────┐ │
│ │ ░ img  brain…   ● Tumor  34.2% ·  │   │                         │ │
│ │ ░ img  brain…   ● No     12.8% ·  │   │   MRI + CAM overlay     │ │
│ │ ░ img  brain…   ✕ Error        ·  │   │   (fitted to the scan)  │ │
│ │ …                               │   │                         │ │
│ └─────────────────────────────────┘   │   └─────────────────────────┘ │
│                                        │  ● No tumor   12.8% P(tumor) │
│                                        │  τ 0.50 · 412 ms · 224 px     │
│                                        │  Overlay ⌃  (colormap·opacity)│
├───────────────────────────────────────┴───────────────────────────────┤
│▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ progress hairline ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬│
│ ● Processing brain_t2_0041.png    12/37 · 2 failed · ETA 00:41   [Cancel][Clear] │
│ Research/educational screening aid — not a medical device, not a diagnosis. │
└───────────────────────────────────────────────────────────────────────┘
```

Narrow window (below `lg`, e.g. 900px): the workspace becomes one scrolling column — list (min 320px) over stage (46vh) — and the dock stays pinned to the bottom of the window.

- **Light band (toolbar)** answers: where am I, what is in this batch, how do I add files, how do I export.
- **Work area** is two surfaces: a light list (tabular, dense, scannable) and a dark stage (one scan, read the way it will be read on Single).
- **Dark dock** is the run's floor, full width: state, counts, ETA, Cancel/Resume, Clear — and the safety line, always visible.
- Nothing floats over the work except transients (toast, drop state). Nothing scrolls but the list and, on short windows, the stage's lower block.

---

## Decisions

| # | Decision | Rejected alternative and why |
|---|---|---|
| B1 | `/batch` joins `FULL_BLEED_ROUTES`; the route owns the area below the title bar. | Keeping the padded column: it is the root cause of "panels on a page", and the list can never be tall enough to be the primary object. |
| B2 | The preview becomes a **dark stage**, permanent (the empty state is on it too). | A light preview card: keeps the "white card with a black square" look, ranks the scan equal to the table, and throws away the identity `/single` established. |
| B3 | The list and the stage are **regions, not cards**: no outer radius, no card shadow, one hairline between them. | Keeping `rounded-xl border shadow-card` on both: two cards side by side is the exact silhouette this plan exists to remove. |
| B4 | Run status moves into a **full-width dark dock** at the bottom, in flow. | A separate progress card at the page bottom (today): duplicates the filter counts, drifts away from the queue, and competes with the disclaimer for the last band. A rail inside the list column only: splits the run's actions from its numbers and leaves the stage taller than the list. |
| B5 | The **status column is folded into the verdict cell** — a pill when settled, a state glyph + word when queued / analyzing / failed. `BatchSort.key` loses `"status"`. | Keeping a constant "Done" column: 200 identical words carry no information, and errors already have a colour, a glyph, an inline reason and a filter. Sorting by status is served by the verdict sort ("worst first") plus the error filter. |
| B6 | Checking rows **swaps the filter row for a bulk bar** ("N selected · Remove · Clear selection"). | A floating bulk bar over the table: covers rows. Leaving checkboxes as they are: the control has no visible consequence. |
| B7 | The row's selected tint is neutral ink (`#003366`/4.5%) with the sliding accent bar; blue stays reserved for actions. | `bg-[#E6F0FF]` (today): the same fill as the secondary button, so one colour means two things. |
| B8 | Verdict pills are **tinted with verdict-coloured ink** in both tones; the solid verdict colour lives in a small icon and in the stage's probability figure. | Solid `#28A745` / `#DC3545` with white text (today): 3.1:1 and 4.0:1 — fails AA at 12px. |
| B9 | **One shared `VerdictBadge`** in `components/ui/` with `tone` and `size`; the batch and single files become compatibility re-exports (the `BatchButton` pattern). | A third badge written for batch: three near-copies of the same pill, guaranteed to drift. |
| B10 | `IconButton` gains `surface`; `RangeSlider` gains `tone`. | Ad-hoc `className` overrides: `RangeSlider`'s internals are hard-coded slate and cannot be reached from outside; `IconButton`'s hover fill is opaque light blue. |
| B11 | The scan is drawn in a **box fitted to its natural rect** (`object-fill` for scan and overlay), using the same math as `ImageStage`. | The current `aspect-square` + `object-contain` pair: on a non-square scan the overlay misaligns. |
| B12 | The overlay controls are a **one-level disclosure on the stage** ("Overlay ⌃"), not a permanently visible white block. | Always-on controls: they take a fixed slice of the stage from every scan, including the queued/error states that have no overlay at all. |
| B13 | Drag-and-drop handlers stay on the whole workspace, but the **feedback is drawn on the list** (inset ring + one-line capsule). The floating centered card is removed. | Scoping the handlers to the list: dropping on the stage would silently do nothing — a dead zone. Keeping the centered overlay card: it hides the rows it is about to add to and dims a pane that never receives the drop. |
| B14 | Row actions stay **always visible**. | Reveal-on-hover: hides the affordance and puts tab focus on invisible controls. |
| B15 | Rows **fade in only**; there is no exit animation. | `AnimatePresence` in `<tbody>`: exits are unreliable, and `popLayout` is invalid inside a table. |
| B16 | `filter` and `sort` move up to the screen; the row list is computed by one pure helper (`filterAndSortRows`). | Leaving them inside the table: Ctrl+A, the bulk bar and the "N shown" counter would each need a different source of truth, and today Ctrl+A selects rows the filter is hiding. |
| B17 | Escape peels layers: **clear selection → cancel run → leave the screen**. | Current `cancel → leave`: the selection has no escape, and cancelling a run is a bigger step than clearing a checkbox. |
| B18 | Selecting all means **all rows currently listed**. | All items under a filter: "select all" would include rows the reviewer cannot see. |
| B19 | Toasts move to `top-center`. | `top-right`: now holds Export and Choose folder. |
| B20 | Keyboard: focusing the list and using ↑/↓ moves the selection and DOM focus to the row; Home/End jump to the ends. | Roving `tabIndex` across hundreds of filename buttons: hundreds of tab stops. `aria-activedescendant` on a plain table: needs grid/listbox roles, which changes how assistive tech announces every cell. |
| B21 | The dock's live region announces **run boundaries only** (started, paused, finished), not each filename. | `aria-live` on the per-file headline (today): fires roughly three times a second — a screen-reader firehose. |
| B22 | One shared disclaimer line in the dock at 10–11px, always visible. | The current page-footer paragraph, which is scrolled away in any long batch; or hiding it until "complete". |

---

## Spec deltas (docs/ui §Batch Processing)

The plan intentionally amends the written spec. Update these lines in `docs/ui/04-screen-specifications.md` when the work lands:

1. **Layout** is no longer "Header / Split 60-40 / Progress" as three stacked blocks; it is "toolbar / list + stage / run dock" full-bleed.
2. **Results table columns** are File, Verdict (with state), Probability, Actions. Status is no longer its own column.
3. **Preview** is a dark stage: filename and file actions in its header, answer and metrics under the viewer, overlay controls behind a disclosure.
4. **Progress display** is the dock; percentage is expressed by the hairline plus `processed/total`, not a separate track and a "N% complete" line.
5. **Bulk actions** are surfaced in the filter row's selection state.

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `apps/desktop/src/routes/__root.tsx` | modify | `/batch` joins the full-bleed contract (one line) |
| `apps/desktop/src/routes/batch.tsx` | modify | Workbench shell, bands, keyboard/DnD wiring, toast position |
| `apps/desktop/src/components/batch/BatchToolbar.tsx` | create | Screen identity, batch subject chip, file actions |
| `apps/desktop/src/components/batch/ResultsTable.tsx` | modify | List region: toolbar row, bulk bar, columns, keyboard, empty state |
| `apps/desktop/src/components/batch/ImagePreview.tsx` | modify | Dark stage: header, fitted viewer, answer block, overlay disclosure, states |
| `apps/desktop/src/components/batch/ProgressDisplay.tsx` | modify | Full-width run dock (status, counts, actions, disclaimer) |
| `apps/desktop/src/components/batch/VerdictBadge.tsx` | modify | Compatibility re-export of the shared badge |
| `apps/desktop/src/components/single/VerdictBadge.tsx` | modify | Compatibility re-export of the shared badge |
| `apps/desktop/src/components/ui/VerdictBadge.tsx` | create | One pill: `tone`, `size`, nullable verdict |
| `apps/desktop/src/components/ui/IconButton.tsx` | modify | `surface: "light" \| "dark"` axis |
| `apps/desktop/src/components/motion/range-slider.tsx` | modify | `tone: "light" \| "dark"` for the track, fill, ticks and handle |
| `apps/desktop/src/lib/screening/batch-rows.ts` | create | `filterAndSortRows`, `countByFilter`, `comparator` (pure, testable) |
| `apps/desktop/src/lib/hooks/use-fitted-box.ts` | create | Natural size + container size → exact fit in px |
| `apps/desktop/src/components/batch/ResultsTable.test.tsx` | create | Filter/sort/bulk/keyboard/error-reason behaviour |
| `apps/desktop/src/components/batch/ImagePreview.test.tsx` | create | Stage states, overlay disclosure, verdict tone |
| `apps/desktop/src/components/batch/ProgressDisplay.test.tsx` | create | Progress semantics, morphing action slot, persistent disclaimer |

No changes to `useBatchRun`, `simulate`, `classify`, `csv`, `folder-drop`, the Tauri commands or the route tree.

---

## Task 1: Give the Batch screen the window

**Files:** `apps/desktop/src/routes/__root.tsx`, `apps/desktop/src/routes/batch.tsx`

**Interfaces**
- Consumes: TanStack Router `useRouterState` (already wired)
- Produces: `/batch` renders in an unpadded, non-scrolling, definite-height content area; every other route keeps today's column

- [ ] **Step 1: Extend the route contract**

```tsx
/**
 * Routes that own the whole content area rather than sitting in the reading
 * column: no page padding, no page scrollbar, a definite height for `flex-1`.
 * The Single Screening viewer and the Batch workbench are these screens.
 */
const FULL_BLEED_ROUTES = new Set(["/single", "/batch"]);
```

No other change to `__root.tsx`. The existing branches already give `h-full max-w-none` and `overflow-hidden` for a full-bleed route.

- [ ] **Step 2: Replace the page shell in `batch.tsx`**

Delete `className="flex flex-col gap-4"` from the screen root. The screen becomes four bands:

```tsx
return (
  <div className="flex h-full min-h-0 flex-col bg-[#F5F8FF]">
    {/* In this task the top band is still today's <header>, moved out of the
        page flow and unchanged; Task 2 replaces it with <BatchToolbar>. */}
    {header}

    <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:overflow-hidden">
      <div className="flex min-h-[320px] min-w-0 flex-col lg:min-h-0">…list…</div>
      <div className="h-[46vh] min-h-[280px] min-w-0 lg:h-auto lg:min-h-0">…stage…</div>
    </div>

    {/* Today's progress card and disclaimer sit here until Task 7. */}
    {footer}
  </div>
);
```

Notes:
- `bg-[#F5F8FF]` on the root stops the shell gradient from showing through the hairline between the panes.
- Below `lg` the workspace scrolls as one column (list 320px minimum, stage 46vh). At `lg` and up it never scrolls: each pane owns its scroll.
- The `min-h-0` chain is load-bearing at every level. A missing one turns the table into an overflowing box.

- [ ] **Step 3: Move the drag handlers, keep the file input**

The drag handlers (`isFileDrag`, `dragDepth`, enter/over/leave/drop) move onto the workspace `<div>` in the same step. The hidden `<input type="file" webkitdirectory>` stays at the screen root.

- [ ] **Step 4: Verify the other routes did not move**

`pnpm dev`, then check `/`, `/history`, `/about` still have the 1200px reading column and a page scrollbar, and `/batch` has neither. Resize to 900×650: the dock must stay pinned and the workspace must scroll.

---

## Task 2: Replace the page header with a batch toolbar

**Files:** `apps/desktop/src/components/batch/BatchToolbar.tsx` (create), `apps/desktop/src/routes/batch.tsx`

**Interfaces**
- Consumes: `BatchSummary` from `@/lib/hooks/use-batch-run`, `BackLink`, `Button`
- Produces: `BatchToolbar({ summary, settledCount, onExport, onChooseFolder })`

- [ ] **Step 1: Build the toolbar**

```tsx
"use client";

import { Download, FileStack, FolderOpen } from "lucide-react";
import { BackLink } from "@/components/chrome/BackLink";
import { Button } from "@/components/ui/Button";
import type { BatchSummary } from "@/lib/hooks/use-batch-run";

export interface BatchToolbarProps {
  summary: BatchSummary;
  /** Settled rows: the export's row count. */
  settledCount: number;
  onExport: () => void;
  onChooseFolder: () => void;
}

export function BatchToolbar({ summary, settledCount, onExport, onChooseFolder }: BatchToolbarProps) {
  const subject =
    summary.total === 0
      ? "No scans queued"
      : `${summary.total} scan${summary.total === 1 ? "" : "s"}${
          summary.errors > 0 ? ` · ${summary.errors} failed` : ""
        }`;

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 bg-[#F5F8FF] px-3">
      <BackLink />
      <h1 className="shrink-0 text-[15px] font-semibold tracking-[-0.01em] text-[#003366]">
        Batch Processing
      </h1>
      <span className="flex min-w-0 items-center gap-1.5 rounded-md bg-[#003366]/[0.05] px-2 py-1">
        <FileStack className="size-3.5 shrink-0 text-[#6B7280]" aria-hidden="true" />
        <span className="truncate text-[11px] tabular-nums tracking-[0.01em] text-[#4B5563]">
          {subject}
        </span>
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Button
          variant="secondary"
          onClick={onExport}
          disabled={settledCount === 0}
          title="Export all results as CSV (Ctrl E)"
          aria-keyshortcuts="Control+E"
          icon={<Download className="size-4" aria-hidden="true" />}
        >
          Export CSV
        </Button>
        <Button
          variant="primary"
          onClick={onChooseFolder}
          title="Choose a folder of scans (Ctrl O)"
          aria-keyshortcuts="Control+O"
          icon={<FolderOpen className="size-4" aria-hidden="true" />}
        >
          Choose folder
          <kbd className="ml-1 hidden rounded border border-white/30 bg-white/15 px-1 font-sans text-[10px] font-medium tracking-[0.02em] lg:inline">
            Ctrl O
          </kbd>
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Delete from the old header**

Remove the `<header>` block, the subtitle paragraph, and both `BatchButton`s from `batch.tsx`. Wire the new toolbar; the hidden file input stays.

- [ ] **Step 3: Keep the subject chip out of the live regions**

The chip changes continuously while a batch runs. Do **not** add `aria-live` to it; run-boundary announcements belong to the dock (Task 7).

- [ ] **Step 4: Verify**

At 1200 wide the toolbar is one row, 48px, with the kbd hint visible; at 900 the `kbd` hides and nothing wraps. Tab order is back → Export → Choose folder.

---

## Task 3: Give the shared controls a surface axis

**Files:** `apps/desktop/src/components/ui/VerdictBadge.tsx` (create), `apps/desktop/src/components/batch/VerdictBadge.tsx`, `apps/desktop/src/components/single/VerdictBadge.tsx`, `apps/desktop/src/components/ui/IconButton.tsx`, `apps/desktop/src/components/motion/range-slider.tsx`

**Interfaces**
- Produces: `VerdictBadge({ verdict: Verdict | null, tone?: "light" | "dark", size?: "sm" | "md" | "lg" })`; `IconButton({ surface?: "light" | "dark" })`; `RangeSlider({ tone?: "light" | "dark" })`

- [ ] **Step 1: Write the one verdict pill**

```tsx
"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { Verdict } from "@/lib/screening/types";
import { VERDICT_LABELS } from "@/lib/screening/verdicts";
import { cn } from "@/lib/utils";

type Tone = "light" | "dark";
type Size = "sm" | "md" | "lg";

/**
 * Tinted fill with the verdict's own hue as ink. The solid status colour ships
 * in the icon, so the pill clears AA in both tones and the colour still reads
 * at a glance; the icon also carries the meaning without relying on hue.
 */
const SURFACE: Record<Tone, Record<Verdict, string>> = {
  light: {
    tumor: "bg-[#DC3545]/10 text-[#B31D2B] ring-[#DC3545]/25",
    "no-tumor": "bg-[#28A745]/12 text-[#1E7A34] ring-[#28A745]/25",
    "low-confidence": "bg-[#FFC107]/18 text-[#7A5B00] ring-[#FFC107]/35",
  },
  dark: {
    tumor: "bg-[#DC3545]/20 text-[#FF9A9A] ring-[#DC3545]/35",
    "no-tumor": "bg-[#28A745]/20 text-[#7BE495] ring-[#28A745]/35",
    "low-confidence": "bg-[#FFC107]/20 text-[#FFD666] ring-[#FFC107]/35",
  },
};

const SIZE: Record<Size, { pill: string; icon: string }> = {
  sm: { pill: "gap-1 px-1.5 py-0.5 text-[11px]", icon: "size-3" },
  md: { pill: "gap-1.5 px-2.5 py-1 text-xs", icon: "size-3.5" },
  lg: { pill: "gap-2 px-4 py-1.5 text-base", icon: "size-5" },
};

const ICON = { "no-tumor": CheckCircle2, tumor: XCircle, "low-confidence": AlertTriangle } as const;

export function VerdictBadge({
  verdict,
  tone = "light",
  size = "md",
  className,
}: {
  verdict: Verdict | null;
  tone?: Tone;
  size?: Size;
  className?: string;
}) {
  if (!verdict) {
    return (
      <span className={cn("text-xs text-[#6B7280]", className)} aria-label="Not scored yet">
        —
      </span>
    );
  }

  const Icon = ICON[verdict];
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full font-semibold leading-5 tracking-[-0.01em] ring-1 ring-inset",
        SIZE[size].pill,
        SURFACE[tone][verdict],
        className,
      )}
    >
      <Icon className={SIZE[size].icon} aria-hidden="true" />
      {VERDICT_LABELS[verdict]}
    </span>
  );
}

export type VerdictBadgeProps = Parameters<typeof VerdictBadge>[0];
```

- [ ] **Step 2: Reduce the two old files to re-exports**

```tsx
// components/batch/VerdictBadge.tsx and components/single/VerdictBadge.tsx
/**
 * Compatibility re-export. The pill is shared: one verdict has to look the same
 * on the list and on the stage (§16 Familiarity).
 */
export { VerdictBadge, type VerdictBadgeProps } from "@/components/ui/VerdictBadge";
```

Every existing import (`./VerdictBadge`, `../VerdictBadge`) keeps resolving. `ResultsPanel` calls it with a non-null verdict and no size — still valid.

- [ ] **Step 3: Add the `surface` axis to `IconButton`**

Keep `tone` semantic. Add:

```tsx
surface?: "light" | "dark";
```

with the surface class strings:

```tsx
const SURFACE_NEUTRAL = {
  light: "text-[#333333] hover:bg-[#E6F0FF] hover:text-[#0066CC]",
  dark: "text-white/70 hover:bg-white/10 hover:text-white",
} as const;
const SURFACE_DANGER = {
  light: "text-[#333333] hover:bg-[#FDECEC] hover:text-[#DC3545]",
  dark: "text-white/70 hover:bg-[#DC3545]/20 hover:text-[#FF9A9A]",
} as const;
const SURFACE_DISABLED = { light: "cursor-not-allowed text-[#CCCCCC]", dark: "cursor-not-allowed text-white/25" } as const;
```

Default `surface = "light"` so every current call site is unchanged.

- [ ] **Step 4: Add `tone` to `RangeSlider`**

The track, fill, ticks and handle are currently hard-coded slate. Add `tone = "light"` and swap:

| Part | light (unchanged) | dark |
|---|---|---|
| track | `bg-slate-100` | `bg-white/10` |
| fill | `bg-slate-950/15` | `bg-white/20` |
| ticks | `bg-slate-950/25` | `bg-white/25` |
| handle | `bg-slate-950 ring-slate-950/30` | `bg-white ring-white/30` |

`components/single/HeatmapPanel.tsx` and the current batch usage stay on the default.

- [ ] **Step 5: Verify**

`pnpm typecheck` — the re-export must expose the same `VerdictBadgeProps` shape this plan's call sites use. `pnpm test` — `ResultsPanel.test.tsx` and `drawer.test.tsx` still pass. In the dev server, `/single`'s dock must look pixel-identical to before this task.

---

## Task 4: Rebuild the results list for scanning

**Files:** `apps/desktop/src/lib/screening/batch-rows.ts` (create), `apps/desktop/src/components/batch/ResultsTable.tsx`, `apps/desktop/src/routes/batch.tsx`

**Interfaces**
- Consumes: `BatchItem`, `BatchFilter`
- Produces: `filterAndSortRows(items, filter, sort)`, `countByFilter(items)`, `BatchSort`, `ResultsTable` becomes presentational (`rows`, `items`, `sort`, handlers)

- [ ] **Step 1: Extract the row model**

Move `VERDICT_RANK`, `compare`, the filtering pass and the count tally out of the component:

```ts
// lib/screening/batch-rows.ts
export type BatchFilter = "all" | Verdict | "error";
export interface BatchSort { key: "fileName" | "verdict" | "probability"; dir: "asc" | "desc" }

export function filterAndSortRows(items: readonly BatchItem[], filter: BatchFilter, sort: BatchSort): BatchItem[];
export function countByFilter(items: readonly BatchItem[]): Record<BatchFilter, number>;
export function nextSort(prev: BatchSort, key: BatchSort["key"]): BatchSort;
```

`nextSort` keeps the current first-click reading: A→Z for names, highest probability first, worst verdict first.

- [ ] **Step 2: Make the list a region, not a card**

```tsx
<div className="flex min-h-0 flex-1 flex-col bg-white">
  {/* toolbar row — h-11, hairline under */}
  <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[#EDF0F3] px-3">…</div>

  {/* the only scrolling region of the pane */}
  <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
    <table className="w-full border-separate border-spacing-0 text-left text-[13px]">…</table>
  </div>
</div>
```

Delete `rounded-xl border border-[#E3E6EA] shadow-card` and the `max-h-[54vh]` cap. The hairline between the panes belongs to the stage (Task 5), so the two regions meet on one line without either owning a border of its own.

- [ ] **Step 3: Filter row and bulk bar swap**

The filter row keeps the sliding pill (`layoutId="batch-filter-pill"`), the counts, and a right-aligned "N shown" **only when a filter is active**. When `checkedIds.size > 0`, the row's contents swap for the bulk bar:

```tsx
<AnimatePresence initial={false} mode="wait">
  {checkedCount > 0 ? (
    <motion.div key="bulk" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.14, ease: EASE_OUT }} className="flex min-w-0 items-center gap-2">
      <span className="text-[12px] font-medium text-[#003366]">{checkedCount} selected</span>
      <Button variant="ghost" className="h-7 px-2 text-[12px]"
        onClick={() => onRemove(Array.from(checkedIds))}
        icon={<Trash2 className="size-3.5" aria-hidden="true" />}>
        Remove
      </Button>
      <Button variant="ghost" className="h-7 px-2 text-[12px]" onClick={onClearChecked}>
        Clear selection
      </Button>
      <span className="sr-only" role="status">{checkedCount} scans selected</span>
    </motion.div>
  ) : (
    <motion.fieldset key="filters" …>{/* today's segmented control */}</motion.fieldset>
  )}
</AnimatePresence>
```

`mode="wait"` at a fixed 44px height means no layout jump. Only existing capabilities appear here: Remove is today's Delete shortcut surfacing itself. Export-selected is deliberately **not** added (see Non-goals).

- [ ] **Step 4: Rebuild the row**

Five columns: checkbox, File, Verdict (or state), Probability, Actions.

```tsx
const CELL = "h-10 border-b border-[#EDF0F3] px-2 align-middle";
```

- **File:** 32px square thumbnail (`rounded-md`, `bg-black`), name at 13px `#1F2937` (selected → `#003366` + `font-medium`), and a second 11px line: the folder path, or on error rows the failure reason in `#B31D2B`, `line-clamp-1`.
- **Verdict:** `<VerdictBadge verdict={item.verdict} size="sm" />`; when there is no verdict, the state glyph + word — `Clock` "Queued" (`#6B7280`), `Loader variant="spinner"` "Analyzing" (`#0066CC`), `AlertTriangle` "Error" (`#B31D2B`). Delete the `STATUS_META` column and its word for `done` entirely.
- **Probability:** 12px mono, `tabular-nums`, right-aligned, `#333333`; `—` when unsettled (and keep unsettled rows last in both sort directions).
- **Actions:** `IconButton surface="light"` export + remove, always visible. Keep `event.stopPropagation()`.

Row:

```tsx
<tr
  id={`row-${item.id}`}
  tabIndex={-1}
  aria-current={selected ? "true" : undefined}
  onClick={() => onSelect(item.id)}
  className={cn(
    "cursor-pointer transition-colors",
    selected ? "bg-[#003366]/[0.045]" : "hover:bg-[#F7F9FC]",
  )}
>
```

Keep the sliding accent (`layoutId="batch-row-accent"`, 3px, `#0066CC`) and its reduced-motion twin. Delete the `!selected && status === "error" && "bg-[#FFF6F6]"` tint — the error is already carried by the verdict cell, the inline reason, the filter count and the dock count; a fourth red signal makes an ordinary run look alarming.

- [ ] **Step 5: Sorting header**

Keep `aria-sort` and the rotating arrow; the arrow is `opacity-0` on inactive columns instead of `0.35`, so four faint arrows become one real indicator. Table header type: 10px, uppercase, `tracking-[0.08em]`, `#6B7280`, `bg-white`.

- [ ] **Step 6: Keyboard model**

```tsx
const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
  if (rows.length === 0) return;
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
  event.preventDefault();
  const current = rows.findIndex((row) => row.id === selectedId);
  const target =
    event.key === "Home" ? 0
    : event.key === "End" ? rows.length - 1
    : Math.min(rows.length - 1, Math.max(0, (current === -1 ? -1 : current) + (event.key === "ArrowDown" ? 1 : -1)));
  const next = rows[target];
  onSelect(next.id);
  document.getElementById(`row-${next.id}`)?.focus();
};
```

The container is `tabIndex={0}` with `aria-label="Batch results"` and `role="group"`. Focus moves to the `<tr>` (which carries `tabIndex={-1}`), so assistive tech reads the row's cells; there is no `aria-activedescendant` and no roving tab index. Rows scroll into view with `scrollIntoView({ block: "nearest" })`.

- [ ] **Step 7: Empty states**

- **No items:** the list shows the drop state (Task 6) — icon (32px, `#0066CC`), "Drop a folder of MRI scans", one line of constraints, `Choose folder` + `Load sample batch`. Drop the `min-h-[320px]` card with the dashed border and its gradient icon tile; the pane is already a surface.
- **No rows under a filter:** one row-height message inside the table body — "No scans match this filter." + `Show all scans` as a ghost button. No icon tile.

- [ ] **Step 8: Verify**

`pnpm typecheck`. In the dev server: filter to Errors, select all, check the bulk bar's count equals the filter count, Remove, confirm the rows are gone and the filter row returns. With a 200-row sample, scroll — the header stays put and picks up its shadow only after content passes under it.

---

## Task 5: Rebuild the preview as a dark stage

**Files:** `apps/desktop/src/lib/hooks/use-fitted-box.ts` (create), `apps/desktop/src/components/batch/ImagePreview.tsx`

**Interfaces**
- Consumes: `useFittedBox<T extends HTMLElement>(natural: { width: number; height: number } | null)` → `{ ref, box: { width, height } | null }`
- Produces: `ImagePreview` keeps its props (`item`, `onRetry`, `onExport`); the stage is `surface-dark`, edges to the pane

- [ ] **Step 1: Write the fit hook**

Same physics as `ImageStage.fit`, packaged so both layers can be drawn `object-fill` on one exact rect:

```ts
// lib/hooks/use-fitted-box.ts
export function useFittedBox<T extends HTMLElement>(
  natural: { width: number; height: number } | null,
) {
  const [node, setNode] = useState<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!node) return;
    const read = () => {
      const rect = node.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  const box = useMemo(() => {
    if (!natural || natural.width <= 0 || natural.height <= 0) return null;
    if (size.width <= 0 || size.height <= 0) return null;
    const scale = Math.min(size.width / natural.width, size.height / natural.height);
    return { width: Math.max(1, Math.round(natural.width * scale)), height: Math.max(1, Math.round(natural.height * scale)) };
  }, [natural, size]);

  return { ref: setNode, box };
}
```

Do not refactor `ImageStage` to use it in this plan — keep the blast radius on batch.

- [ ] **Step 2: Make the stage root a dark surface**

Replace `PANEL_CLASS` with:

```tsx
<aside
  aria-label="Scan preview"
  className={cn(
    "surface-dark flex min-h-0 flex-col overflow-hidden bg-[#0B1220]",
    // Stacked below the list on narrow windows, a column on wide ones — the
    // hairline moves to the edge the two panes actually share.
    "border-t border-[#D8E3F5] lg:border-l lg:border-t-0",
  )}
>
```

`surface-dark` gives focus a visible ring on the dark surface (`index.css`). Do **not** use a Tailwind `backdrop-blur-*` class anywhere on this surface: `prefers-reduced-transparency` turns every such element white and would erase the text.

- [ ] **Step 3: Header = identity + file actions**

44px, hairline under, no "Preview" label:

```tsx
<header className="flex h-11 shrink-0 items-center gap-2 border-b border-white/10 px-3">
  <span className="min-w-0 flex-1 truncate text-[13px] font-medium tracking-[-0.01em] text-white/90" title={item?.sourcePath}>
    {item ? item.fileName : "No scan selected"}
  </span>
  {item?.status === "done" ? (
    <>
      <IconButton surface="dark" icon={heatmap.visible ? Eye : EyeOff} label={…} active={heatmap.visible} pressed={heatmap.visible} onClick={…} />
      <IconButton surface="dark" icon={Download} label={`Export results for ${item.fileName} as CSV`} onClick={() => onExport(item.id)} />
    </>
  ) : null}
</header>
```

- [ ] **Step 4: Viewer region**

```tsx
<div ref={containerRef} className="relative flex min-h-0 flex-1 items-center justify-center p-3">
  <div className="relative" style={box ? { width: box.width, height: box.height } : undefined}>
    …scan + overlay…
  </div>
</div>
```

- Measure natural size from `onLoad` (`naturalWidth/Height`) into state; before it is known, render the images `h-full w-full object-contain` inside the container so nothing flashes.
- Once `box` exists, both layers are `h-full w-full object-fill`. The overlay is now guaranteed to sit exactly on the scan's rectangle (§B11), which is the same registration the pipeline does.
- Keep the selection cross-fade (`key={item.id}`, 0.18s `EASE_OUT`) and the overlay materialize (opacity + 1.5% scale + 6px blur) exactly as they are; the overlay's alpha stays on CSS `opacity` so the slider tracks the pointer 1:1.

- [ ] **Step 5: Answer block under the viewer**

`shrink-0`, `border-t border-white/10`, `px-3 py-3`, in rank order:

1. **Answer line:** `VerdictBadge tone="dark"` · 10px uppercase `P(tumor)` · 24px mono verdict-coloured figure · 11px `τ 0.50`.
2. **Metrics:** three columns, label 10px `white/50`, value 12px mono `white/85` — time, model, input size.
3. **Overlay disclosure:** a ghost `Button` ("Overlay" + rotating `ChevronUp`), `aria-expanded`, `aria-controls`, expanding the colormap select, the gradient swatch, and `RangeSlider tone="dark"` with its percentage. `style={{ colorScheme: "dark" }}` on the `<select>` so its popup follows.
4. One 11px `white/45` line: "Model trained on brain MRI only." (the not-a-device line lives in the dock, once).

Delete the white block, the light `Metric` (`text-[#333]`), the `border-[#EDF0F3]` dividers and the always-visible `<select>`.

- [ ] **Step 6: States on dark**

Replace `StatePanel`'s light tile with a dark one and use it for empty / queued / analyzing / error:

- tile: `bg-white/[0.06] ring-1 ring-inset ring-white/10`, icon white/70 (error `#FF9A9A`);
- title: 13px `white/90`; description: 12px `white/55`, `max-w-[26ch]`, `text-pretty`;
- filename: 11px mono `white/40`, truncate;
- retry: `Button variant="secondary"` (light-blue chip reads fine on dark and matches the Single error card).

Empty copy: "Select a scan to preview" / "Pick a row in the list to see its scan, heatmap and metrics." Queued copy: "Waiting in the queue" / "Scans are screened one at a time, in the order they were added." Analyzing: the dot-matrix loader + "Analyzing…". Error: "Could not process this file" + `item.error` + Retry.

- [ ] **Step 7: Verify**

`pnpm typecheck`. In the dev server: load the sample batch, click rows quickly — the scan cross-fades in place and the metrics never jump the layout. Toggle the overlay while dragging the opacity slider: the image must track 1:1, and hiding must not unmount the bitmap. Run at 900×650 and open "Overlay" — the block expands and the viewer shrinks instead of covering the scan.

---

## Task 6: Make the drop feedback land on the list

**Files:** `apps/desktop/src/routes/batch.tsx`, `apps/desktop/src/components/batch/ResultsTable.tsx`

**Interfaces**
- `ResultsTable` already receives `isDragging`; it gains `isDropTarget` semantics only through that prop

- [ ] **Step 1: Delete the floating overlay**

Remove the `AnimatePresence`/`motion.div` centered card ("Drop to screen this folder") and the `bg-[#E6F0FF]/50 backdrop-blur-[2px]` scrim from the workspace. The handlers stay on the workspace so there is no dead zone.

- [ ] **Step 2: Draw the state on the list**

On the list root:

```tsx
className={cn(
  "relative flex min-h-0 flex-1 flex-col bg-white transition-colors duration-150",
  isDragging && "bg-[#F7FAFF] ring-2 ring-inset ring-[#0066CC]",
)}
```

And one capsule under the toolbar row, only while dragging:

```tsx
<AnimatePresence initial={false}>
  {isDragging ? (
    <motion.p key="drop-hint"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.14, ease: EASE_OUT }}
      className="shrink-0 border-b border-[#0066CC]/15 bg-[#0066CC] px-3 py-1.5 text-[11px] font-medium tracking-[0.01em] text-white">
      Drop to add these scans — nothing in the list is replaced
    </motion.p>
  ) : null}
</AnimatePresence>
```

Wording matters: the drop *adds* (`start()` dedupes and appends). The old copy ("screen this folder") read like a replacement.

- [ ] **Step 3: Empty-state copy**

Title "Drop a folder of MRI scans", then "PNG or JPG, up to 64 MB each. Subfolders are included; the batch keeps going if one file cannot be read." While dragging: "Drop to start screening".

- [ ] **Step 4: Verify**

Drag from Explorer over the stage: the list still lights up (the workspace owns the handlers) and the stage is untouched. Drop a folder twice: the second drop reports "Already in the list", and the hint never claims a replacement.

---

## Task 7: Move run status into the dock

**Files:** `apps/desktop/src/components/batch/ProgressDisplay.tsx`, `apps/desktop/src/routes/batch.tsx`

**Interfaces**
- Props unchanged: `summary`, `currentFileName`, `isRunning`, `elapsedMs`, `onCancel`, `onResume`, `onClear`

- [ ] **Step 1: Build the dock**

```tsx
<section className="surface-dark shrink-0 border-t border-white/10 bg-[#0F1A2B]" aria-label="Batch progress">
  {/* Progress is the top edge of the dock: one hairline, no track, no shadow. */}
  <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
       aria-label="Batch progress" className="relative h-[3px] w-full bg-white/10">
    <motion.div className="h-full origin-left bg-[#4C9BE8]"
      initial={false} animate={{ scaleX: summary.progress / 100 }}
      transition={reduce ? { duration: 0 } : { type: "spring", ...SPRING_GLIDE }} />
  </div>

  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 pt-2.5">
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full" style={{ background: dot }} />
      <p className="min-w-0 truncate text-[13px] font-medium tracking-[-0.01em] text-white/90">{headline}</p>
    </div>

    <div className="flex items-center gap-3 text-[12px] tabular-nums tracking-[0.01em] text-white/60">
      <span><strong className="font-semibold text-white/85">{summary.processed}</strong>/{summary.total}</span>
      {summary.errors > 0 ? <span className="text-[#FF9A9A]">{summary.errors} failed</span> : null}
      <span>ETA {formatDuration(showEta ? summary.etaMs : elapsedMs)}</span>
      <span>{formatDuration(elapsedMs)} elapsed</span>
    </div>

    <div className="flex shrink-0 items-center gap-2">
      <AnimatePresence initial={false} mode="popLayout">{/* Cancel ⇄ Resume, unchanged morph */}</AnimatePresence>
      <Button variant="ghost" onClick={onClear} disabled={!hasItems || isRunning}
        className="text-white/70 hover:bg-white/10 hover:text-white"
        icon={<Trash2 className="size-4" aria-hidden="true" />} compactLabel>
        Clear
      </Button>
    </div>
  </div>

  <p className="px-4 pb-2 pt-1 text-[10px] leading-relaxed tracking-[0.01em] text-white/45">
    Research/educational screening aid — not a medical device and not a diagnosis. Model trained on brain MRI only.
  </p>
</section>
```

- Keep the Cancel/Resume `popLayout` morph and its `SPRING_SWAP`/reduced-motion branches verbatim.
- `dot`: running `#4C9BE8`, paused `#FFD666`, complete with no failures `#7BE495`, complete with failures `#FF9A9A`, empty `rgba(255,255,255,0.3)`.
- `headline` keeps today's four states ("Processing <file>", "Paused — N scans still queued", "Batch complete", "No scans queued").
- Remove: the `#E6EAF0` track with the inset shadow, the separate "N% complete" line, and the redundant "Processed / Errors / Remaining" triple (the counts line above replaces it; remaining is `total − processed`).

- [ ] **Step 2: Announce boundaries, not files**

Take `role="status" aria-live="polite"` off the headline. Add one dedicated region:

```tsx
<p className="sr-only" role="status" aria-live="polite">{announcement}</p>
```

where `announcement` is derived in `batch.tsx` from run edges (`"Screening started"`, `"Batch paused"`, `"Batch complete, N scans screened"`, `"N scans failed"`) — at most one change per run edge.

- [ ] **Step 3: Delete the page footer**

Remove the standalone disclaimer paragraph from `batch.tsx`; it now lives in the dock and is always visible.

- [ ] **Step 4: Verify**

`pnpm test`. In the dev server: start a 12-file batch — the hairline springs forward, the filename and counts update at file cadence, nothing below the fold moves. Cancel mid-file: the row returns to the queue, the dot turns amber, Resume re-arms. Complete with a simulated failure: the counts go red, the dot goes red, the toast and the Error filter agree.

---

## Task 8: Wire shortcuts, layers and toasts

**Files:** `apps/desktop/src/routes/batch.tsx`

- [ ] **Step 1: Shortcut table**

| Key | Action | Notes |
|---|---|---|
| `Ctrl+O` | Choose folder | unchanged |
| `Ctrl+E` | Export all settled rows | new; matches the toolbar's tooltip and Single |
| `Ctrl+A` | Select every row currently listed | uses `filterAndSortRows`, not `items` |
| `Delete` / `Backspace` | Remove checked rows | unchanged, now also visible in the bulk bar |
| `Escape` | Clear selection → cancel run → leave the screen | B17 |
| `↑` `↓` `Home` `End` | Move the selection (list focus) | Task 4, Step 6 — not registered globally, so the slider keeps its arrows |

- [ ] **Step 2: Escape**

```tsx
escape: () => {
  if (checkedIds.size > 0) setCheckedIds(new Set<string>());
  else if (isRunning) handleCancel();
  else void navigate({ to: "/" });
},
```

- [ ] **Step 3: Ctrl+A**

```tsx
"ctrl+a": () => setCheckedIds(new Set(visibleRows.map((item) => item.id))),
```

`visibleRows` is the same memo the table renders, so "select all" cannot include rows the filter is hiding.

- [ ] **Step 4: Toasts**

`position="top-right"` → `position="top-center"` and keep `placement="fixed"` / `limit: 3`. Keep the completion toast and its "Show errors" action.

- [ ] **Step 5: Verify**

`pnpm test` (the shortcuts hook has coverage). In the dev server run each key: filter to Tumor, Ctrl+A, check the count equals the filtered count; Escape clears; Escape again cancels a running batch; Escape again returns to the dashboard. A toast must not cover the toolbar's actions.

---

## Task 9: Craft sweep

**Files:** the batch components touched above

- [ ] **Step 1: Type and tracking**

| Element | Size / weight / tracking | Colour |
|---|---|---|
| Toolbar title | 15px / 600 / `-0.01em` | `#003366` |
| Subject chip | 11px / 500 / `0.01em`, tabular | `#4B5563` on `#003366`/5% |
| Table header | 10px / 600 / `0.08em`, uppercase | `#6B7280` |
| File name | 13px / 400 (selected 500) / `-0.01em` | `#1F2937` (`#003366`) |
| Secondary line, filter counts | 11px / 400 / `0.01em` | `#6B7280` |
| Probability | 12px mono, tabular | `#333333` |
| Stage filename | 13px / 500 / `-0.01em` | `white/90` |
| Stage `P(tumor)` label | 10px / 500 / `0.08em`, uppercase | `white/50` |
| Stage figure | 24px / 600 mono, tabular / `-0.02em` | verdict hue (`#7BE495` / `#FF9A9A` / `#FFD666`) |
| Dock headline | 13px / 500 / `-0.01em` | `white/90` |
| Dock counts | 12px, tabular | `white/60` |
| Dock disclaimer | 10px / 400 / `0.01em` | `white/45` |

- [ ] **Step 2: Delete the off-palette greys**

`#94A3B8` (≈2.5:1) and `#8A8F98` (≈3.4:1) are not usable for text. Replace every text use with `#6B7280` (4.8:1 on white). Non-text uses (a disabled glyph) may stay.

- [ ] **Step 3: Radii and elevation**

Regions have no radius and no shadow. Controls: `rounded-md` (6px) for icon buttons and rows' thumbnails, `rounded-lg` (8px) for buttons, `rounded-full` for pills. The only shadows are on true floating layers (toasts, the stage's error card).

- [ ] **Step 4: Hover and focus parity**

Every interactive row-level control keeps a 32px hit area; checkboxes keep the native `accent-[#0066CC]` with a 18px box. Focus order inside a row: checkbox → filename → export → remove. Nothing relies on hover to become visible or reachable.

- [ ] **Step 5: Verify**

Zoom to 200%: no clipping; the toolbar's `kbd` is the first thing to hide. Compare a row against the Single dock: the same verdict pill weight, the same semibold/mono mix for the numbers.

---

## Task 10: Motion and preference hardening

**Files:** the batch components, `apps/desktop/src/index.css` only if a rule is missing

- [ ] **Step 1: No new translucent Tailwind classes on dark surfaces**

The stage and dock use solid `#0B1220` / `#0F1A2B`. If a frosted element is genuinely needed on dark (the drag capsule, an error card), use `.glass-dark` / `.glass-scrim`, which `index.css` handles explicitly under `prefers-reduced-transparency: reduce`. A `backdrop-blur-*` utility on dark becomes a white slab with white text.

- [ ] **Step 2: Reduced motion**

Replace every scale/translate with an opacity cross-fade: row entrance, bulk/filter swap, stage selection cross-fade, overlay presence, disclosure, drop capsule. Keep `SPRING_GLIDE` for the progress hairline (a value change, not a spatial move) and let it step under reduced motion (already implemented). The overlay must still fade out rather than unmount.

- [ ] **Step 3: Reduced transparency and contrast**

`prefers-reduced-transparency`: the dock and stage are already solid; the drag capsule becomes solid `#0066CC`. `prefers-contrast: more`: hairlines move from `#EDF0F3` to `#C9D2DE` on the list and `white/10` to `white/40` on the stage and dock — add these as two rules in the existing `@media (prefers-contrast: more)` block, scoped by a `.batch-list` / `.surface-dark` class rather than a new utility soup.

- [ ] **Step 4: Verify**

In devtools, emulate `prefers-reduced-motion: reduce` and `prefers-reduced-transparency: reduce`: no element turns white-on-white, no movement, all state changes still legible.

---

## Task 11: Verification

**Automated**

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`

**New tests**

- [ ] `ResultsTable.test.tsx`
  - filtering to Tumor lists only tumor rows and reports the filtered count;
  - clicking a header sorts; a second click reverses; `aria-sort` follows;
  - checking a row reveals the bulk bar with "1 selected"; Clear selection restores the filter row;
  - checking rows under a filter and pressing Ctrl+A selects only visible rows (assert the count);
  - ArrowDown moves selection and DOM focus to the next row; End lands on the last;
  - an error row shows its reason inline (no `title` hover required).
- [ ] `ImagePreview.test.tsx`
  - no selection → "Select a scan to preview";
  - done → verdict pill with `tone="dark"`, probability, and τ;
  - the overlay disclosure toggles `aria-expanded` and reveals the colormap + opacity controls;
  - error → the reason and a Retry that calls `onRetry` with the id;
  - queued → "Waiting in the queue".
- [ ] `ProgressDisplay.test.tsx`
  - `role="progressbar"` reports `aria-valuenow` from the summary;
  - running shows Cancel, stopped shows Resume (disabled at zero remaining);
  - the disclaimer line is always present;
  - no "N% complete" duplicate remains.

**Manual matrix**

| Size | Check |
|---|---|
| 1200×800 (default) | toolbar one row; list and stage share one bottom line; dock pinned; nothing on the page scrolls but the list |
| 1600×1000 | list columns keep their rhythm; the scan grows with the stage, not with `vh` |
| 900×650 | workspace stacks and scrolls; dock stays visible; Escape/`Ctrl+O` still work |
| 200-file sample | list scrolls smoothly; header edge appears only after content passes under it; no row-level animation jank |
| Empty → sample → cancel → resume → complete | every dock state, the dot colour, the counts, and the toast copy agree |
| Reduced motion / transparency / contrast | Task 10, Step 4 |

---

## Non-goals

- No changes to inference, simulation, `useBatchRun`, CSV columns, folder harvesting, Tauri quit guard or the route tree.
- No export-selected action. The bulk bar surfaces only capabilities that already exist (Remove, Clear). Export-selected is a follow-up product decision.
- No virtualized list. 200–500 rows render fine; revisit above ~2000.
- No shared `useFittedBox` refactor of `ImageStage`, and no unification of the two preview panes beyond the badge. Those are the next structural step, not this one.
- No dashboard, history or about screen changes (History is still a placeholder).
- No new dependencies, no new motion tokens.

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Full-bleed + `overflow-hidden` clips content on short windows | The `min-h-0` chain plus the stage's own scroll for the answer block; the manual matrix includes 900×650 |
| Removing the `Status` column breaks a consumer of `BatchSort["key"]` | Only `ResultsTable` reads it; the extracted `batch-rows.ts` is the single import site, covered by tests |
| Re-export shims break type imports | Both shims re-export the same prop type; `pnpm typecheck` covers `ResultsPanel`, `ResultsTable` and `ImagePreview` |
| `IconButton`/`RangeSlider` surface props regress the Single screen | Defaults are the current values; Task 3 Step 5 requires a visual check of `/single` |
| Tests that query "Done"/"Processing" text break | The three new test files assert the new vocabulary; no existing batch tests exist today |
| The scan's fit flickers on first load | Natural size is read from `onLoad`; until it lands the layers render `object-contain` at full size, so only the letterboxing changes, not the image |
| The dock grows taller than expected at 10px type with large text sizes | Dock height is content-driven, the workspace is `flex-1 min-h-0`, so the list absorbs the difference; verify at 150% text zoom |
