# CI Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GitHub Actions pipeline that gates every push and pull request on Biome lint, TypeScript typecheck, Vitest, `cargo fmt`, `cargo clippy`, and `cargo check`.

**Architecture:** One workflow file, `.github/workflows/ci.yml`, with two jobs that share no state: `frontend` (Biome, tsc, Vitest) and `rust` (fmt, clippy, check). Neither job declares `needs:` the other, so a failure in one never blocks the other from reporting. Every command the workflow runs has been verified locally on 2026-09-26.

**Tech Stack:** GitHub Actions, pnpm 12.6.0, Biome 2.4.12, TypeScript 5, Vitest 1.6, Rust stable + Clippy, Tauri 1.5, Ubuntu 24.04 runner.

**Spec:** `docs/superpowers/specs/2026-09-26-ci-pipeline-design.md` — read this first. The plan argues from the spec; the spec carries the rationale and the rejected alternatives.

## Global Constraints

- Runner is `ubuntu-latest` for both jobs. No matrix. No `windows-latest` or `macos-latest` anywhere.
- No `continue-on-error` on any step. No `if: always()` cleanup steps.
- Top-level `permissions: contents: read`. The pipeline uses no secrets.
- `pnpm/action-setup@v4` is invoked with **no** `version:` input so it reads `packageManager` from the root `package.json`.
- `pnpm install` always uses `--frozen-lockfile`.
- Cargo commands run with `working-directory: apps/desktop/src-tauri`.
- Tauri is v1, so the Linux system dependency is `libwebkit2gtk-4.0-dev`, **not** `4.1`.
- `cargo check` runs **without** `--locked`, because `.gitignore` excludes `src-tauri/Cargo.lock`. See spec decision D1.
- Biome runs as `biome lint`, **never** `biome check`. See spec decision D4.
- Commit messages follow Conventional Commits, matching the existing history (`feat:`, `chore:`, `docs:`, `refactor:`).

## Baseline

Verified locally on 2026-09-26 before this plan was written. Re-run any of these to confirm
your tree still matches before starting.

```
pnpm --filter @neuroscan/desktop test                        -> 34 passed, 8 files
pnpm --filter @neuroscan/desktop exec tsc --noEmit           -> clean
cargo fmt --check                                            -> exit 0
cargo clippy --all-targets -- -D warnings                   -> exit 0
cargo check                                                  -> exit 0
pnpm --filter @neuroscan/desktop exec biome lint src         -> 18 errors (the backlog)
```

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `.github/workflows/ci.yml` | create | The pipeline: triggers, concurrency, two jobs |
| `biome.json` | create | Lint rules, file scope, the one disabled rule |
| `package.json` (root) | modify | Declare `@biomejs/biome`; add `lint` script |
| `.gitignore` | modify | Ignore `.freebuff/` and `bun.lock` |
| `src/routes/about.tsx` | modify | Add `type` to `<button>` |
| `src/routes/history.tsx` | modify | Add `type` to `<button>` |
| `src/routes/batch.tsx` | modify | Make the interactive `<div>` a `<button>` |
| `src/components/batch/VerdictBadge.tsx` | modify | Move `aria-label` off the unsupported element |
| `src/components/batch/ResultsTable.tsx` | modify | Replace `role="group"` with `<fieldset>`/`<legend>` |
| `src/components/chrome/TitleBarMenu.tsx` | modify | Replace `role="separator"` with `<hr>`; fix array-index key |
| `src/components/single/ImageStage.tsx` | modify | Move `aria-label` off the unsupported element |
| `src/components/single/SingleScreeningScreen.tsx` | modify | Remove the unnecessary `retryToken` dependency |
| `src/lib/screening/annotated-export.ts` | modify | Escape control characters in the regex |
| `src/lib/hooks/use-keyboard-shortcuts.test.tsx` | modify | Rename the local `escape` variable |

Nothing else changes. In particular `tsconfig.json`, `vitest.config.ts`, `Cargo.toml`,
`apps/desktop/package.json` and the per-package `package.json` files are untouched.

---

## Task 1: Declare Biome as an explicit dependency

Biome 2.4.12 currently resolves on your machine only because it is hoisted into
`node_modules` by an unrelated package. A fresh CI runner would not have it, so the
`lint` job would fail with "biome: command not found" rather than with a lint error.

**Files:**
- Modify: `package.json` (root `devDependencies`)
- Delete: `biome.json` (a scratch file left behind by the spec investigation; it is not
  yet the configuration this project wants and must not be committed in this state)

