# NeuroScan — Desktop Menu Bar (Specification)

**Status:** Draft v2 — interview decisions (2026-09-25) plus the reversal recorded in §16
**Date:** 2026-09-25
**Short name:** desktop-menu-bar
**Requested by:** user — *"i want to create desktop menu bar, like file, edit, view, menu, help"*

> Note: the request listed `menu` between View and Help, which was confirmed as a placeholder. The agreed
> top-level menus are **File, Edit, View, Tools, Help**.
>
> **Superseded in revision 2 — read §16 first.** The menu is no longer an OS-native menu bar. Removing the OS
> titlebar and keeping a native Windows menu are mutually exclusive (tauri-apps/tauri#12074), and the titlebar
> removal came second, so the menus moved into the app's own title bar. **§16 supersedes §1's description of the
> native bar, and §7.1–§7.3 and §7.10.** The menu *contents* (§5), the id contract (§6), the accelerator decisions
> (§9) and the tests (§11) all still stand.

---

## 1. Executive Summary

NeuroScan currently ships a Tauri window with **no application menu at all**: `apps/desktop/src-tauri/src/main.rs`
is a four-line `tauri::Builder::default()` with no `.menu()` call, so the only navigation surfaces are the
in-page frosted-glass header and the card dashboard.

This work adds a **native OS menu bar** built in Rust with Tauri's `Menu` / `Submenu` / `CustomMenuItem` API and
attached to the app window via `Builder::menu()`. Menus are **Windows-first**, but the Rust is written
platform-agnostically using `CmdOrCtrl` accelerators so a future macOS build does not need a rewrite.

**Version decision (§13).** This targets Tauri **v1**, matching the repo's pinned `tauri = { version = "1.5" }`,
which `Cargo.lock` resolves to **1.8.3**. Migrating to v2 rewrites the config schema, introduces the capabilities
permission system and moves both `@tauri-apps/*` packages, so it does not belong inside a menu-bar task. The v2 menu
delta is recorded in §13.1 so the eventual port is mechanical.

Menu clicks are not handled in Rust for navigation. Rust emits a single namespaced event, the webview listens
through `@tauri-apps/api/event`, and a **shared action registry** resolves the id into a TanStack Router
`navigate({ to })` call — the same registry the existing `useKeyboardShortcuts` hook already uses, so the menu
and the keyboard can never disagree about where "History" goes.

The first pass is deliberately narrow: **navigation plus Quit**. Every other promised action from the UI docs
(Export CSV, real file dialogs, history search, clear history) appears in the menu structure but is shipped
**visibly disabled**, so the chrome is complete and the gaps are honest.

In a plain browser (`pnpm dev` at `localhost:5173`) the menu **does not exist** and nothing errors: the
subscription becomes a no-op and existing keyboard shortcuts remain the fallback.

---

## 2. Scope

### In scope
- Native menu attached to the main window: File, Edit, View, Tools, Help.
- Navigation actions for every screen: `/`, `/single`, `/batch`, `/history`, `/about`.
- Quit, with a confirmation prompt when a batch run is in progress (menu item **and** titlebar close button).
- `@tauri-apps/api` v1 dependency plus a small runtime-detection helper.
- Menu id ↔ route mapping in the shared registry, unit tested.
- Fixing `useKeyboardShortcuts` so the platform-primary modifier (Cmd on macOS, Ctrl elsewhere) is recognized.
- Documentation updates in `docs/ui/03-navigation-layout.md` and `docs/ui/06-interaction-patterns.md`.

### Out of scope (explicitly not in this pass)
- Export CSV / annotated export (`lib/screening/csv.ts`, `annotated-export.ts` exist and stay unwired to the menu).
- A real native file/folder picker for `Open Scan…`.
- History search, clear-history execution, preferences/settings surface.
- Dark mode, theme toggle, tray icon, global (OS-wide) shortcuts.
- An HTML/React menu bar mirror inside the webview. Menus are native only; the browser gets nothing.
- i18n / localized menu labels.
- macOS-specific application menu (About/Hide/Quit roles before File) and `Window` menu.

---

## 3. Interview Decision Log

Answers gathered through five rounds of `ask_user`. **[choice]** marks the user's selected option.

### 3.1 Round 1 — Architecture & scope

| # | Question | Decision |
|---|----------|----------|
| 1 | Where does the menu bar live? | **[choice] Native OS menu (Rust/Tauri).** A real menu attached to the window, not an HTML `role="menubar"` strip. Menu events are wired back to the React router. |
| 2 | Which five top-level menus? | **[choice] File, Edit, View, Tools, Help.** The requested "menu" entry was a placeholder and becomes **Tools**. |
| 3 | Behavior in a plain browser (`pnpm dev`)? | **[choice] Graceful no-op / hide.** No menu in the browser; existing keyboard shortcuts keep working as the fallback. |
| 4 | How much should the menu do in pass one? | **[choice] Navigation + Quit only.** Every menu maps to an existing route or to app exit. |

### 3.2 Round 2 — Menu contents

| # | Question | Decision |
|---|----------|----------|
| 5 | File items? | **[choice] New Screening (Ctrl+N) → /single, Open Scan… (Ctrl+O) → /single, separator, Exit (Ctrl+Q).** |
| 6 | Edit items, given the app has no editable text? | **[choice] Standard roles, most disabled.** Ship the conventional Edit menu so the app looks normal, with items greyed out. |
| 7 | View items? | **[choice] The four screens + Home**, i.e. Single Screening, Batch Processing, History, About & Help, separator, Dashboard. |
| 8 | Tools items, given navigation-only scope? | **[choice] Clear History… (Ctrl+Shift+C), disabled** until the History store is real. |
| 9 | Help items? | **[choice] About NeuroScan (F1) → /about, Documentation, Keyboard Shortcuts.** |

### 3.3 Round 3 — Technical mechanics

| # | Question | Decision |
|---|----------|----------|
| 10 | How does a menu click reach the React router? | **[choice] Rust emits an event; React listens via `@tauri-apps/api/event`.** Idiomatic Tauri v1, and the event channel is reusable for future app actions. |
| 11 | Platform priority? | **[choice] Windows first.** Cross-platform Rust, no macOS convention hand-tuning in this pass. |
| 12 | Does the menu reflect the current route? | **[choice] Static, always the same.** No per-route enabling or checkmarks. Greyed styling is reserved for genuinely unimplemented items. |
| 13 | Exit behavior? | **[choice] Confirm if a batch run is in progress**, otherwise exit silently. |
| 14 | Rust code organization? | **[choice] New `src-tauri/src/menu.rs` module** exposing the menu builder and the event handler; `main.rs` keeps only wiring. |

### 3.4 Round 4 — The corners

| # | Question | Decision |
|---|----------|----------|
| 15 | What does `Open Scan…` do while scope is navigation-only? | **[choice] Navigate to `/single`, no picker.** The label keeps its ellipsis but the first pass is a plain route change. |
| 16 | How does Rust learn a batch run is mid-flight? | **[choice] Rust tracks run progress itself** — a managed state flag in the Rust layer. |
| 17 | Help → Documentation / Keyboard Shortcuts behavior? | **[choice] Both open external URLs** in the default browser. |
| 18 | Accelerator modifier form? | **[choice] `CmdOrCtrl` in Rust and fix the web handler too** — standardize both layers on the platform-aware primary modifier. |
| 19 | Test coverage? | **[choice] TS unit tests for the menu-event mapping** — same style as the existing `navigation.test.ts`. |
| 20 | Update existing UI docs? | **[choice] Yes — note it in the navigation/layout and interaction docs**, so the layout diagram and shortcut tables stay truthful. |

### 3.5 Round 5 — Final details

| # | Question | Decision |
|---|----------|----------|
| 21 | What is the quit confirmation surface? | **[choice] Both — React modal primarily, native OS dialog as fallback** if the webview does not respond. |
| 22 | Is the titlebar X guarded too, or only File > Exit? | **[choice] Both Exit and the X**, via `WindowEvent::CloseRequested`. |
| 23 | Where do the Help URLs live? | **[choice] A constants file with placeholder values**, marked TODO for the real destinations. |
| 24 | Menu id naming convention? | **[choice] Namespaced with colons** — e.g. `menu:file:exit`, `menu:view:history`. |
| 25 | Menu and keyboard shortcuts share an action registry? | **[choice] One shared registry** in `src/lib/navigation.ts`, so the menu listener and `useKeyboardShortcuts` resolve through the same mapping. |

---

## 4. Verified Project Context

Facts confirmed by reading the repository at the time of writing. These are the constraints the design must fit.

| Fact | Evidence |
|------|----------|
| Tauri **v1**, not v2 — 1.5 pinned, **1.8.3 resolved** | `Cargo.toml` → `tauri = { version = "1.5", features = [] }`, `tauri-build = "1.5"`; `Cargo.lock` → `name = "tauri"`, `version = "1.8.3"` |
| The repo's own spec claims Tauri 2 | `docs/research/neuroscan-spec.md` → "Tauri 2 + Rust backend" — **the docs disagree with the code**; see §13 |
| No menu, no builder config | `apps/desktop/src-tauri/src/main.rs` — 4 lines, `tauri::Builder::default().run(...)` |
| No Tauri JS package installed | `apps/desktop/package.json` has no `@tauri-apps/api` |
| Window is declared in config, not code | `tauri.conf.json` → `tauri.windows[0]` (`title: "NeuroScan"`, 1200×800) |
| **No `allowlist` key in config** | `tauri.conf.json` has only `build`, `package`, `tauri.bundle/security/updater/windows` |
| App also runs as a plain browser app | `vite.config.ts` → `server.port: 5173`; root `package.json` → `dev: pnpm --filter @neuroscan/desktop dev` |
| Routes are file-based | `apps/desktop/src/routes/{index,single,batch,history,about}.tsx`, generated `routeTree.gen.ts` |
| A shortcut registry already exists | `apps/desktop/src/lib/navigation.ts` → `createAppShortcuts` (`ctrl+h`, `f1`), `createDashboardShortcuts` (`ctrl+n`, `ctrl+o`) |
| The shortcut hook is Ctrl-only | `apps/desktop/src/lib/hooks/use-keyboard-shortcuts.ts` — builds the combo from `e.ctrlKey` / `e.shiftKey` / `e.altKey`; `metaKey` is never read |
| Nav shortcuts are already mounted | `routes/__root.tsx` (app shortcuts) and `routes/index.tsx` (dashboard shortcuts) |
| The UI docs already promise these accelerators | `docs/ui/06-interaction-patterns.md` → Ctrl+O, Ctrl+N, Ctrl+H, Ctrl+E, Escape, Ctrl+Q, F1, Ctrl+F, Ctrl+Shift+C, Space |
| Screening currently runs in TypeScript | `apps/desktop/src/lib/hooks/use-batch-run.ts`, `apps/desktop/src/lib/screening/simulate.ts` |
| Rust integration is stubbed by design | Comments in `lib/screening/history-store.ts` and `lib/screening/classify-image.ts`: "Swapping in the Tauri call is the whole change" |
| App header is a frosted-glass strip with the product name only | `routes/__root.tsx` `<header role="banner">` |
| Design tokens in use | `#003366`, `#0066CC`, `#E6F0FF`, `#4B5563`, `#6B7280`; `max-w-container`; `rounded-2xl`; `shadow-card` |
| No dialog capability configured | `tauri.conf.json` has no `allowlist.dialog`; `Cargo.toml` features list is empty |

---

## 5. Menu Structure Specification

### 5.1 Notation

- **Accelerator** is written in Tauri's `CmdOrCtrl` form. On Windows it renders as `Ctrl`; the OS shows it right-aligned in the menu.
- **Enabled** = `true` unless marked *(disabled)*.
- **Action** is either a route from `AppRoute` (`/`, `/single`, `/batch`, `/history`, `/about`) or a named command handled in Rust.
- `—` (a dash between items) is a `MenuItem::Separator`.

### 5.2 File

| Label | Id | Accelerator | Action |
|-------|----|-------------|--------|
| New Screening | `menu:file:new-screening` | `CmdOrCtrl+N` | navigate `/single` |
| Open Scan… | `menu:file:open-scan` | `CmdOrCtrl+O` | navigate `/single` |
| — | — | — | separator |
| Exit | `menu:file:exit` | `CmdOrCtrl+Q` | `quit-requested` flow (see §8) |

`Open Scan…` and `New Screening` both land on `/single`, matching `createDashboardShortcuts`, which already maps
both `ctrl+n` and `ctrl+o` to that route. No picker is opened in this pass.

### 5.3 Edit

The app has no editable text surface, so these are **presentational conventions**, not working commands. Every item
ships **disabled**.

| Label | Id | Accelerator | Enabled |
|-------|----|-------------|---------|
| Undo | `menu:edit:undo` | *(none)* | ✗ |
| Redo | `menu:edit:redo` | *(none)* | ✗ |
| — | — | — | separator |
| Cut | `menu:edit:cut` | *(none)* | ✗ |
| Copy | `menu:edit:copy` | *(none)* | ✗ |
| Paste | `menu:edit:paste` | *(none)* | ✗ |
| Select All | `menu:edit:select-all` | *(none)* | ✗ |

**Rule — a disabled item never advertises an accelerator.** A greyed item cannot run, so a key printed beside it is
a promise the app does not keep; worse, an accelerator bound to a menu item can consume the keystroke instead of
letting it reach the webview. Two consequences:

- Edit's conventional `CmdOrCtrl+Z/X/C/V/A` are **deliberately withheld** while every Edit item is disabled.
  `Ctrl+A` in particular is already promised as "select all scans" on the Batch screen
  (`docs/ui/06-interaction-patterns.md`), so binding it to a dead menu item would break a documented shortcut.
- Those accelerators return on the same commit that makes these items real (a text or annotation surface), and this
  table plus §9 must be updated then.

> **Implementation note.** Prefer explicit `CustomMenuItem`s marked disabled over Tauri v1's `MenuItem` native
> roles for these. The v1 guide states the platform-specific native items are *"currently not implemented on
> Windows"*, so relying on them risks items that look enabled but do nothing, or that vanish. See §14 Risk 2.

### 5.4 View

| Label | Id | Accelerator | Action |
|-------|----|-------------|--------|
| Single Screening | `menu:view:single` | `CmdOrCtrl+1` | navigate `/single` |
| Batch Processing | `menu:view:batch` | `CmdOrCtrl+2` | navigate `/batch` |
| History | `menu:view:history` | `CmdOrCtrl+H` | navigate `/history` |
| About & Help | `menu:view:about` | *(none)* | navigate `/about` |
| — | — | — | separator |
| Dashboard | `menu:view:dashboard` | *(none)* | navigate `/` |

**Settled — `F1` belongs to Help > About NeuroScan.** `F1 → /about` already ships in `createAppShortcuts`, so the
accelerator sits on the Help item and `menu:view:about` goes unaccelerated: **one key, one menu item.** `/about` is
still reachable from both menus; only one of them advertises a key.

**Settled — History keeps `CmdOrCtrl+H`** instead of joining a numbered run. It already ships and is published in the
UI docs, and renumbering a working shortcut to win a tidier sequence trades away user muscle memory for cosmetics.

**Rejected — `CmdOrCtrl+0` for Dashboard.** On Windows the app renders in WebView2, where the zoom-reset accelerator
is enabled by default, so `Ctrl+0` would fight the webview's own zoom handling. The header wordmark already leads
home; Dashboard ships unaccelerated rather than shipping a key that may silently zoom the UI.

### 5.5 Tools

| Label | Id | Accelerator | Enabled |
|-------|----|-------------|---------|
| Clear History… | `menu:tools:clear-history` | *(none)* | ✗ *(disabled)* |

The UI docs publish `Ctrl+Shift+C` for clear-history, but the item is not wired yet, so by the disabled-item rule it
advertises no key. `Ctrl+Shift+C` is restored on the same commit that enables the item — when
`lib/screening/history-store.ts` has a real backing store and a confirmation step — and the docs table carries a
footnote until then.

### 5.6 Help

| Label | Id | Accelerator | Action |
|-------|----|-------------|--------|
| About NeuroScan | `menu:help:about` | `F1` | navigate `/about` |
| Documentation | `menu:help:documentation` | — | open external URL |
| Keyboard Shortcuts | `menu:help:shortcuts` | — | open external URL |
| — | — | — | separator |
| *(nothing further in this pass)* | | | |

**Settled — Keyboard Shortcuts ships unaccelerated.** `F1` is spent on About; `Ctrl+K` is owned by the
address-bar/command-palette convention; and `Ctrl+/` needs punctuation support in Tauri v1's accelerator parser,
which is unverified. Since this item launches an external page rather than doing work in the app, it does not earn
one of the few safe keys. `CmdOrCtrl+/` is the first candidate if a key is wanted later — verify the parser accepts
it before adding it to both the builder and the registry.

The `/about` route is still a "Coming soon" stub (`routes/about.tsx`). The menu item navigates there anyway; filling
in that screen is a separate task.

---

## 6. Data Contracts

These three strings are the entire Rust ↔ TypeScript contract. They must not drift.

### 6.1 Event name

```
menu://action
```

### 6.2 Event payload

```ts
interface MenuActionPayload {
  /** The `menu:` id from §5, verbatim. */
  id: MenuItemId;
}
```

A payload object rather than a bare string, so future fields (e.g. `origin`, `route`, `query`) can be added without
a breaking change.

### 6.3 Menu item ids

Namespaced with colons, `menu:<menu>:<item>`:

```ts
export type MenuItemId =
  | "menu:file:new-screening"
  | "menu:file:open-scan"
  | "menu:file:exit"
  | "menu:edit:undo"
  | "menu:edit:redo"
  | "menu:edit:cut"
  | "menu:edit:copy"
  | "menu:edit:paste"
  | "menu:edit:select-all"
  | "menu:view:single"
  | "menu:view:batch"
  | "menu:view:history"
  | "menu:view:about"
  | "menu:view:dashboard"
  | "menu:tools:clear-history"
  | "menu:help:about"
  | "menu:help:documentation"
  | "menu:help:shortcuts";
```

Secondary event for the quit handshake:

```
menu://quit-requested   // Rust → webview: a guarded quit is waiting on a decision
```

Rust-side commands invoked by the webview: `confirm_quit`, `cancel_quit`, `set_batch_running`.

---

## 7. Technical Design

### 7.1 Rust — `src-tauri/src/menu.rs` (new)

```rust
use tauri::{CustomMenuItem, Menu, Submenu};

/// Ids mirror §6.3 exactly. Keeping them as consts means a typo is a compile error
/// on the Rust side, and the TS union is validated by the unit tests.
pub const FILE_NEW_SCREENING: &str = "menu:file:new-screening";
pub const FILE_OPEN_SCAN: &str = "menu:file:open-scan";
pub const FILE_EXIT: &str = "menu:file:exit";
// ...one const per §6.3 id...

/// Builds the application menu bar: File, Edit, View, Tools, Help.
pub fn build_menu() -> Menu {
    let file = Submenu::new(
        "File",
        Menu::new()
            .add_item(CustomMenuItem::new(FILE_NEW_SCREENING, "New Screening")
                .accelerator("CmdOrCtrl+N"))
            .add_item(CustomMenuItem::new(FILE_OPEN_SCAN, "Open Scan…")
                .accelerator("CmdOrCtrl+O"))
            .add_native_item(tauri::MenuItem::Separator)
            .add_item(CustomMenuItem::new(FILE_EXIT, "Exit")
                .accelerator("CmdOrCtrl+Q")),
    );
    // Edit: every item .disabled() — see §5.3
    // View: four screens + separator + Dashboard
    // Tools: Clear History… .disabled()
    // Help: About, Documentation, Keyboard Shortcuts
    Menu::new().add_submenu(file)/* ... */ 
}
```

Notes:
- Labels use a real ellipsis character (`…`) as in `Open Scan…` / `Clear History…`, matching the spec text.
- Disabled items are built with `CustomMenuItem::new(id, label).disabled()`.
- `CmdOrCtrl` is used everywhere so a macOS build gets `⌘` without a code change.

### 7.2 Rust — `main.rs` wiring

```rust
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod menu;

use tauri::{Manager, WindowEvent};

fn main() {
    tauri::Builder::default()
        .menu(menu::build_menu())
        .manage(menu::BatchRunState::default())
        .invoke_handler(tauri::generate_handler![
            menu::set_batch_running,
            menu::confirm_quit,
            menu::cancel_quit,
        ])
        .on_menu_event(menu::handle_menu_event)
        .on_window_event(menu::handle_window_event)   // guards the titlebar X
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 7.3 Rust — event handler

```rust
pub fn handle_menu_event(event: tauri::WindowMenuEvent) {
    let id = event.menu_item_id();

    // Quit is the only id handled in Rust. Everything else is forwarded verbatim.
    if id == FILE_EXIT {
        return request_quit(&event.window());
    }

    let _ = event.window().emit_all("menu://action", MenuAction { id });
}
```

Navigation ids are **never interpreted in Rust** — the router owns routing. This keeps `menu.rs` free of app
knowledge and means adding a View item touches only the registry and the builder.

### 7.4 Rust — batch-run state

```rust
#[derive(Default)]
pub struct BatchRunState(Mutex<bool>);   // true while a screening run is mid-flight
```

The user chose "Rust tracks run progress itself". Today, however, the batch run lives entirely in TypeScript
(`lib/hooks/use-batch-run.ts` driving `lib/screening/simulate.ts`), so Rust cannot observe it unaided. Until the
screening loop moves into Rust, the frontend keeps the flag truthful:

```ts
// in use-batch-run.ts — start/finish edges only, never per-progress-tick
await invoke("set_batch_running", { running: true });
// ...on settle...
await invoke("set_batch_running", { running: false });
```

This is the one place the "navigation + Quit only" scope grows slightly. The alternative — Rust owning the flag with
no producer — cannot work, because nothing in the process would ever set it. See §14 Risk 4.

### 7.5 Rust — quit request flow

```rust
pub fn request_quit(window: &tauri::Window) {
    if !window.state::<BatchRunState>().is_running() {
        window.app_handle().exit(0);          // silent
        return;
    }
    // Guarded: ask the webview first, keep a native dialog as the fallback.
    let _ = window.emit("menu://quit-requested", ());
    spawn_fallback_timer(window.clone());     // native ask() after ~1500ms
}

pub fn handle_window_event(event: &WindowEvent) {
    if let WindowEvent::CloseRequested { api, .. } = event {
        // route the X through the same guard
    }
}
```

### 7.6 Frontend — runtime detection (`src/lib/tauri.ts`, new)

Tauri v1 injects its IPC bridge into the webview unconditionally (independent of `withGlobalTauri`), so presence is
detected without adding config:

```ts
/** True inside the Tauri webview, false in a plain browser (`pnpm dev`). */
export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_IPC__" in window;
}
```

Every desktop-only entry point is gated on this. In the browser, `subscribeToMenuActions()` returns a no-op
unsubscribe and the app behaves exactly as it does today. *(Flagged for verification in §14 Risk 3 — confirm the
injected global's name against the pinned `@tauri-apps/api` v1 line.)*

### 7.7 Frontend — shared action registry (`src/lib/navigation.ts`, modified)

`navigation.ts` becomes the single source of truth for "what does this action do", consumed by both the keyboard hook
and the menu listener:

```ts
export type AppRoute = "/" | "/single" | "/batch" | "/history" | "/about";

