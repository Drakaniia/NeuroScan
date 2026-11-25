# Single Screening — UI Structure Plan

> **For agentic workers:** Work task by task. Each task ends green (`pnpm typecheck`, `pnpm test`, `pnpm lint`) before the next starts.

**Goal:** Replace the Single Screening screen's "content page with a card on it" structure with an instrument-panel structure: the window itself is the viewer, the scan is the largest object on screen, and every piece of chrome is either app chrome (light, above) or part of the viewing surface (dark, anchored to the scan).

**Design basis:** Apple *Designing Fluid Interfaces* (2018), *Materials*, *Details of UI Typography* (2020), *Principles of Great Design*. Existing project specs: `docs/ui/01-design-overview.md`, `docs/ui/04-screen-specifications.md` (Single Screening), `docs/ui/06-interaction-patterns.md`, `docs/ui/12-design-validation.md`. Motion tokens already live in `apps/desktop/src/lib/ease.ts`; do not invent new ones.

---

## Why it reads as generic today

These are structural, not cosmetic. Each is visible in the current source.

1. **The screen is a reading column, not a viewer.** `__root.tsx` wraps every route in `mx-auto max-w-container px-4 py-10` (container 1200px, `px-4` inside the border box → 1168px of content). On a 1920px window the "fullscreen" stage is a 1168px card with 360px of pale page either side and 40px above and below, so the scan is a picture in a card on a page. The single screen's own root is `flex min-h-0 flex-1 flex-col gap-4`, inheriting that column and its gaps.
2. **Three stacked chrome rows.** Title bar (36px) → hand-rolled screen header (~44px + page padding) → dark stage → white result bar floating inside the stage. The result bar is a second card inside the first card, with nested radii (`rounded-2xl` inside `rounded-xl`, 12px apart), which is the exact "widget on a card" look.
3. **The header explains the UI instead of being the UI.** The right side prints `"Esc to go back · Space toggles heatmap · double-click fits"` in the chrome. It is documentation in the interface, it wraps under `flex-wrap`, and it competes with the filename. Shortcuts already have tooltips and a menu.
4. **The empty state hides the app's one distinctive surface.** Before a scan loads, the screen is a white page with a dashed upload card. The dark clinical stage — the thing that makes this screen *this* screen — only appears after a drop. At rest the screen looks like any file-upload demo.
5. **File actions are mixed into view controls.** `FloatingControls` begins with an Upload button (filled, primary) inside a cluster otherwise about looking at the image: zoom, fit, heatmap, settings. File-level and view-level actions do not belong on the same material.
6. **The result panel covers the scan and competes with it.** It is `absolute inset-x-3 bottom-3 max-w-4xl` on a white surface, so it floats over the image's lower edge, and its details layer grows upward *over* the scan. Four equally weighted buttons (`Details`, `Add to History`, `Export`, `New Scan`) give the answer and the next step the same rank.
7. **The single screen has no persistent safety line.** Batch shows the not-a-medical-device disclaimer permanently; Single hides it in the expanded details. For a research/educational screening aid that is a responsibility gap (`docs/ui/07-error-handling-feedback.md`).
8. **Preference handling breaks dark surfaces.** `index.css` has `[class*="backdrop-blur"] { background-color: #ffffff !important; }` under `prefers-reduced-transparency: reduce`. Any dark `backdrop-blur` element becomes white while keeping white text — already true for the `Analyzing…` scrim (`bg-[#0B1220]/75 backdrop-blur-md` + `text-white`). Adding dark chrome without a dedicated material class makes this worse.
9. **The settings inspector covers window chrome.** `Drawer` (inspector) is `inset-y-3 right-3 z-50` with a `fixed inset-0` backdrop; the title bar is `z-40 h-9`. Opening Heatmap Settings covers minimise/maximise/close and blocks the whole window behind a scrim.
10. **Layer order and back-control parity are inconsistent.** Single's back control is a bare hover-only `Link`; Batch's is an anchor wrapping a `motion.span` with press feedback in the same 36px box. Escape closes the *details* layer before the *settings* drawer, which is the wrong layer order.

---

## Target anatomy

```
┌ TitleBar  h-9 · light · app chrome ───────────────────────────────┐
├ ScreenToolbar  h-12 · light · full bleed ─────────────────────────┤
│ [←]  Single Screening  [▤ brain_t2.png]            [Open scan ⌘O] │
├───────────────────────────────────────────────────────────────────┤
│  DARK VIEWING STAGE  (flex-1, edge to edge, no radius)            │
│                                                                   │
│            ┌──────────── scan box ────────────┐                   │
│            │  MRI + CAM overlay               │   [zoom cluster]  │
│            │  (fitted to the viewer region)   │   (light glass)   │
│            └──────────────────────────────────┘                   │
│                                                                   │
├── dark glass result dock · slide up from the bottom edge ─────────┤
│ ▬▬▬▬▬▬▬▬▬▬▬ probability hairline + τ tick ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ │
│ [● Tumor detected] 34.2% P(tumor)  Moderate   Details ⌃   Export  │
│ Research aid · not a medical diagnosis       Add to history  New  │
└───────────────────────────────────────────────────────────────────┘
```