**Interfaces:**
- Consumes: nothing
- Produces: `pnpm exec biome` resolves to a declared `@biomejs/biome@^2.4.12` on any machine

- [ ] **Step 1: Remove the scratch config**

```bash
rm biome.json
```

- [ ] **Step 2: Confirm the scratch config was untracked before deleting it**

```bash
git status --short biome.json
```

Expected: `?? biome.json`. If this prints `M biome.json` or `A biome.json`, stop — the
file is staged or tracked and you are about to destroy committed work. Recover with
`git restore --staged --worktree biome.json` and tell the user.

- [ ] **Step 3: Add the dependency**

```bash
pnpm add -D -w @biomejs/biome@^2.4.12
```

`-w` is required: this is a root devDependency, not a per-workspace one, because the
lint job runs from the repo root.

- [ ] **Step 4: Verify it is declared, not hoisted**

```bash
pnpm why @biomejs/biome
```

Expected: lists `neuroscan` (root) as a direct dependency.

```bash
node -e "console.log(require('./package.json').devDependencies['@biomejs/biome'])"
```

Expected: `^2.4.12`

- [ ] **Step 5: Confirm the lockfile changed and is consistent**

```bash
git status --short pnpm-lock.yaml
pnpm install --frozen-lockfile
```

Expected: `pnpm-lock.yaml` shows as modified in step 1's `git status`, and the install
exits 0 without complaint. A `--frozen-lockfile` failure here means the lockfile was not
updated; re-run step 3.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: declare @biomejs/biome as a root devDependency"
```

---

## Task 2: Add the Biome configuration and ignore rules

**Files:**
- Create: `biome.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `@biomejs/biome@^2.4.12` from Task 1
- Produces: `biome lint src` runs with a defined rule set; later tasks rely on
  `suspicious/noUnknownAtRules` being off and on `formatter` being set to
  space/2 so a future `biome format` will not reindent the tree

- [ ] **Step 1: Create `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.12/schema.json",
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "linter": {
    "enabled": true,
    "rules": {
      "suspicious": {
        "noUnknownAtRules": "off"
      }
    }
  },
  "files": {
    "includes": [
      "**",
      "!**/node_modules/**",
      "!apps/desktop/src/routeTree.gen.ts",
      "!**/*.lock",
      "!bun.lock",
      "!.freebuff/**",
      "!docs/**",
      "!apps/desktop/src-tauri/**"
    ]
  }
}
```

Three things in this file are load-bearing:

- `suspicious.noUnknownAtRules: "off"` — fires on the `@tailwind` directives at
  `apps/desktop/src/index.css:1-3`. Those are Tailwind directives, not CSS at-rules, and
  cannot be rewritten. This removes 3 of the 18 errors.
- `indentStyle: "space"` and `indentWidth: 2` — the repo uses 2-space indentation, not
  Biome's default tabs. Setting these now means enabling the formatter later will not
  reindent the tree.
- `files.includes` — `**` followed by negations is Biome 2.x include syntax. The
  negations keep generated files, lockfiles, docs and the Rust crate out of the lint.

- [ ] **Step 2: Verify the config is valid and the rule took effect**

```bash
pnpm exec biome lint src --reporter=summary
```

Expected: 15 errors, not 18. If it still reports 18, the `noUnknownAtRules` override did
not apply — check for a typo in the rule path.

```bash
pnpm exec biome explain noUnknownAtRules
```

Expected: output that documents the rule. This confirms the rule name is real and you
disabled the intended one.

- [ ] **Step 3: Confirm exclusions work**

```bash
pnpm exec biome lint src/routeTree.gen.ts 2>&1 | Select-String "routeTree"
```

Expected: no diagnostics. The file is ignored by the `files.includes` negation.

- [ ] **Step 4: Add the missing `.gitignore` entries**

Append to `.gitignore`:

```
# Local tooling scratch
.freebuff/
bun.lock
```

- [ ] **Step 5: Verify the ignore rules work**

```bash
git status --short
```

Expected: `.freebuff/` and `bun.lock` no longer appear as untracked. Everything else in
the working tree should look exactly as it did before this task.

- [ ] **Step 6: Commit**

```bash
git add biome.json .gitignore
git commit -m "chore: add Biome lint configuration and ignore local tooling artifacts"
```

---

## Task 3: Auto-fix import ordering