/** Route targets keyed by menu id (§6.3). Only navigation ids appear here. */
export const MENU_ROUTES: Partial<Record<MenuItemId, AppRoute>> = {
  "menu:file:new-screening": "/single",
  "menu:file:open-scan": "/single",
  "menu:view:single": "/single",
  "menu:view:batch": "/batch",
  "menu:view:history": "/history",
  "menu:view:about": "/about",
  "menu:view:dashboard": "/",
  "menu:help:about": "/about",
};
```

Non-navigating ids (`menu:file:exit`, all Edit items, `menu:tools:clear-history`, the two Help URL items) are absent
from `MENU_ROUTES` and resolved by dedicated handlers in the listener. This preserves the existing
`createAppShortcuts` / `createDashboardShortcuts` signatures so `__root.tsx` and `index.tsx` need no changes.

### 7.8 Frontend — menu subscription (`src/lib/menu-events.ts`, new)

```ts
import { listen } from "@tauri-apps/api/event";
import { isTauriRuntime } from "./tauri";
import { MENU_ROUTES, type AppRoute } from "./navigation";
import type { MenuItemId } from "./menu-ids";

export interface MenuActionHandlers {
  navigate: (to: AppRoute) => void;
  openExternal: (url: string) => void;
}

/** Pure id → action resolution. Split out so it can be unit tested without Tauri. */
export function dispatchMenuAction(id: string, handlers: MenuActionHandlers): void {
  if (id === MENU_IDS.helpDocumentation) return handlers.openExternal(MENU_LINKS.documentation);
  if (id === MENU_IDS.helpShortcuts) return handlers.openExternal(MENU_LINKS.shortcuts);

  const route = MENU_ROUTES[id as MenuItemId];
  if (route) handlers.navigate(route);
  // Disabled ids, `menu:file:exit` and unknown ids fall through silently.
}