- The **light** chrome answers "where am I / how do I get out / how do I open a file".
- The **dark** surface is the work: image, view controls, result. Nothing floats above it that is not either part of it or transient (toast, drawer).
- The result dock is in normal layout flow, so the viewer shrinks for it instead of being covered.

---

## Decisions

| # | Decision | Rejected alternative and why |
|---|---|---|
| D1 | `/single` opts out of the padded content column; the route owns the full area below the title bar. A `FULL_BLEED_ROUTES` set in `__root.tsx` keeps other routes unchanged. | Negative margins or `fixed` positioning inside the screen: fragile against the one scrolling region and the title bar. |
| D2 | The dark stage is permanent — the empty state is also on it. | Keeping the pale empty state: the viewer's identity only appears after a drop, and the empty state stays a generic uploader. |
| D3 | The result dock is a **dark glass** strip docked to the stage's bottom edge, in flow. | White dock: on a full-bleed dark viewer a white slab reintroduces the "card on the page" look and makes the dock fight the toolbar for attention. |
| D4 | File actions live in the screen toolbar; the floating cluster is view-only (heatmap, settings, zoom, fit). | Keeping Upload in the cluster: mixes scopes on one material, and puts a filled primary button on top of the image being read. |
| D5 | Details expand **inside the dock**, and the dock is a layout row, so the viewer re-fits instead of being covered. | Details as a right inspector: two right-side inspectors (settings + details) would need a mutual-exclusion rule and a second storage layer for very little gain. |
| D6 | The verdict pill on dark is **tinted**, not solid: `bg-verdict/15`, verdict-tinted text, inset ring. | Solid `#28A745`/white and `#DC3545`/white: 3.1:1 and 4.0:1 — below AA for 14px text. It is already a contrast defect in `components/single/VerdictBadge.tsx`. The solid verdict colour still appears in the dock's gauge and hairline. |
| D7 | Toasts on this screen move to `top-center`. | `top-right` is now the file action (toolbar) and the view cluster (stage); a toast there covers a control. `top-center` only ever covers the file chip. |
| D8 | `Drawer` gains a content-area inset for inspectors: panel and backdrop start below the title bar. | Leaving `inset-y-3`: the settings panel covers the window controls, which is a "never trap the user" violation. |
| D9 | Export format moves from Heatmap Settings into the result details, labelled "Export format". | Keeping it under "Heatmap Settings": a control lives next to what it changes. A split-button menu on Export is the next step if the format is changed often; not built now. |
| D10 | Escape peels the topmost layer: settings drawer → details → leave the screen. | Current order closes the details *behind* the open drawer. |
| D11 | Type hierarchy on the dock: verdict → probability (largest figure) → confidence (quiet pill with a state dot) → actions. `Details` becomes a disclosure next to the answer, not a peer action. | Four equal buttons: no rank, so every action asks for the same attention. |

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `apps/desktop/src/routes/__root.tsx` | modify | Full-bleed contract for viewer routes |
| `apps/desktop/src/components/chrome/BackLink.tsx` | create | One back control (press feedback, 36px, consistent) |
| `apps/desktop/src/routes/batch.tsx` | modify | Adopt `BackLink` (parity; 5 lines) |
| `apps/desktop/src/components/single/ScreenToolbar.tsx` | create | Screen identity, file chip, file actions |
| `apps/desktop/src/components/single/SingleScreeningScreen.tsx` | modify | New shell composition, layer order, toast position, dock wiring |
| `apps/desktop/src/components/single/ImageStage.tsx` | modify | Permanent dark surface, viewer region, scoped overlays, dock slot |
| `apps/desktop/src/components/single/DropZone.tsx` | modify | Empty state on the dark stage |
| `apps/desktop/src/components/single/ResultsPanel.tsx` | modify | Docked result, dark material, hierarchy, export format |
| `apps/desktop/src/components/single/VerdictBadge.tsx` | modify | Tinted verdict pill for dark |
| `apps/desktop/src/components/single/FloatingControls.tsx` | modify | View-only cluster, priority order, shortcut attrs |
| `apps/desktop/src/components/single/HeatmapPanel.tsx` | modify | Content inset, remove Export Settings |
| `apps/desktop/src/components/motion/drawer.tsx` | modify | `inset` prop for content-area inspectors |
| `apps/desktop/src/components/motion/drawer.test.tsx` | modify | Cover the inset contract |
| `apps/desktop/src/index.css` | modify | Dark glass materials, focus ring on dark, preference overrides |
| `apps/desktop/src/components/single/ResultsPanel.test.tsx` | create | Dock region, persistent disclaimer, details disclosure |