23 of the remaining errors are unsorted imports, and every one has a safe
machine-applicable fix. This is mechanical and must land before the hand-written fixes so
that the hand-written diffs are not buried under 23 unrelated import reorderings.

**Files:**
- Modify: 23 files under `apps/desktop/src/` (which ones is determined by the tool, not
  by you — run the command and read the list)

**Interfaces:**
- Consumes: the `biome.json` from Task 2
- Produces: a tree where `biome check`-style import-order errors are gone

- [ ] **Step 1: Record the pre-fix test state**

```bash
pnpm --filter @neuroscan/desktop test 2>&1 | Select-String "Test Files|Tests "
```

Expected: `8 passed` and `34 passed`. Write these numbers down; Step 5 must reproduce them.

- [ ] **Step 2: List the files that will change, before changing them**

```bash
pnpm exec biome lint src --reporter=summary 2>&1 | Select-String "organizeImports"
```

Expected: 23 diagnostics. Note the count.

- [ ] **Step 3: Apply only the import fix, nothing else**

```bash
pnpm exec biome lint src --write --only=assist/source/organizeImports
```

`--only` is the important flag. Without it, `--write` would also apply any other fixable
rule, mixing unrelated changes into this commit.

- [ ] **Step 4: Verify only import ordering changed**

```bash
git diff --stat
```

Expected: ~23 files changed, and every hunk is an import reordering. Read the diff. If
you see any non-import hunk, you ran the command wrong — `git checkout -- .` and retry
with `--only`.

```bash
pnpm exec biome lint src --reporter=summary 2>&1 | Select-String "organizeImports"
```

Expected: no output. The 23 are gone.

- [ ] **Step 5: Verify nothing broke**

```bash
pnpm --filter @neuroscan/desktop test 2>&1 | Select-String "Test Files|Tests "
pnpm --filter @neuroscan/desktop exec tsc --noEmit
```

Expected: `8 passed`, `34 passed`, and no TypeScript output. Import reordering is
semantically neutral, so a failure here means the tool did something unexpected.

- [ ] **Step 6: Commit**

```bash
git add -A apps/desktop/src
git commit -m "style: sort imports with Biome organizeImports"
```

---

## Task 4: Fix the correctness and suspicious-group lint errors

Four real findings. These are behavioural, not stylistic, and each needs a decision about
what the correct code actually is.

**Files:**
- Modify: `apps/desktop/src/lib/hooks/use-keyboard-shortcuts.test.tsx:85`
- Modify: `apps/desktop/src/lib/screening/annotated-export.ts:86`
- Modify: `apps/desktop/src/components/chrome/TitleBarMenu.tsx:122`
- Modify: `apps/desktop/src/components/single/SingleScreeningScreen.tsx:76`

**Interfaces:**
- Consumes: Task 2's `biome.json`, Task 3's sorted imports
- Produces: 4 fewer lint errors; Task 5 depends on these being resolved

### 4a: `noShadowRestrictedNames` in the keyboard shortcuts test

The test declares a local variable that shadows the global `escape`.

- [ ] **Step 1: Read the offending code**

```bash
pnpm exec biome lint src/lib/hooks/use-keyboard-shortcuts.test.tsx
```

- [ ] **Step 2: Read the surrounding context**

Read `apps/desktop/src/lib/hooks/use-keyboard-shortcuts.test.tsx` lines 75-95. Find the
identifier at column 11 on line 85 — Biome named it `escape`.

- [ ] **Step 3: Rename it**

Rename the local binding to `escapeKey` and update every reference to it **within that
test file only**. Do not change the string value `'Escape'` — that is a `KeyboardEvent.key`
value and must stay as-is.

- [ ] **Step 4: Verify**

```bash
pnpm exec biome lint src/lib/hooks/use-keyboard-shortcuts.test.tsx
pnpm --filter @neuroscan/desktop test 2>&1 | Select-String "Tests "
```

Expected: no `noShadowRestrictedNames` diagnostic, and `34 passed`. The test must still
pass, which proves the rename did not change what the test exercises.

### 4b: `noControlCharactersInRegex` in annotated export

Two raw control characters sit inside a regex literal at line 86.

- [ ] **Step 1: Read the line with escapes made visible**

Read `apps/desktop/src/lib/screening/annotated-export.ts` lines 80-92. The regex at
column 26-32 and 33-39 on line 86 contains literal control characters.