/** Subscribes to native menu clicks. No-op in the browser. */
export async function subscribeToMenuActions(handlers: MenuActionHandlers): Promise<() => void> {
  if (!isTauriRuntime()) return () => {};
  return listen<MenuActionPayload>(MENU_ACTION_EVENT, (event) =>
    dispatchMenuAction(event.payload.id, handlers),
  );
}
```

**`menu:file:exit` never reaches the webview.** Rust intercepts it in `handle_menu_event` (§7.3) and starts the quit
flow itself, so the frontend does not carry a quit case at all. `dispatchMenuAction` ignores it defensively — a
stray Exit event must never turn into a navigation — and §11.1 asserts that.

Called once from `routes/__root.tsx` via a small hook (e.g. `useMenuBar(handlers)`), in the same place and style as
the existing `useKeyboardShortcuts` call.

### 7.9 Frontend — accelerator fix (`src/lib/hooks/use-keyboard-shortcuts.ts`, modified)

Today the combo string is built from `e.ctrlKey` only, so `Cmd+H` never fires on macOS. Per decision 18, both layers
standardize on the platform-primary modifier:

```ts
const primary = e.metaKey || e.ctrlKey;   // ⌘ on macOS, Ctrl elsewhere
const combo = [primary && "ctrl", e.shiftKey && "shift", e.altKey && "alt", key]
  .filter(Boolean).join("+");