No model, inference, history, batch or export-format changes. `useImageTransform`, `annotated-export`, `heatmap` and the store are untouched.

---

## Task 1: Give the Single screen the window

**Files:** `apps/desktop/src/routes/__root.tsx`

**Interfaces**
- Consumes: TanStack Router `useRouterState`
- Produces: `/single` renders in an unpadded, non-scrolling, full-height content area; every other route keeps today's reading column

- [ ] **Step 1: Add the route contract**

```tsx
import { createRootRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/** Routes that own their whole content area: no page padding, no page scroll. */
const FULL_BLEED_ROUTES = new Set(["/single"]);

function RootLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const fullBleed = FULL_BLEED_ROUTES.has(pathname);
  // …
}
```

- [ ] **Step 2: Apply it to the scroll region and `<main>`**

```tsx
<div className={cn("min-h-0 flex-1", fullBleed ? "overflow-hidden" : "overflow-y-auto overscroll-contain")}>
  <main
    id="main-content"
    tabIndex={-1}
    className={cn(
      "mx-auto flex w-full flex-col",
      fullBleed ? "h-full max-w-none" : "min-h-full max-w-container px-4 py-10",
    )}
  >
```

`h-full` (not `min-h-full`) is what makes the screen's `flex-1` stage resolve against a definite height. Keep the skip link and `tabIndex={-1}` exactly as they are.

- [ ] **Step 3: Verify the other routes did not move**

Run the dev server and check `/` and `/batch` still have the 1200px column, 40px vertical padding and the normal scrollbar. `/single` must have no page padding and no page scrollbar.

---

## Task 2: Replace the page header with a screen toolbar

**Files:**
- Create: `apps/desktop/src/components/chrome/BackLink.tsx`
- Create: `apps/desktop/src/components/single/ScreenToolbar.tsx`
- Modify: `apps/desktop/src/routes/batch.tsx` (parity)
- Modify: `apps/desktop/src/components/single/SingleScreeningScreen.tsx`

**Interfaces**
- `ScreenToolbar({ fileName, onOpenScan })`
- `BackLink({ label? })`

- [ ] **Step 1: Create `BackLink`**

```tsx
export function BackLink({ label = "Back to dashboard" }: { label?: string }) {
  const reduce = useReducedMotion();
  return (
    <Link
      to="/"
      aria-label={label}
      className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-[#003366] transition-colors duration-150 hover:bg-[#E6F0FF] hover:text-[#0066CC]"
    >
      <motion.span
        aria-hidden="true"
        className="inline-flex"
        whileTap={reduce ? { opacity: 0.7 } : { scale: 0.94 }}
        transition={SPRING_PRESS}
      >
        <ArrowLeft className="size-5" />
      </motion.span>
    </Link>
  );
}
```

Replace Batch's inline anchor + `motion.span` with `<BackLink />`. Same 36px hit area, same press feel, one source.

- [ ] **Step 2: Create `ScreenToolbar`**

One 48px light row. It carries the screen's identity and the only file-level action. It does **not** carry instructions.

```tsx
interface ScreenToolbarProps {
  fileName: string | null;
  onOpenScan: () => void;
}

export function ScreenToolbar({ fileName, onOpenScan }: ScreenToolbarProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 bg-[#F5F8FF] px-3">
      <BackLink />

      <h1 className="shrink-0 text-[15px] font-semibold tracking-[-0.01em] text-[#003366]">
        Single Screening
      </h1>

      {fileName ? (
        <span
          aria-live="polite"
          className="flex min-w-0 items-center gap-1.5 rounded-md bg-[#003366]/[0.05] px-2 py-1"
        >
          <ScanLine className="size-3.5 shrink-0 text-[#6B7280]" aria-hidden="true" />
          <span className="truncate text-xs text-[#4B5563]">{fileName}</span>
        </span>
      ) : (
        <span className="text-xs text-[#6B7280]">No scan open</span>
      )}

      <div className="ml-auto flex shrink-0 items-center">
        <Button
          variant="secondary"
          onClick={onOpenScan}
          title="Open a scan (Ctrl+O)"
          aria-keyshortcuts="Control+O"
          icon={<Upload className="size-4" aria-hidden="true" />}
        >
          {fileName ? "Replace" : "Open scan"}
          <kbd className="ml-1 hidden rounded border border-[#0066CC]/20 bg-white/60 px-1 font-sans text-[10px] font-medium tracking-[0.02em] text-[#0056AD] lg:inline">
            Ctrl O
          </kbd>
        </Button>
      </div>
    </header>
  );
}
```

The `kbd` hint is the affordance the deleted sentence used to be: one shortcut, attached to the action it triggers, hidden when there is no room.

- [ ] **Step 3: Compose the screen**