- [ ] **Step 2: Replace the raw characters with escape sequences**

Convert each literal control character to its `\xNN` escape form. For example a literal
form-feed byte `0x0C` becomes the four characters `\x0C` inside the regex. Keep the
regex's meaning identical — this is a representation change only.

Do not restructure the regex, change its flags, or rename anything.

- [ ] **Step 3: Verify the regex still behaves identically**

```bash
pnpm --filter @neuroscan/desktop test 2>&1 | Select-String "Tests "
```

Expected: `34 passed`. `annotated-export.ts` has no dedicated test file, so the
behavioural guarantee is that the class of input the regex matches is unchanged. Confirm
by eye that you changed only the character representation.

- [ ] **Step 4: Verify the lint error is gone**

```bash
pnpm exec biome lint src/lib/screening/annotated-export.ts
```

Expected: no `noControlCharactersInRegex` diagnostic.

### 4c: `noArrayIndexKey` in the title bar menu

A list is keyed by array index, which breaks when the list reorders.

- [ ] **Step 1: Read the offending render**

Read `apps/desktop/src/components/chrome/TitleBarMenu.tsx` lines 110-130. Column 35 on
line 122 is the `key={index}` expression.

- [ ] **Step 2: Determine whether the list is actually static**

Read the whole component. If the list is a hardcoded array of menu entries that is
declared once at module scope and never filtered, reordered, or mutated, then the index
is a stable identity and the honest fix is a stable derived key.

- [ ] **Step 3: Replace the index key with a stable one**

Use the item's own identifier. If the array items have an `id` field, use `key={item.id}`.
If they are string literals, key by the literal value: `key={label}` where `label` is the
unique display string.

If the list genuinely can reorder at runtime, the index key is a real bug: derive a
stable key from the item's content instead. Do not silence the rule with a
`biome-ignore` comment — that hides a real defect.

- [ ] **Step 4: Verify**

```bash
pnpm exec biome lint src/components/chrome/TitleBarMenu.tsx
pnpm --filter @neuroscan/desktop exec tsc --noEmit
```

Expected: no `noArrayIndexKey` diagnostic, no TypeScript output. Two of the three
remaining diagnostics in this file are a11y and are handled in Task 5, so this file will
still report errors here. That is expected.

### 4d: `useExhaustiveDependencies` in the single screening screen

Biome reports that `retryToken` is listed as a dependency but is not actually used by the
effect. This is the highest-value finding in the batch: an effect that re-runs for a
reason it does not need, or conversely fails to re-run when it should.

- [ ] **Step 1: Read the effect**

Read `apps/desktop/src/components/single/SingleScreeningScreen.tsx` lines 55-95. The
dependency array is at line 76.

- [ ] **Step 2: Understand what `retryToken` is for**

Trace `retryToken`: find its declaration and every place it is read and written. The
overwhelmingly common cause of this diagnostic is that a value is in the dependency
array purely to force the effect to re-run when a retry is requested.

- [ ] **Step 3: Choose the correct fix**

- If `retryToken` is read **inside** the effect body, Biome's report is a false positive
  from a stale analysis or a genuine missing read. Re-read the effect body carefully.
  If it truly is not read, remove it from the array.
- If `retryToken` is a retry token whose only purpose is to force re-execution, removing
  it from the array **breaks the retry**. In that case the correct code reads the token
  inside the effect — for example
  `const token = retryToken;` at the top of the effect body — which makes the dependency
  genuine and keeps the retry working.

Decide based on what the code does, not on what makes the linter quiet. If the intent is
unclear from the code, stop and ask the user rather than guessing; a broken retry path is
worse than a lint error.

- [ ] **Step 4: Verify**

```bash
pnpm exec biome lint src/components/single/SingleScreeningScreen.tsx
pnpm --filter @neuroscan/desktop exec tsc --noEmit
pnpm --filter @neuroscan/desktop test 2>&1 | Select-String "Tests "
```

Expected: no `useExhaustiveDependencies` diagnostic, no TypeScript output, `34 passed`.

- [ ] **Step 5: Commit all four fixes**

```bash
git add apps/desktop/src
git commit -m "fix: resolve Biome correctness and suspicious lint findings"
```

---

## Task 5: Fix the a11y lint errors

Nine findings. Most are genuine accessibility defects: buttons that default to `type="submit"`,
interactive `<div>`s that keyboard and screen-reader users cannot reach, and ARIA roles
applied to elements that do not support them.