```

Registry keys keep their existing `ctrl+` spelling, so `createAppShortcuts` and `createDashboardShortcuts` are
unchanged. On macOS, `Cmd+H` is the OS "Hide" shortcut; since this pass is Windows-first that collision is
acceptable and noted for the future macOS pass.

### 7.10 Configuration changes

`apps/desktop/src-tauri/Cargo.toml`:

```toml
[dependencies]
tauri = { version = "1.5", features = ["dialog"] }   # `dialog` feature required for api::dialog
```

The `dialog` feature is **required**: `tauri::api::dialog` is documented as *"Available on desktop and crate feature
`dialog` only"*, and it is what powers the native fallback prompt in §8.

`apps/desktop/package.json`:

```json
"dependencies": {
  "@tauri-apps/api": "^1.5.0"
}
```

**Version line matters:** `^1.5.0` matches the pinned Tauri 1.5 backend. `@tauri-apps/api` v2 uses a different
module layout (`@tauri-apps/api/core`, plugin packages) and will fail against a v1 backend.

`apps/desktop/src-tauri/tauri.conf.json`: **superseded by §16.3.** The config now carries `decorations: false` and an
`allowlist.window` block, because the chrome is the app's own. The rest of this subsection still holds: no new
window, and no `withGlobalTauri`.

**One exception — the two Help links.** Handing a URL to the system browser needs `allowlist.shell.open` (or the
shell plugin). Until that entry exists, `openExternalUrl` (`src/lib/tauri.ts`) works in the browser and silently
does nothing inside the packaged app. See §14 Risk 9.

---

## 8. Quit Confirmation Flow

```
User picks File > Exit        User clicks the titlebar X
        │                              │
        └──────────┬───────────────────┘
                   ▼
      Rust: BatchRunState running?
             │            │
            no           yes
             │            │
             ▼            ▼
    app.exit(0)     emit "menu://quit-requested"  +  start ~1500ms fallback timer
    (silent)                  │
                   ┌──────────┴──────────┐
                   ▼                     ▼
        React shows styled modal    no ack within window
                   │                     │
         ┌─────────┴─────────┐           ▼
         ▼                   ▼    native dialog::ask()
   Confirm → invoke          Cancel → invoke      │
   "confirm_quit"            "cancel_quit"        ▼
         │                        │        Yes → exit / No → clear flag + reset timer
         ▼                        ▼
   app.exit(0)          clear pending flag, stop timer