```tsx
return (
  <div className="flex h-full min-h-0 flex-col bg-[#0B1220]">
    <ScreenToolbar fileName={image?.name ?? null} onOpenScan={browse} />
    {image ? (
      <ImageStage /* … */ />
    ) : (
      <DropZone onFile={handleFile} onBrowse={browse} shakeKey={shakeKey} />
    )}
    {/* live region, HeatmapPanel, hidden input, toasts */}
  </div>
);
```

Delete the old `<header>`, the shortcut sentence, and the wrapper that existed only to give `DropZone` a height to resolve against.

- [ ] **Step 4: Verify**

The toolbar is exactly 48px tall; the file name truncates instead of pushing the button; `Ctrl+O` still opens the picker from the toolbar button and the keyboard; `/batch`'s back control behaves identically to Single's. After Batch's inline anchor is replaced, `pnpm lint` must confirm its `ArrowLeft`, `motion` and `SPRING_PRESS` imports are still used (drop the ones that are not).

---

## Task 3: Make the stage the permanent viewing surface

**Files:** `apps/desktop/src/components/single/ImageStage.tsx`

**Interfaces**
- Adds `dock?: ReactNode` (rendered below the viewer, inside the dark surface)
- `children` stays for overlays that belong *inside the viewer*
- `transform.stageRef` now measures the **viewer region**, not the whole dark surface

- [ ] **Step 1: Restructure the shell**

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.18, ease: EASE_OUT }}
  className="surface-dark relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0B1220]"
>
  <div
    ref={transform.stageRef}
    onPointerDown={/* … unchanged … */}
    className={cn(
      "relative flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden",
      transform.canPan
        ? transform.isDragging ? "cursor-grabbing" : "cursor-grab"
        : "cursor-default",
    )}
  >
    {/* the transformed fit box + scan + overlay, unchanged */}
    {/* Analyzing scrim, error scrim: absolute inset-0 of THIS region */}
    {children}
  </div>

  {dock}
</motion.div>
```

Remove `rounded-xl`, `shadow-card`, `ring-1 ring-inset ring-white/10` and the outer `absolute inset-0` wrapper. A full-bleed surface has no radius and no “card” shadow. Large surfaces cross-fade rather than scale: drop the `scale: 0.995` entrance. Under `prefers-reduced-motion` this is the same 180ms opacity change, which is already the reduced path.

- [ ] **Step 2: Scope the scan-state overlays**

Move the `Analyzing…` and error overlays inside the viewer region. They describe the scan, so they must not cover the toolbar or the result dock. Raise the error overlay to `z-30` so it blocks the floating controls while it is up; keep the analyzing scrim at `z-10` so the controls stay usable.

- [ ] **Step 3: Make the error state a dark material**

The current white card inside a dark scrim is a brightness jump. Use dark glass with a red-tinted icon tile:

```tsx
<div className="glass-dark flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-white/10 p-6 text-center shadow-modal">
  <span className="flex size-12 items-center justify-center rounded-2xl bg-[#DC3545]/15 ring-1 ring-inset ring-[#DC3545]/30">
    <AlertTriangle className="size-6 text-[#FF9A9A]" strokeWidth={1.6} aria-hidden="true" />
  </span>
  <h3 className="text-lg font-semibold tracking-[-0.01em] text-white/90">Could not screen this scan</h3>
  <p className="text-sm leading-relaxed text-white/60 text-pretty">{error}</p>
  <Button variant="secondary" onClick={onRetry} icon={<RefreshCw className="size-4" />} className="mt-1">
    Retry
  </Button>
</div>
```

- [ ] **Step 4: Verify the fit math**

`useImageTransform` measures `stageRef`; because the viewer region is the flex child that shrinks when the dock is present, the fitted box must stay entirely inside the visible region in every state (no dock, dock, dock + details). Zoom/pan/double-click and the `ResizeObserver` must still work after the dock appears.

---

## Task 4: Rebuild the empty state on the dark stage

**Files:** `apps/desktop/src/components/single/DropZone.tsx`

**Interfaces:** unchanged (`onFile`, `onBrowse`, `shakeKey`)

- [ ] **Step 1: Composition**

The stage is the surface; the drop target is a framed area on it, not a card on a page.

```tsx
<motion.div
  ref={zoneRef}
  role="button"
  tabIndex={0}
  aria-label="Open an MRI scan: drop a PNG or JPG here, or press Enter to browse"
  className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6"
  /* drag handlers, keyboard handlers, shake, entrance unchanged */