**Files:**
- Modify: `apps/desktop/src/routes/about.tsx:12`
- Modify: `apps/desktop/src/routes/history.tsx:12`
- Modify: `apps/desktop/src/routes/batch.tsx:345`
- Modify: `apps/desktop/src/components/batch/VerdictBadge.tsx:31`
- Modify: `apps/desktop/src/components/batch/ResultsTable.tsx:265`
- Modify: `apps/desktop/src/components/chrome/TitleBarMenu.tsx:121,123`
- Modify: `apps/desktop/src/components/single/ImageStage.tsx:92`

**Interfaces:**
- Consumes: Task 2's `biome.json`, Task 4's stable keys in `TitleBarMenu.tsx`
- Produces: `biome lint src` exits 0, which is what makes the `lint` CI step viable

### 5a: Missing `type` on buttons (2 errors)

- [ ] **Step 1: Read both sites**

Read `apps/desktop/src/routes/about.tsx` lines 8-18 and
`apps/desktop/src/routes/history.tsx` lines 8-18. Both are `<button>` elements spanning
columns 11-113 on line 12.

- [ ] **Step 2: Add the explicit type**

Add `type="button"` to each. These are navigation buttons in a desktop app with no form
around them, so `button` (non-submitting) is correct. Omitting `type` makes a button
default to `submit`, which is wrong outside a form and actively harmful inside one.

- [ ] **Step 3: Verify**

```bash
pnpm exec biome lint src/routes/about.tsx src/routes/history.tsx
```

Expected: no `useButtonType` diagnostic for either file.

### 5b: Static element with an interactive handler

- [ ] **Step 1: Read the offending element**

Read `apps/desktop/src/routes/batch.tsx` lines 335-360. Lines 345-353 are a static
element carrying an interaction handler.

- [ ] **Step 2: Identify the element and its handler**

Determine which HTML element it is and what the handler does. If it is a `<div>` or
`<span>` with an `onClick`, that element is unreachable by keyboard and invisible to
assistive technology.

- [ ] **Step 3: Change it to a `<button>`**

Convert the element to `<button type="button">`, move the handler onto it, and move
`className` across unchanged. If the element contains block-level children that are
illegal inside a `<button>`, use `role="button"` with `tabIndex={0}` and add an
`onKeyDown` handler that fires the same callback on Enter and Space — the pattern
Biome's `useKeyWithClickEvents` rule expects.

Keep all existing Tailwind classes. Do not restyle the component.

- [ ] **Step 4: Verify**

```bash
pnpm exec biome lint src/routes/batch.tsx
pnpm --filter @neuroscan/desktop exec tsc --noEmit
```

Expected: no `noStaticElementInteractions` diagnostic, no TypeScript output.

### 5c: `aria-label` on an element whose role does not support it (2 errors)

Both are the same mistake: an `aria-label` placed on an element whose implicit role has
no accessible name from `aria-label`.

- [ ] **Step 1: Read `VerdictBadge.tsx`**

Read `apps/desktop/src/components/batch/VerdictBadge.tsx` lines 22-40. Line 31 spans
columns 7-93.

- [ ] **Step 2: Read `ImageStage.tsx`**

Read `apps/desktop/src/components/single/ImageStage.tsx` lines 85-115. The offending
element spans lines 92-108.

- [ ] **Step 3: Fix each one**

- If the element already has a visible text label, **delete** the `aria-label`. A
  redundant `aria-label` overrides the visible text and is a common source of
  screen-reader confusion.
- If the element is a bare `<div>` or `<span>` with no text, give it a real role that
  supports naming: `role="img"` for an image-like element, or `role="status"` /
  `role="alert"` for a live region, then keep the `aria-label`.
- If the element is a `<div>` holding an `<img>`, move the `aria-label` onto the `<img>`
  and give it an empty `alt=""` if it is decorative.

- [ ] **Step 4: Verify**

```bash
pnpm exec biome lint src/components/batch/VerdictBadge.tsx src/components/single/ImageStage.tsx
```

Expected: no `useAriaPropsSupportedByRole` diagnostic for either file.

### 5d: `role="separator"` on a non-focusable element (3 errors)

All three are in the same five lines of `TitleBarMenu.tsx`, and they are one problem, not
three.

- [ ] **Step 1: Read the element**