```

Requirements:
- The React modal uses the project's existing dialog/motion patterns and design tokens (`#003366`, `rounded-2xl`,
  reduced-motion support). It is a destructive-intent confirmation, so it must be dismissible by `Escape` and must
  move focus to the safer action by default.
- The modal names the in-progress work (e.g. how many scans remain) so the user knows what is at risk.
- The fallback timer exists only so a wedged webview cannot make the app unquittable.
- `cancel_quit` must clear both the pending flag and the fallback timer; otherwise a delayed native dialog appears
  after the user already chose Cancel.
- The titlebar X and File > Exit must be **indistinguishable** in behavior — same prompt, same wording, same result.

---

## 9. Accelerator Reference

Every accelerator advertised in the menu, cross-checked against the table the UI docs already publish.

**Rule.** An accelerator appears on exactly **one** menu item and only on an item that can actually run. That yields
seven live accelerators for the whole menu bar — six keys plus `F1`.

| Accelerator | Menu location | Source | Notes |
|-------------|---------------|--------|-------|
| `CmdOrCtrl+N` | File > New Screening | existing (`createDashboardShortcuts`) | → `/single` |
| `CmdOrCtrl+O` | File > Open Scan… | existing (`createDashboardShortcuts`) | → `/single`; no picker yet |
| `CmdOrCtrl+Q` | File > Exit | new | Guarded quit (§8) |
| `CmdOrCtrl+1` | View > Single Screening | **new — decided** | → `/single` |
| `CmdOrCtrl+2` | View > Batch Processing | **new — decided** | → `/batch` |
| `CmdOrCtrl+H` | View > History | existing (`createAppShortcuts`) | Kept, not renumbered |
| `F1` | Help > About NeuroScan | existing (`createAppShortcuts`) | Owns `F1`; View > About & Help is unaccelerated |
| *(none)* | Edit > every item | — | Disabled items never advertise a key |
| *(none)* | Tools > Clear History… | — | Disabled; `Ctrl+Shift+C` returns when it is wired |
| *(none)* | View > Dashboard | — | `Ctrl+0` rejected — WebView2 zoom-reset |
| *(none)* | View > About & Help | — | Duplicate destination; one key per destination |
| *(none)* | Help > Documentation | — | Opens an external URL |
| *(none)* | Help > Keyboard Shortcuts | — | See §5.6; `Ctrl+/` is the candidate if wanted later |

**Keys considered and rejected**

| Key | Would have been | Why not |
|-----|-----------------|---------|
| `CmdOrCtrl+0` | View > Dashboard | WebView2's zoom-reset on Windows — would fight the webview |
| `CmdOrCtrl+3` | View > History | Redundant with the shipped, documented `Ctrl+H` |
| `CmdOrCtrl+K` | Help > Keyboard Shortcuts | Owned by the address-bar / command-palette convention |
| `CmdOrCtrl+/` | Help > Keyboard Shortcuts | Tauri v1 accelerator parsing for punctuation is unverified |
| `CmdOrCtrl+D` | View > Dashboard | Not verified against WebView2's accelerator keys; revisit if Dashboard needs a key |
| `CmdOrCtrl+Z/X/C/V/A` | Edit items | Would bind live keys to disabled items and steal them from the webview |

**Registry alignment.** Because the menu and the keyboard share one registry (§7.7), `Ctrl+1` and `Ctrl+2` must be
added to `createAppShortcuts` beside the existing `ctrl+h` and `f1`, so the browser fallback and the native menu
advertise identical keys.

Deliberately **not** in the menu, though the docs list them: `Ctrl+E` (Export), `Ctrl+F` (History search),
`Escape` (back), `Space` (heatmap toggle). The first two belong to future app actions, and the last two are
screen-local rather than menu-worthy.

---

## 10. Files Touched