>
  <div
    className={cn(
      "flex w-[min(26rem,100%)] flex-col items-center gap-5 rounded-2xl border border-dashed px-10 py-12 text-center transition-colors duration-200",
      isDragging
        ? "border-[#8FC1F0]/70 bg-[#8FC1F0]/[0.06]"
        : "border-white/15 bg-white/[0.03] hover:border-[#8FC1F0]/50 hover:bg-white/[0.05]",
    )}
  >
    <span className="flex size-16 items-center justify-center rounded-2xl bg-white/[0.06] ring-1 ring-inset ring-white/10">
      <ImagePlus className="size-8 text-[#8FC1F0]" strokeWidth={1.5} aria-hidden="true" />
    </span>

    <div className="space-y-1.5">
      <h2 className="text-xl font-semibold leading-snug tracking-[-0.01em] text-white/90 text-balance">
        {isDragging ? "Drop to screen this scan" : "Open an MRI scan"}
      </h2>
      <p className="text-sm leading-relaxed text-white/60 text-pretty">
        {isDragging
          ? "PNG or JPG · screened on this machine"
          : "Drop a PNG or JPG here, or choose a file. Everything stays on this machine."}
      </p>
    </div>

    {/* The zone itself is the button. This is a styled affordance inside it,
        not a nested control: a real <button> inside role="button" is invalid
        ARIA and would fire the browse action twice on Enter. */}
    <span className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#E6F0FF] px-3.5 text-sm font-medium text-[#0066CC] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-inset ring-[#0066CC]/20">
      <Upload className="size-4" aria-hidden="true" />
      Choose a scan
    </span>
  </div>

  <div className="flex w-full items-end justify-between gap-4 text-[11px] leading-relaxed tracking-[0.01em] text-white/55">
    <p>Processed locally — nothing leaves this machine.</p>
    <p className="hidden text-right sm:block">Research aid · not a medical diagnosis.</p>
  </div>
</motion.div>
```

- [ ] **Step 2: Behaviour to keep**

Dragenter/over/leave depth counting, drop, `dragover` `dropEffect`, Enter/Space activation, the shake on an unsupported drop, and the `isDragging` copy swap. The frame scales `1.04` on drag (keep `SPRING_LAYOUT`), nothing else moves. The CTA stays a styled `<span>` so the whole frame remains one button and one tab stop — no nested interactive element.

- [ ] **Step 3: Verify**

At all four window sizes: no page scrollbar, the footer line never wraps into the frame, the frame is centered, and the dark surface is edge-to-edge. Keyboard-only: Tab reaches the frame, Enter opens the picker, Escape still leaves the screen.

---

## Task 5: Dock the result and give it one rank order

**Files:**
- `apps/desktop/src/components/single/ResultsPanel.tsx`
- `apps/desktop/src/components/single/VerdictBadge.tsx`
- `apps/desktop/src/components/single/SingleScreeningScreen.tsx` (pass the dock)
- `apps/desktop/src/components/single/ResultsPanel.test.tsx` (new)

**Interfaces**
- `ResultsPanel` gains `exportMode: HeatmapExportMode` and `onExportModeChange: (mode) => void`
- Everything else stays (`result`, `inHistory`, `onAddToHistory`, `onExport`, `onNewScan`, `detailsOpen`, `onDetailsOpenChange`)

- [ ] **Step 1: Dock container**

```tsx
<motion.section
  role="region"
  aria-label="Screening result"
  initial={{ opacity: 0, y: 14 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: 14 }}
  transition={{ duration: 0.24, ease: EASE_OUT }}
  className="glass-dark relative z-20 shrink-0 border-t border-white/10 shadow-[0_-8px_24px_rgba(0,0,0,0.35)]"
>
  <div className="mx-auto w-full px-4">
    {/* details, then the bar */}
  </div>
</motion.section>
```

No `absolute`, no `max-w-4xl`, no `rounded-2xl`, no `bg-white/95`. The dock belongs to the stage edge. The slide is from its own edge (spatial consistency) and is clipped by the stage's `overflow-hidden`.

Under `useReducedMotion()` the dock enters and exits as an opacity cross-fade (0.18s) with no `y`; the details layer keeps today's opacity-only expansion and the hairline keeps its `duration: 0` path.

- [ ] **Step 2: The bar**

```tsx
<div className="relative flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5">
  <ThresholdHairline result={result} reduce={reduce} />   {/* absolute inset-x-0 top-0, h-[3px] */}

  <div className="flex min-w-0 items-center gap-3">
    <VerdictBadge verdict={result.verdict} />
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/55">P(tumor)</span>
      <span className={cn("font-mono text-2xl font-semibold leading-none tabular-nums tracking-[-0.02em]", VERDICT_TEXT[result.verdict])}>
        {probability.toFixed(1)}%
      </span>
    </div>
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] font-medium tracking-[0.01em] text-white/70">
      <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: CONFIDENCE_DOT[confidence] }} />
      {confidence}
    </span>
    <Button
      variant="ghost"
      onClick={() => onDetailsOpenChange(!detailsOpen)}
      aria-expanded={detailsOpen}
      aria-controls={detailsId}
      className="h-7 px-2 text-[12px] text-white/65 hover:bg-white/10 hover:text-white"
      icon={<motion.span animate={{ rotate: detailsOpen ? 180 : 0 }} transition={reduce ? { duration: 0 } : SPRING_SWAP}><ChevronUp className="size-3.5" /></motion.span>}
    >
      Details
    </Button>
  </div>

  <div className="ml-auto flex flex-wrap items-center gap-2">
    <Button variant="primary" onClick={onExport} icon={<Download className="size-4" />}>Export</Button>
    <Button
      variant="secondary"
      onClick={onAddToHistory}
      disabled={inHistory}
      icon={inHistory ? <Check className="size-4" /> : <History className="size-4" />}
    >
      {inHistory ? "Added" : "Add to history"}
    </Button>
    <Button
      variant="ghost"
      onClick={onNewScan}
      className="text-white/70 hover:bg-white/10 hover:text-white"
      icon={<ScanLine className="size-4" />}
    >
      New scan
    </Button>
  </div>

  <p className="w-full text-[11px] leading-relaxed tracking-[0.01em] text-white/55">
    Research/educational screening aid — not a medical device and not a diagnosis.
  </p>