Read `apps/desktop/src/components/chrome/TitleBarMenu.tsx` lines 112-130. Line 121-125
has `role="separator"`, line 123 also has `role="separator"`, and Biome reports
`useFocusableInteractive`, `useSemanticElements` and `useAriaPropsForRole` against them.

- [ ] **Step 2: Replace the ARIA role with the semantic element**

Biome's own message tells you the answer: `useSemanticElements` says the element "can be
changed to `<hr>`". Replace the element with `<hr />` and delete both the `role` and any
ARIA attributes that only existed to satisfy the role. A separator between menu groups is
exactly what `<hr>` means, and it needs no ARIA at all.

Keep any `className` so the visual appearance does not change. If the `<hr>` needs a
colour override, keep the existing Tailwind classes — `<hr>` inherits a default border
that may need `border-0` if the current element had `border: none` semantics. Check the
rendered result, not just the linter.

This also resolves the `useFocusableInteractive` error, because a native `<hr>` is not
interactive and does not need to be focusable. Do not add `tabIndex` to a separator; that
would be the wrong fix.

- [ ] **Step 3: Verify**

```bash
pnpm exec biome lint src/components/chrome/TitleBarMenu.tsx
pnpm --filter @neuroscan/desktop exec tsc --noEmit
pnpm --filter @neuroscan/desktop test 2>&1 | Select-String "Tests "
```

Expected: `TitleBarMenu.tsx` is now completely clean — zero diagnostics. The
`noArrayIndexKey` error from Task 4c must also be gone. `34 passed` on tests.

### 5e: `role="group"` that should be a `<fieldset>`

- [ ] **Step 1: Read the element**

Read `apps/desktop/src/components/batch/ResultsTable.tsx` lines 255-280. Line 265,
columns 11-23.

- [ ] **Step 2: Convert to `<fieldset>` and `<legend>`**

Biome's message says the element can be changed to `<fieldset>`. Replace the element
with `<fieldset>` and drop the `role="group"`. If the element has an `aria-label` acting
as the group's name, convert it to a `<legend>` as the fieldset's first child.

Keep all styling classes. A `<fieldset>` has a default `border` and `padding` that a
`div` does not; if the current styling relies on the border being absent, add
`border-0 p-0 m-0` so the rendered output is unchanged.

- [ ] **Step 3: Verify**

```bash
pnpm exec biome lint src/components/batch/ResultsTable.tsx
pnpm --filter @neuroscan/desktop exec tsc --noEmit
```

Expected: no `useSemanticElements` diagnostic, no TypeScript output.

### 5f: Confirm the whole tree is clean

- [ ] **Step 1: Run the exact command CI will run**

```bash
pnpm exec biome lint src
```

Expected: exit 0, no errors. Warnings about `!important` in `index.css` are acceptable —
Biome does not fail on warnings without `--error-on-warnings`, and the workflow does not
pass that flag.

- [ ] **Step 2: Verify types and tests are still green**

```bash
pnpm --filter @neuroscan/desktop exec tsc --noEmit
pnpm --filter @neuroscan/desktop test 2>&1 | Select-String "Test Files|Tests "
```

Expected: no output from `tsc`, `8 passed` and `34 passed`.

- [ ] **Step 3: Verify you did not introduce suppression comments**

```bash
git diff master...HEAD -- '*.tsx' '*.ts' | Select-String "biome-ignore"
```

Expected: no output. Every finding was fixed properly. If you added a `biome-ignore`
comment anywhere in this task, justify it to the user explicitly.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src
git commit -m "fix: resolve Biome a11y lint findings"
```

---

## Task 6: Add the root lint script

**Files:**
- Modify: `package.json` (root `scripts`)

**Interfaces:**
- Consumes: Tasks 1-5
- Produces: `pnpm lint` at the repo root, which is what the workflow calls

- [ ] **Step 1: Add the script**

Add to the root `scripts` object, after the existing `dev` entry:

```json
"lint": "biome lint apps/desktop/src"
```

Note the path. The root `biome.json` uses repo-root-relative globs, so the script must
name the source directory from the root, not rely on the `files.includes` globs to find
it. `biome lint apps/desktop/src` is explicit and does not depend on Biome's directory
search behaviour.

- [ ] **Step 2: Verify it works from the repo root**

```bash
pnpm lint
```

Expected: exit 0.

- [ ] **Step 3: Verify the other root scripts still resolve**

```bash
pnpm build 2>&1 | Select-Object -Last 5
```

Expected: the desktop app builds. This confirms adding a script to the root `scripts`
object did not disturb the existing `dev` / `build` / `tauri:*` entries.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: add root lint script"
```