| Path | Change |
|------|--------|
| `apps/desktop/src-tauri/src/menu.rs` | **New.** Menu builder, id consts, event handler, window-close guard, `BatchRunState`, `confirm_quit` / `cancel_quit` / `set_batch_running`. |
| `apps/desktop/src-tauri/src/main.rs` | **Modified.** `.menu()`, `.manage()`, `.invoke_handler()`, `.on_menu_event()`, `.on_window_event()`. |
| `apps/desktop/src-tauri/Cargo.toml` | **Modified.** Add `"dialog"` to the `tauri` feature list. |
| `apps/desktop/package.json` | **Modified.** Add `@tauri-apps/api@^1.5.0`. |
| `apps/desktop/src/lib/menu-ids.ts` | **New.** The `MenuItemId` union (§6.3), shared by the listener and its tests. |
| `apps/desktop/src/lib/tauri.ts` | **New.** `isTauriRuntime()`. |
| `apps/desktop/src/lib/menu-events.ts` | **New.** `subscribeToMenuActions()` and the id → action dispatch. |
| `apps/desktop/src/lib/navigation.ts` | **Modified.** Add `MENU_ROUTES`; keep existing factory signatures intact. |
| `apps/desktop/src/lib/hooks/use-keyboard-shortcuts.ts` | **Modified.** Recognize `metaKey` as the primary modifier. |
| `apps/desktop/src/lib/hooks/use-menu-bar.ts` | **New.** Thin hook wrapping the subscription with the router's `navigate`. |
| `apps/desktop/src/routes/__root.tsx` | **Modified.** Mount the menu subscription beside `useKeyboardShortcuts`; mount the quit-confirmation modal. |
| `apps/desktop/src/lib/hooks/use-batch-run.ts` | **Modified.** Notify Rust on run start/finish via `invoke("set_batch_running")`. |
| `apps/desktop/src/lib/menu-links.ts` | **New.** Help URL constants with TODO placeholders (§10.1). |
| `apps/desktop/src/components/menu/QuitConfirmDialog.tsx` | **New.** The React confirmation surface. |
| `apps/desktop/src/lib/menu-events.test.ts` | **New.** Mapping tests (§11). |
| `docs/ui/03-navigation-layout.md` | **Modified.** Menu bar added to the layout diagram and app-chrome description. |
| `docs/ui/06-interaction-patterns.md` | **Modified.** Menu path added beside each accelerator in the shortcut table. |

`tauri.conf.json` is intentionally **not** in this list.

### 10.1 Help link constants

```ts
// src/lib/menu-links.ts
/** TODO: replace placeholders before release. */
export const MENU_LINKS = {
  documentation: "https://example.com/neuroscan/docs",   // TODO
  shortcuts: "https://example.com/neuroscan/shortcuts",   // TODO
} as const;
```

Both Help items are wired and clickable with these placeholders. If the team prefers, they can be built
`.disabled()` until real URLs exist — an open decision in §12.

---

## 11. Testing

### 11.1 Automated — `src/lib/menu-events.test.ts`

Follows the style of the existing `apps/desktop/src/lib/navigation.test.ts`, with `motion`/Tauri mocked as needed.

| Case | Expectation |
|------|-------------|
| Each navigation id in `MENU_ROUTES` | dispatches `navigate()` with the mapped `AppRoute` |
| `MENU_ROUTES` keys are all valid `MenuItemId`s | no typos between union and registry |
| `menu:file:exit` | never calls `navigate` — Rust intercepts Exit before emitting, and the listener ignores it defensively |
| Every disabled id (`menu:edit:*`, `menu:tools:clear-history`) | resolves to no action and never throws |
| `menu:help:documentation` / `menu:help:shortcuts` | calls `openExternal` with the constant URL, not a route |
| Unknown / future id | silently ignored — forward compatibility, no throw |
| `subscribeToMenuActions` outside Tauri | returns a no-op unsubscribe and registers no listener |

### 11.2 Manual — native layer checklist

Native menus cannot be asserted in jsdom, so this checklist is part of the deliverable:

1. `pnpm run tauri:dev` — File/Edit/View/Tools/Help all render with the correct labels and separators.
2. Accelerators appear right-aligned and match §9.
3. File > New Screening and Open Scan… navigate to `/single`; View items navigate to their routes.
4. Every Edit item and Tools > Clear History… is visibly greyed and unclickable.
5. Help > About NeuroScan, Documentation, Keyboard Shortcuts all fire; the two URLs open in the default browser.
6. Idle: File > Exit quits with no prompt. Titlebar X likewise.
7. Mid-batch: File > Exit shows the React modal; Confirm quits, Cancel returns to the app.
8. Mid-batch: titlebar X shows the *same* modal with the *same* wording.
9. Kill the webview responsiveness (devtools pause) mid-batch, then File > Exit — the native fallback dialog appears
   instead of a hang.
10. Navigate three levels deep, then use every menu item — no stale route state, no console errors.
11. `pnpm dev` in a plain browser — clicking nothing breaks; all existing keyboard shortcuts still work.
12. `Cmd/Ctrl+H`, `Ctrl+N`, `Ctrl+O`, `F1` still behave exactly as before the change.

### 11.3 Commands

```bash
pnpm --filter @neuroscan/desktop test        # vitest run — mapping tests
pnpm --filter @neuroscan/desktop build       # tsc + vite build — typecheck
cd apps/desktop/src-tauri && cargo check     # verify the Rust menu module compiles
```

---

## 12. Open Decisions

Accelerators are **settled** — see §5.3–§5.6 and §9 for the decisions and the rejected keys. The remaining open
items, each with a recommended default:

1. **Help URL placeholders.** Ship clickable with `example.com` placeholders, or `.disabled()` them until real URLs
   exist? *Default: clickable, with the TODO marked in `menu-links.ts`.*
2. **Visual stacking.** On Windows the native menu bar renders inside the window frame, directly above the existing
   frosted-glass `<header>` that already shows "NeuroScan". The two will sit adjacent. *Default: accept it — no
   header change in this pass — but consider whether the header's product name becomes redundant once a menu bar
   exists.*
3. **`Cancel` semantics for a running batch.** Does cancelling the quit leave the run untouched (recommended), or
   also offer "stop the run and quit"? *Default: leave the run untouched.*
4. **Should the Edit menu even exist** given it is 100% disabled? It was the user's choice, and it keeps the app
   looking conventional. *Default: keep it, disabled.*
5. **Where the spec file lives.** Currently `docs/spec/desktop-menu-bar-spec.md` (moved there from `docs/research/`);
   keep it wherever the team indexes specs.

---

## 13. Tauri v1 vs v2 — Decision

**Verdict: implement this menu against Tauri v1; open a separate ticket for the v2 migration.**

| Evidence | Finding |
|----------|---------|
| `apps/desktop/src-tauri/Cargo.toml` | `tauri = { version = "1.5", features = [] }`, `tauri-build = "1.5"` |
| `apps/desktop/src-tauri/Cargo.lock` | resolves to **tauri 1.8.3** |
| `apps/desktop/package.json` | `@tauri-apps/cli` `^1.5.0`; no `@tauri-apps/api` at all |
| `apps/desktop/src-tauri/tauri.conf.json` | v1 schema throughout (`build.devPath`, `build.distDir`, `tauri.*`, `package.*`) |
| `apps/desktop/src-tauri/src/` | `main.rs` only — no `lib.rs`, no `capabilities/` directory |
| Tauri v2 status | Stable since late 2024 and now at 2.x (2.9.6 shipped 2025-12-09); **v1 is the legacy line** |
| `docs/research/neuroscan-spec.md` | claims "Tauri 2 + Rust backend" — written aspirationally, before the scaffold existed |