</div>
```

`cn` uses `tailwind-merge`, so the ghost overrides win over the variant's light hover colours. Primary blue on `#0F1A2B` keeps 5.4:1 with white.

- [ ] **Step 3: Tinted verdict pill**

```tsx
const VERDICT_STYLES: Record<Verdict, { surface: string; icon: LucideIcon }> = {
  "no-tumor": { surface: "bg-[#28A745]/15 text-[#7BE495] ring-[#28A745]/30", icon: CheckCircle2 },
  tumor: { surface: "bg-[#DC3545]/15 text-[#FF9A9A] ring-[#DC3545]/30", icon: XCircle },
  "low-confidence": { surface: "bg-[#FFC107]/15 text-[#FFD666] ring-[#FFC107]/30", icon: AlertTriangle },
};
// on the span: "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold
// tracking-[-0.01em] ring-1 ring-inset" + surface
```

Keep `VERDICT_FILL` (solid) for the gauge: `no-tumor #28A745`, `tumor #DC3545`, `low-confidence #FFC107`.

- [ ] **Step 4: Dark details layer**

- Container: `border-b border-white/10 px-0 py-4`; `max-h-[min(38vh,320px)] overflow-y-auto`. Expanding must never collapse the viewer below usable size on a 600px-tall window.
- Low-confidence notice: `bg-[#FFC107]/10 text-[#FFD666] ring-1 ring-inset ring-[#FFC107]/25`.
- `ThresholdScale`: track `bg-white/10 ring-1 ring-inset ring-white/10`; band `bg-[#FFC107]/25`; τ tick `bg-white/70`; probability handle `bg-[#0F1A2B] ring-2 ring-white/80`; labels `text-white/55`.
- `Metric` labels `text-white/55`, values `text-white/85`, mono + `tabular-nums` kept.
- File line `text-white/55`, bottom disclaimer `text-white/55` (full text from today's panel — the short persistent line lives in the bar; keep it ≥ white/55 at 11px, which is ≈ 6:1 on `#0B1220`).
- **Add the export format group** here, above the disclaimer:

```tsx
<fieldset className="space-y-1">
  <legend className="text-[11px] tracking-[0.02em] text-white/55">Export format</legend>
  {/* same two radio rows as today, restyled: text-white/85 / text-white/55, accent-[#8FC1F0] */}
</fieldset>
```

- [ ] **Step 5: Wire the dock**

```tsx
<ImageStage
  /* … */
  dock={
    <AnimatePresence>
      {result ? (
        <ResultsPanel
          key={result.id}
          exportMode={exportMode}
          onExportModeChange={setExportMode}
          /* … */
        />
      ) : null}
    </AnimatePresence>
  }
>
  <FloatingControls /* … */ />
</ImageStage>
```

Note: `AnimatePresence` around a flex child works, but the dock must keep `shrink-0`; if the exit animation leaves a gap, render the dock unconditionally and drive its presence with the result inside instead.

- [ ] **Step 6: Test**

Create `ResultsPanel.test.tsx` (vitest + `@testing-library/react`, no jest-dom matchers — the repo doesn't install them):

```tsx
const result: ScreeningResult = {
  id: "r1", fileName: "brain_t2.png", sourceUrl: "blob:x",
  probability: 0.342, threshold: 0.5, lowConfidenceBand: 0.08,
  verdict: "no-tumor", modelId: "neuroscan-cnn", modelVersion: "1.0.0",
  elapsedMs: 412, timestamp: Date.now(),
};

it("always states that the result is not a diagnosis", () => {
  render(<ResultsPanel result={result} inHistory={false} onAddToHistory={() => {}}
    onExport={() => {}} onNewScan={() => {}} detailsOpen={false}
    onDetailsOpenChange={() => {}} exportMode="combined" onExportModeChange={() => {}} />);
  expect(screen.getByText(/not a medical device/i)).not.toBeNull();
});

it("exposes the details layer as a disclosure", () => {
  // render with detailsOpen={false}; the Details button must have aria-expanded="false"
  // and aria-controls pointing at the details container id
});
```

---

## Task 6: Tighten the floating controls

**Files:** `apps/desktop/src/components/single/FloatingControls.tsx`, `SingleScreeningScreen.tsx`

- [ ] **Step 1: View-only cluster, in use order**

Remove `Upload` and the first divider. Order the two groups by how often they are used: heatmap controls first, then navigation.

```
[Flame] [Settings] │ [ZoomOut] [100%] [ZoomIn] [Fit]
```

The flame is the toggle (`aria-pressed`), the gear opens the inspector. Keep the material as light glass (`bg-white/75 backdrop-blur-xl backdrop-saturate-150`): it is a *light* interactive material on a dark surface, which is exactly what keeps it legible without competing with the scan. Do not convert it to dark glass.

- [ ] **Step 2: Shortcut attributes and copy**

- Heatmap: `aria-keyshortcuts="Space"`, label `"Toggle heatmap (Space)"`.
- Fit: `aria-keyshortcuts="0"`, label `"Fit to screen (0, or double-click the scan)"`.
- Zoom: labels `"Zoom in (+)"` / `"Zoom out (−)"`.
- Percent: keep the polite live readout; `text-white` is not needed because the chip is light.

- [ ] **Step 3: Verify**

Tab reaches every control; disabled zoom states read as disabled on the light chip; toggling the heatmap still animates opacity/scale/blur in `ImageStage`; opening settings is the only way to reach the drawer.

---

## Task 7: Materials, contrast and preference fixes

**Files:** `apps/desktop/src/index.css`, `apps/desktop/src/components/motion/drawer.tsx`, `HeatmapPanel.tsx`, `SingleScreeningScreen.tsx`, `drawer.test.tsx`

- [ ] **Step 1: Add the dark materials**

Plain CSS classes (not Tailwind utilities), so the existing reduced-transparency selector — which matches `[class*="backdrop-blur"]` — cannot silently turn them white:

```css
/* Dark glass for surfaces that belong to the viewing stage. Elements using
   these must NOT also carry a Tailwind `backdrop-blur-*` class: the
   reduced-transparency block forces those to white. */
.glass-dark {
  background-color: rgba(15, 26, 43, 0.86);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
}

.glass-scrim {
  background-color: rgba(11, 18, 32, 0.74);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

/* Focus must stay visible on the dark stage; #0066CC is near-invisible there. */
.surface-dark :focus-visible {
  outline-color: #8fc1f0;
}
```

Use `.glass-dark` on the result dock and the error card, `.glass-scrim` on the analyzing and error scrims. Remove their Tailwind `backdrop-blur-*` classes.

- [ ] **Step 2: Preference overrides**

```css
@media (prefers-reduced-transparency: reduce) {
  [class*="backdrop-blur"] {
    backdrop-filter: none !important;
    background-color: #ffffff !important;
  }
  .glass-dark {
    backdrop-filter: none !important;
    background-color: #0f1a2b !important;
  }
  .glass-scrim {
    backdrop-filter: none !important;
    background-color: rgba(11, 18, 32, 0.94) !important;
  }
}

@media (prefers-contrast: more) {
  .glass-dark,
  .glass-scrim {
    background-color: #0b1220 !important;
  }
  .glass-dark {
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.4);
  }
}
```

This also fixes the current bug where the `Analyzing…` scrim becomes white with white text under reduced transparency.

- [ ] **Step 3: Keep inspectors out of the window chrome**

Add to `Drawer`:

```tsx
/** `content` starts below the title bar, so window controls stay reachable. */
inset?: "window" | "content";
```

Take `inset-0` out of the backdrop's base class list, then:

- backdrop: `inset === "content" ? "top-[var(--titlebar-h)] right-0 bottom-0 left-0" : "inset-0"`
- inspector panel: `inset === "content" ? "bottom-3 right-3 top-[calc(var(--titlebar-h)+0.75rem)]" : "inset-y-3 right-3"`
- modal panel: unchanged (`inset-y-0`)

Define the variable in `index.css`:

```css
:root {
  --titlebar-h: 2.25rem; /* TitleBar h-9 */
}
```

`HeatmapPanel` passes `inset="content"`. Add one test: an inspector with `inset="content"` has a backdrop whose class list contains `top-[var(--titlebar-h)]` and not `inset-0`; a modal keeps `inset-0`.

- [ ] **Step 4: Toast position**

In `SingleScreeningScreen`, change `position="top-right"` to `position="top-center"`. The toolbar's right side is now a control; the centre only holds the file chip.

- [ ] **Step 5: Layer order**

```tsx
escape: () => {
  if (panelOpen) setPanelOpen(false);
  else if (detailsOpen) setDetailsOpen(false);
  else navigate({ to: "/" });
},
```

- [ ] **Step 6: Mark the stage**

Add `surface-dark` to the stage root (`ImageStage`) so the focus-ring rule applies.

- [ ] **Step 7: Verify preferences**

In Chrome DevTools → Rendering, emulate `prefers-reduced-transparency: reduce`, `prefers-reduced-motion: reduce`, `prefers-contrast: more`. Check: dock and scrims stay dark and readable; no white-on-white text; focus rings visible on the dark stage; drawer starts below the title bar; window controls remain clickable.

---

## Task 8: Move export format next to the export it governs

**Files:** `ResultsPanel.tsx` (done in Task 5), `HeatmapPanel.tsx`, `SingleScreeningScreen.tsx`

- [ ] **Step 1: Remove the group from `HeatmapPanel`**

Delete the `Export Settings` `ControlGroup`, the `exportMode` / `onExportModeChange` props and their imports. The panel is now exactly what it says: colormap, opacity, intensity.

- [ ] **Step 2: Update the screen's props**

`SingleScreeningScreen` passes `exportMode` and `onExportModeChange` to `ResultsPanel` instead of `HeatmapPanel`. State and the export call are unchanged.

- [ ] **Step 3: Verify**

Both modes still produce the same files (`combined`, `heatmap`); changing the format is possible with the dock's details open; Heatmap Settings contains only heatmap controls.

---

## Task 9: Verification

**Files:** none (verification only)

- [ ] **Step 1: Static checks**

```bash
pnpm typecheck
pnpm test
pnpm lint
```

All three must pass. `pnpm lint` is the exact command CI runs.

- [ ] **Step 2: State matrix**

Check each at 800×600, 1024×700, 1440×900 and maximised 1920×1080:

| State | Must hold |
|---|---|
| Empty | Dark stage edge-to-edge, no page scrollbar, footer reads on one line, frame centered |
| Drag over empty | Frame highlights, copy changes, icon scales, no layout shift |
| Loaded + analyzing | Scrim covers the viewer only; controls and toolbar remain visible |
| Result | Dock appears at the bottom, gauge at its top edge, no part of the scan is covered |
| Details open | Viewer re-fits; dock details scroll; scan never smaller than usable |
| Low confidence | Tinted amber pill, dot, notice in details; no solid amber/white text |
| Error | Dark glass card, Retry works, scrim stays dark |
| Settings open | Drawer starts below the title bar; window controls clickable; stage visible behind |
| Both layers open | Escape closes settings first, then details, then leaves the screen |
| 300% zoom + pan | Drag 1:1, rubber-band at bounds, release velocity smooth, Fit returns |
| Export both modes | Toast top-centre; file lands with the same overlay settings |

- [ ] **Step 3: Keyboard and assistive pass**

Tab order: toolbar → view cluster → dock (answer → details → actions) → drawer. Focus ring visible on the dark stage. `Ctrl+O`, `Ctrl+N`, `Ctrl+E`, `Space`, `+`, `-`, `0`, double-click, `Escape`. Screen reader: one `h1`; the result region is named; the live region announces verdict and probability once; the details button exposes `aria-expanded`.

- [ ] **Step 4: Contrast spot check**

- White (`text-white/90`) on `#0B1220`: ≈ 16:1.
- White/60 on `#0B1220`: ≈ 7:1.
- White/55 at 11px: ≈ 6:1 — AA for normal text.
- `#7BE495` / `#FF9A9A` / `#FFD666` on `#0F1A2B`: ≥ 5.5:1.
- White on `#0066CC`: 5.4:1.
- Do **not** reintroduce solid `#28A745`/white or `#DC3545`/white at 14px.

---

## Non-goals

- Batch, History, About redesigns (Batch only adopts `BackLink`).
- A shared design-token refactor, new fonts, or a theme system.
- A quick opacity control on the stage (the settings drawer remains the one place).
- A shortcuts popover/command palette (tooltips + menu keep the existing coverage).
- Any change to classification, heatmap rendering, export encoding or history storage.
- Animating the viewer's layout height during dock/details changes.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| The reduced-transparency selector turns dark glass white | Dark materials are plain CSS classes with no `backdrop-blur-*` utility; the preference block handles them explicitly. Task 7 Step 7 verifies. |
| Full-bleed leaks to other routes | `FULL_BLEED_ROUTES` is an allow-list; the default branch is today's layout. Task 1 Step 3 checks `/` and `/batch`. |
| The dock's details collapse the viewer on short windows | `max-h-[min(38vh,320px)]` and internal scroll; Task 9's 800×600 row catches it. |
| Dark dock looks detached from the light toolbar | The dock is inside the dark stage with a bright top hairline and an upward shadow; the gauge marks the boundary. Review at 1920×1080. |
| Removing the header paragraph hides shortcut discovery | Shortcuts stay in tooltips, the menu, `aria-keyshortcuts`, and one `kbd` hint on Open. |
| `AnimatePresence` leaves a layout gap on exit | If it does, render the dock unconditionally and animate its contents; do not switch to `absolute`. |