---

## Task 7: Write the workflow

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `pnpm lint` from Task 6, `pnpm --filter @neuroscan/desktop test`,
  and the cargo commands in `apps/desktop/src-tauri`
- Produces: the pipeline itself

- [ ] **Step 1: Create the workflow**

```yaml
name: CI

on:
  push:
  pull_request:

permissions:
  contents: read

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  frontend:
    name: Frontend (lint, typecheck, test)
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up pnpm
        uses: pnpm/action-setup@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm lint

      - name: Typecheck
        run: pnpm --filter @neuroscan/desktop exec tsc --noEmit

      - name: Test
        run: pnpm --filter @neuroscan/desktop test

  rust:
    name: Rust (fmt, clippy, check)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/desktop/src-tauri
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Rust toolchain
        uses: dtolnay/rust-toolchain@stable
        with:
          components: rustfmt, clippy

      - name: Cache Rust artifacts
        uses: Swatinem/rust-cache@v2
        with:
          workspaces: |
            apps/desktop/src-tauri -> target
          key: neuroscan-rust

      - name: Install Tauri system dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            libwebkit2gtk-4.0-dev \
            libgtk-3-dev \
            libayatana-appindicator3-dev \
            librsvg2-dev \
            build-essential \
            libssl-dev \
            pkg-config

      - name: Check formatting
        run: cargo fmt --check

      - name: Clippy
        run: cargo clippy --all-targets -- -D warnings

      - name: Check
        run: cargo check
```

Points that are easy to get wrong, all deliberate:

- `pnpm/action-setup@v4` has **no** `with:` block. It reads `packageManager` from the root
  `package.json`.
- `libwebkit2gtk-4.0-dev` is the Tauri **v1** requirement. Tauri v2 needs `4.1`. Using
  the wrong one fails deep inside the `webkit2gtk-sys` build script with an error that
  does not mention WebKit.
- `pkg-config` is required by the `-sys` crates and is easy to omit.
- `defaults.run.working-directory` is at the job level, so all three cargo steps share it
  without repeating it.
- No `--locked`, because `.gitignore` excludes `Cargo.lock`. See spec decision D1.
- `permissions: contents: read` and no secrets anywhere.

- [ ] **Step 2: Validate the YAML parses**

```bash
pnpm dlx js-yaml .github/workflows/ci.yml
```

Expected: the parsed structure prints with `jobs.frontend` and `jobs.rust` present, and
`jobs.rust.defaults.run.working-directory` equal to `apps/desktop/src-tauri`.

If `js-yaml` is unavailable, use any YAML parser. Do not skip this step: a malformed
workflow fails silently on push and you will not find out until CI is already broken.

- [ ] **Step 3: Verify the frontend commands match Task 6 and the local baseline**

```bash
pnpm lint; if ($?) { pnpm --filter @neuroscan/desktop exec tsc --noEmit }
```

Expected: both succeed. These are the exact commands the workflow's `Lint` and
`Typecheck` steps run, so a failure here is a failure there.

- [ ] **Step 4: Verify the Rust commands from the right directory**

```bash
cargo fmt --check
```

Run with `workdir` set to `apps/desktop/src-tauri`.

Expected: exit 0. Then repeat for `cargo clippy --all-targets -- -D warnings` and
`cargo check`. All three must exit 0, exactly as the workflow runs them.

- [ ] **Step 5: Confirm no secrets and no unexpected triggers**

```bash
git diff --stat
Select-String -Path .github/workflows/ci.yml -Pattern "secrets\.|pull_request_target|continue-on-error"
```