**Why not migrate first.** The bump is a repo-wide change that touches far more than the menu: `tauri.conf.json`'s
schema is rewritten (`package.*` → top level, `tauri` → `app`, `tauri.bundle` → `bundle`, `build.distDir` →
`frontendDist`, `build.devPath` → `devUrl`, `tauri.windows` → `app.windows`), a `src-tauri/capabilities/` permission
system appears from nothing, `tauri-build` and both `@tauri-apps/*` packages move to v2, and the `custom-protocol`
feature is dropped. Putting that refactor between the request and the deliverable would risk breaking a working
scaffold for reasons unrelated to menus.

**Why it should still happen eventually.** v1 is legacy; v2 is where the plugin ecosystem, security fixes and
platform support live. Nothing here blocks it — the app is four screens, one window and one future Rust command — so
it is a small migration that only grows with time.

**Resolution:** ship the menu on 1.8.3, then migrate on its own ticket. Either way, the disagreement between
`neuroscan-spec.md` and `Cargo.toml` must be settled, because one of those two files is wrong today.

### 13.1 The v2 menu delta (for the migration ticket)

Tauri v2 is a hard break for menus: `Menu`, `MenuEvent`, `CustomMenuItem`, `Submenu`, `WindowMenuEvent`, `MenuItem`
and `Builder::on_menu_event` were **all removed**, replaced by builder types under `tauri::menu`.

| Concern | v1 (this spec) | v2 |
|---------|----------------|----|
| Menu types | `tauri::{Menu, Submenu, MenuItem, CustomMenuItem}` | `tauri::menu::{MenuBuilder, SubmenuBuilder, MenuItem, PredefinedMenuItem}` |
| Build a submenu | `Submenu::new("File", Menu::new().add_item(...))` | `SubmenuBuilder::new(app, "File").text(id, label).build()?` |
| Attach to the app | `Builder::menu(build_menu())` or `window.menu(menu)` | `app.set_menu(menu)?` inside `.setup()` |
| Click handler | `Builder::on_menu_event(handler)`, `WindowMenuEvent` | `app.on_menu_event(\|app, event\| ...)`, `event.id().0.as_str()` |
| Disable an item | `CustomMenuItem::new(id, label).disabled()` | `.enabled(false)` on the item builder |
| Accelerators | `CustomMenuItem::accelerator("CmdOrCtrl+N")` | item-builder `accelerator(...)` — same `CmdOrCtrl` grammar |
| Emit to the webview | `window.emit_all(name, payload)` (`Manager`) | `app.emit(name, payload)` (`Emitter`) |
| Quit dialog | `tauri::api::dialog` + the `"dialog"` Cargo feature | `tauri-plugin-dialog` + a capability entry |
| Window-close guard | `WindowEvent::CloseRequested { api, .. }` | unchanged |
| JS listener | `import { listen } from "@tauri-apps/api/event"` | **unchanged** |
| JS invoke | `@tauri-apps/api/tauri` | `@tauri-apps/api/core` |
| Update a menu item | `menu_handle().get_item(id).set_enabled(false)` | `menu.get(id).unwrap().as_menuitem_unchecked().set_enabled(false)` |
| Enable JS event listen | not needed | a capability containing `core:event:default` |

Everything else this spec defines — the id contract (§6), the shared route registry (§7.7), the event name, the
accelerator table (§9), the quit flow (§8) and every test — **carries over unchanged**. The port is confined to
`menu.rs`, `main.rs`, `Cargo.toml`, `tauri.conf.json` and one import in the frontend.

---

## 14. Risks & Flags

1. **The repo's docs and code disagree about the Tauri version** (§13). `neuroscan-spec.md` says Tauri 2;
   `Cargo.toml` says 1.5 (1.8.3 resolved). This spec follows the code. One of those two files is wrong today.
2. **Predefined menu roles are macOS-oriented in v1.** The v1 guide notes the native `MenuItem` variants are
   "currently not implemented on Windows". §5.3 therefore uses explicitly disabled `CustomMenuItem`s for Edit.
   Verify by building on Windows that nothing renders enabled-but-dead.
3. **Absent `allowlist` in `tauri.conf.json`.** The config has no `allowlist` block at all. The `event` API is part of
   Tauri's core surface rather than an allowlist entry, so `listen()` should work unchanged — but this must be
   confirmed with one menu click in a `tauri:dev` build before the rest of the work is built on it. Also confirm the
   injected IPC global name used by `isTauriRuntime()` against the pinned `@tauri-apps/api` v1 line.
4. **"Rust tracks run progress itself" is aspirational today.** Screening runs in TypeScript
   (`use-batch-run.ts` → `simulate.ts`). A Rust-owned flag with no producer would always read `false` and the quit
   guard would never fire. §7.4 bridges this with `set_batch_running` until the screening loop moves into Rust.
   Implementing the flag without the bridge silently breaks requirement §11.2 case 7.
5. **`CmdOrCtrl+Q` on macOS** is a reserved system-ish accelerator and the app menu conventions differ there. Fine
   for the Windows-first pass; revisit with the macOS work.
6. **Two navigation entries for `/about`** (View and Help). Intentional, but it means the About destination is
   reachable from two menus — worth confirming it reads as helpful rather than redundant.
7. **History and About are stubs.** `routes/history.tsx` and `routes/about.tsx` both render "Coming soon", so the
   menu will deliver users to empty screens. This is a content gap, not a menu defect, but it affects the perceived
   quality of the feature.
8. **`@tauri-apps/api` version drift.** Using `^1.5.0` is required; `pnpm install` must not resolve a v2 range.
9. **The Help links cannot reach a browser yet.** `openExternalUrl` uses `window.open`, which works outside Tauri.
   Opening an external URL from the packaged app needs `allowlist.shell.open` in `tauri.conf.json`, so without that
   entry Help > Documentation and Help > Keyboard Shortcuts will look broken. This is the sole exception to the
   "no config change" plan in §7.10.

---

## 15. Definition of Done

- [ ] The Tauri version decision (§13) is confirmed, or the migration ticket is opened.
- [ ] `cargo check` passes with `menu.rs` present and the `dialog` feature enabled.
- [ ] `pnpm --filter @neuroscan/desktop build` passes with the new TS modules.
- [ ] `menu-events.test.ts` passes, covering every case in §11.1.
- [ ] All twelve manual checklist items in §11.2 verified in a `tauri:dev` Windows build.
- [ ] In a plain browser, the app is byte-for-byte unchanged in behavior and the console is clean.
- [ ] `docs/ui/03-navigation-layout.md` and `docs/ui/06-interaction-patterns.md` reflect the menu bar.
- [ ] Both Help links open in the default browser inside a packaged build (requires `allowlist.shell.open` — §14
      Risk 9).
- [ ] Every §12 open decision is either confirmed or explicitly deferred in writing.
- [ ] Minimize, maximize/restore and close all work in a `tauri:dev` build — this depends on the `allowlist.window`
      block in §16.3, and on nothing else.