Expected: no matches for either pattern. `pull_request_target` in particular must never
appear — it runs with write scope on untrusted PR code.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add lint, typecheck, test, fmt, clippy and check pipeline"
```

---

## Task 8: Verify the pipeline on a real run

Local commands cannot prove that the Linux system dependency list is correct or that
`stable` clippy agrees with your nightly-authored code. Only a real runner can. This task
pushes a branch and reads the result.

**Files:** none modified

**Interfaces:**
- Consumes: everything from Task 7
- Produces: a verified-green run, or a concrete list of what broke

- [ ] **Step 1: Push a branch**

```bash
git checkout -b ci/verify-pipeline
git push -u origin ci/verify-pipeline
```

- [ ] **Step 2: Open the run and watch both jobs**

```bash
gh run list --branch ci/verify-pipeline --limit 1
gh run watch
```

Expected: both `Frontend` and `Rust` jobs go green.

- [ ] **Step 3: If the Rust job fails on system dependencies**

The failure will name a `-sys` crate. Add the corresponding `apt` package to the
`Install Tauri system dependencies` step in Task 7's file, commit, and push again. This
is the most likely first-run failure and it is a one-line fix.

- [ ] **Step 4: If the Rust job fails with new clippy warnings**

Your local toolchain is nightly 1.99; CI runs `stable`. Clippy's lint set differs between
channels, so `stable` may flag things nightly does not.

Fix the warning in the source. Do **not** add `#[allow(...)]` to silence it and do not
switch the workflow to nightly — see the spec's note on toolchain pinning. If a warning
genuinely does not apply, disable that specific rule in `clippy.toml` and commit that
with a comment explaining why.

- [ ] **Step 5: Verify the gate actually rejects bad code**

On the same throwaway branch, introduce one failure per gate and confirm the
corresponding job goes red. Do all five, one commit each:

```bash
# 1. Lint — unused import
#    add `import { useEffect } from "react";` to src/routes/about.tsx
# 2. Typecheck — type error
#    add `const x: number = "not a number";` to src/routes/about.tsx
# 3. Test — failing assertion
#    change an expected value in src/lib/navigation.test.ts
# 4. cargo fmt — formatting
#    run `cargo fmt` in apps/desktop/src-tauri
# 5. clippy — unused variable
#    add `let unused = 1;` to src/main.rs
```

After each, push and confirm the expected job fails and the other three stay green. That
last part is the real test of the job graph's independence.

- [ ] **Step 6: Verify concurrency cancellation**

Push two commits to the branch within a minute of each other and watch the run list.

Expected: the first run is marked `cancelled` and only the newest completes.

- [ ] **Step 7: Clean up**

```bash
git checkout -
git branch -D ci/verify-pipeline
git push origin --delete ci/verify-pipeline
```

Do not delete the branch until Step 5 is fully complete — you need it for each
deliberate failure.

- [ ] **Step 8: Confirm the working tree is clean**

```bash
git status --short
```

Expected: no output, other than any changes that were already uncommitted before this
plan started.

---

## Self-Review

**Spec coverage.** Triggers → Task 7. Concurrency → Task 7, verified in Task 8 Step 6.
Permissions → Task 7, checked in Task 7 Step 5. `frontend` job steps → Task 7, all
commands verified in Task 7 Step 3. `rust` job steps and system deps → Task 7, verified
in Task 7 Steps 3-4 and Task 8 Steps 2-3. D1 (no `--locked`) → Task 7, with the
rationale restated in the step comment. D2 (explicit Biome dep) → Task 1. D3 (no
`paths-ignore`) → no task, correctly, because it is a decision not to do something.
D4 (`biome lint`, not `biome check`) → Task 2's config sets the formatter to match the
tree, and Task 5 Step 1 asserts `biome lint src` exits 0. `biome.json` exclusions →
Task 2 Steps 1 and 3. `.gitignore` additions → Task 2 Steps 4-5. Testing the pipeline
itself → Task 8, all five steps.

**Placeholder scan.** No "TBD", no "handle edge cases", no "similar to Task N". The only
conditional logic is Task 4d Step 3, which branches on what `retryToken` actually does —
that is a real fork requiring a code-reading decision, and both branches are written out.

**Type and name consistency.** `biome lint apps/desktop/src` in Task 6 is the string the
workflow's `Lint` step calls in Task 7. `pnpm --filter @neuroscan/desktop test` appears
identically in Task 7 and in the Baseline. The `formatter` keys set in Task 2
(`indentStyle: "space"`, `indentWidth: 2`) are the values Task 2 Step 2 depends on. The
`--only=assist/source/organizeImports` flag in Task 3 matches the rule name Biome
reported as `assist/source/organizeImports`.

**Known gaps, stated rather than hidden.** Node 22 is pinned in the workflow but the repo
has no `.nvmrc` or `engines` field, so the Node version CI uses is not recorded anywhere
in the repo. Adding a `.nvmrc` is a one-line follow-up, deliberately not bundled here
because it changes local developer setup rather than CI. `cargo check` without `--locked`
means Rust dependency versions are not pinned — this is spec decision D1, accepted
knowingly, and revisiting it is a separate change.