- [ ] The borderless window can still be moved by its drag region and resized by its edges (§16.6 risk 1).
- [ ] No duplicate app name is visible: the OS titlebar is gone and the old frosted header is deleted.

---

## 16. Revision 2 — Custom title bar and in-app menu bar

**Decision (2026-09-25):** the application menu is rendered **in the app's own title bar**, not by the operating
system. The native menu bar described in revision 1 was removed.

### 16.1 Why the reversal

The OS titlebar and a native Windows menu cannot coexist in this app:

| Evidence | What it means |
|----------|---------------|
| [tauri-apps/tauri#12074](https://github.com/tauri-apps/tauri/issues/12074) — *"Add a menu and a custom titlebar. See the chaos."* | With `decorations: false` on Windows the native menu renders **behind the webview and is unclickable until Alt is pressed**. It also misrenders while resizing and while the window is unfocused. |
| The reporter's own workaround | *"Simply disable the menu if Decorations is set to false specifically for Windows... or create a custom HTML menu just for Windows."* |
| Reported against Tauri 2.1.1 | Tauri v1 uses the same muda-based Windows menu implementation, so the constraint carries over to `tauri 1.8.3`. |

Revisions 1 and 2 pulled in opposite directions: revision 1 committed to the native menu, revision 2 removed the OS
titlebar. On Windows only one can win, and the borderless window was the later and more explicit request.

### 16.2 The chrome

One row — `apps/desktop/src/components/chrome/TitleBar.tsx`:

```
┌───────────────────────────────────────────────────────────────────────┐
│ NeuroScan  File Edit View Tools Help        ( drag )      –  ▢  ✕      │
└───────────────────────────────────────────────────────────────────────┘
```

- **Title** — the wordmark, linked to `/`.
- **Menus** — rendered from `MENU_SECTIONS` in `src/lib/menu-definition.ts`, carrying the same ids and accelerators
  as §5–§9, and resolving through the same `MENU_ROUTES` registry the keyboard shortcuts use.
- **Drag region** — the blank stretch, marked `data-tauri-drag-region`. Tauri's injected script turns a drag into a
  window move and a double click into a maximize. Interactive children deliberately omit the attribute, so clicking
  a menu or a button never starts a drag.
- **Window buttons** — minimize, maximize/restore, close. Close goes through the quit guard, never `window.close()`.
- Menus follow the ARIA menu-button pattern: `aria-haspopup`/`aria-expanded` on the trigger, `role="menu"` panel,
  ArrowUp/ArrowDown between enabled items, Escape closes and restores focus, and hovering a sibling switches menus
  once one is already open.

The old frosted `<header>` was deleted: with a title bar above it the app would have shown its name twice.

### 16.3 Configuration

`tauri.conf.json` gained two things. Both are load-bearing, neither is optional:

```json
"allowlist": {
  "window": {
    "startDragging": true,
    "minimize": true,
    "maximize": true,
    "unmaximize": true,
    "close": true
  }
},
"windows": [{ "title": "NeuroScan", "width": 1200, "height": 800, "resizable": true, "decorations": false }]
```

- `decorations: false` removes the OS titlebar — which is what makes the custom chrome possible, and what breaks the
  native menu (§16.1).
- The `allowlist` block is required because the config previously had **none**, and Tauri v1 denies every JS window
  API by default: without `startDragging` the window cannot be moved by its drag region, and without
  `minimize`/`maximize`/`unmaximize`/`close` the buttons do nothing. Keys are camelCase, and
  `WindowAllowlistConfig` uses `deny_unknown_fields`, so a typo fails the build instead of silently disabling a
  button.
- `isMaximized` is not gated, so reading the restore state needs no extra permission.

### 16.4 Rust: `menu.rs` became `quit_guard.rs`

The menu builder, the id constants and the menu click event are gone — the ids now live in `src/lib/menu-ids.ts` and
the structure in `src/lib/menu-definition.ts`. What remains is the part that was never about menus:

- `BatchRunState` — mirrors the frontend's batch run flag via `set_batch_running`.
- `PendingQuit` — tracks an outstanding decision so two requests cannot stack dialogs.
- `guard_window_close` — intercepts `WindowEvent::CloseRequested` so Alt+F4 and the taskbar obey the same guard.
- Commands: `request_quit`, `set_batch_running`, `confirm_quit`, `cancel_quit`.

Keeping the guard in Rust is deliberate. With the window borderless the close button is ours, but Alt+F4 and the
Windows taskbar still exist, and Rust is the only layer that sees all of them plus the batch flag. The quit event was
renamed `menu://quit-requested` → `app://quit-requested`, since the backend no longer owns a menu.

### 16.5 Files as built

| Path | State |
|------|-------|
| `src-tauri/src/quit_guard.rs` | New — replaced `menu.rs` |
| `src-tauri/src/main.rs` | Wired to the guard; no `.menu()` or `.on_menu_event()` |
| `src-tauri/tauri.conf.json` | `decorations: false` + the `allowlist.window` block + `"dialog"` feature in Cargo.toml |
| `src/components/chrome/TitleBar.tsx` | New — the single chrome row |
| `src/components/chrome/TitleBarMenu.tsx` | New — one top-level menu and its dropdown |
| `src/lib/menu-definition.ts` | New — the menu tree the bar renders |
| `src/lib/hooks/use-window-controls.ts` | New — minimize / maximize-restore state |
| `src/lib/hooks/use-quit-guard.ts` | `requestQuit` added |
| `src/lib/menu-ids.ts` | `QUIT_REQUESTED_EVENT` replaces the action event |
| `src/lib/menu-events.ts` | Dispatches in-app now; `subscribeToMenuActions` removed |
| `src/lib/hooks/use-menu-bar.ts` | Deleted — there is no native menu to subscribe to |
| `src/routes/__root.tsx` | Mounts `TitleBar`; duplicate header removed |
| `src/lib/hooks/use-keyboard-shortcuts.ts` | Also fixed: bare keys no longer steal a typed character or a focused button's Space |

### 16.6 New risks from this revision

1. **Resize edges are unverified.** `resizable: true` is still set, but a borderless Windows window can lose its
   drag-to-resize borders, and Tauri v1 exposes no supported knob for re-adding the frame. Confirm in a `tauri:dev`
   build; if the edges are dead, either accept maximize-only sizing or add a thin in-app resize affordance.
2. **No OS drop shadow.** The frame took the system shadow with it; the title bar's bottom border is doing that work
   visually.
3. **macOS loses its traffic lights and app menu.** Out of scope for the Windows-first pass, but a macOS build now
   needs its own window buttons and a menu story — and `Cmd+Q`/Hide conventions users expect were part of what the
   native menu provided.
4. **Windows 11 Snap Layouts** are triggered by the system maximize button, so the custom one will not offer the
   hover flyout.
5. **Help links still cannot open a browser** — unchanged from §14 Risk 9, still needs `allowlist.shell.open`.
