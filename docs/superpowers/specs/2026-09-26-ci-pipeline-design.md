# CI Pipeline Design

Date: 2026-09-26
Status: awaiting review

## Goal

A pull-request gate that rejects regressions in the TypeScript/React frontend and the
Rust/Tauri backend. No release artifacts, no installer builds, no deploy.

Explicitly out of scope for v1: cross-platform builds, `tauri build`, release signing,
GitHub Releases, path-based job skipping, caching of `vite build` output.

## Architecture

One workflow file, `.github/workflows/ci.yml`, containing two independent jobs:

- `frontend` — Biome check, TypeScript typecheck, Vitest. Runs on `ubuntu-latest`.
- `rust` — `cargo fmt --check`, `cargo clippy`, `cargo check`. Runs on `ubuntu-latest`.

The jobs share no state and neither declares `needs:` the other, so a frontend failure
never waits on a Rust compile. Target wall-clock time is roughly 4 minutes from cold.

### Triggers

```yaml
on:
  push:
  pull_request:
```

Push on every branch so branch pushes get the same signal as PRs, plus
`pull_request` for forks.

### Concurrency

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

New commits to a PR cancel the in-flight run. Without this, a rapid series of pushes
queues runs that nobody will read.

### Permissions

```yaml
permissions:
  contents: read
```

Default token permissions, reduced to read-only. The pipeline needs no secrets.

## Job: frontend

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: pnpm/action-setup@v4          # no `version:` — reads packageManager pin
  - uses: actions/setup-node@v4
    with:
      node-version: 22
      cache: pnpm
  - run: pnpm install --frozen-lockfile
  - run: pnpm --filter @neuroscan/desktop exec biome lint src
  - run: pnpm --filter @neuroscan/desktop exec tsc --noEmit
  - run: pnpm --filter @neuroscan/desktop test
```

Notes:

- `pnpm/action-setup@v4` is given no `version` input deliberately. It reads
  `packageManager: "pnpm@12.6.0"` from the root `package.json`, so the runner's pnpm can
  never drift from the pin in the repo.
- `cache: pnpm` on `setup-node` caches the pnpm store, keyed on `pnpm-lock.yaml`.
  Restore keys are not configured; the store is content-addressed and cheap to re-fetch.
- `biome lint` lints only; it is deliberately not `biome check`. See D4.
- `tsc --noEmit` is a pure typecheck: `apps/desktop/tsconfig.json` already sets
  `"noEmit": true`, so no build output is produced or cached.
- `test` maps to `vitest run` (34 tests across 8 files) with the jsdom environment from
  `apps/desktop/vitest.config.ts`.
- The job is scoped to `@neuroscan/desktop`. `packages/ui`, `packages/types` and
  `packages/utils` have no test runner, so a workspace-wide `test` would report success
  having run nothing.

## Job: rust

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: dtolnay/rust-toolchain@stable
    with:
      components: rustfmt, clippy
  - uses: Swatinem/rust-cache@v2
    with:
      workspaces: |
        apps/desktop/src-tauri -> target
      key: neuroscan-rust
  - run: |
      sudo apt-get update
      sudo apt-get install -y \
        libwebkit2gtk-4.0-dev libgtk-3-dev libayatana-appindicator3-dev \
        librsvg2-dev build-essential libssl-dev pkg-config
  - run: cargo fmt --check
  - run: cargo clippy --all-targets -- -D warnings
  - run: cargo check
```

All three cargo steps use `defaults.run.working-directory: apps/desktop/src-tauri`.

Notes:

- `libwebkit2gtk-4.0-dev`, not `4.1`. The crate depends on `tauri 1.5`, whose Linux
  backend targets WebKitGTK 4.0. Tauri v2 needs the 4.1 package; getting this wrong
  fails at the `webkit2gtk-sys` build script with an unhelpful error.
- `pkg-config` is required by the `*-sys` build scripts and is easy to omit.
- The toolchain is pinned to `stable` in the workflow because the repo has no
  `rust-toolchain.toml`. The developer's local toolchain is nightly, and clippy's lint
  set differs between the two channels, so the first CI run may report warnings that
  pass locally. This is expected and the fix is to address the warning, not to move CI
  to nightly.
- `--locked` is intentionally absent. See "Decisions" below.

## Decisions

### D1: `Cargo.lock` stays gitignored, so `--locked` is not used

`.gitignore` contains an explicit `src-tauri/Cargo.lock` entry. Upstream Tauri templates
ship that ignore. Overriding an existing deliberate choice is out of scope for this
change, so the pipeline runs plain `cargo check` and lets Cargo resolve versions
itself.

Consequence: Rust dependency versions are not pinned by CI. A newly published patch of a
transitive dependency can break `cargo check` on an unrelated commit. Revisiting this —
either committing the lock or adding `--locked` — is a separate change with its own
rollback story.

### D2: Biome becomes an explicit devDependency

`biome --version` currently reports 2.4.12 in the working tree, but Biome is not listed
in any `package.json`; it resolves through `node_modules` hoisting. A fresh CI runner
would not have it. `@biomejs/biome@^2.4.12` is added to the root `devDependencies` so
the version is declared rather than inherited.

### D3: No `paths-ignore` on the trigger

Both `apps/desktop/src-tauri` and the frontend live under `apps/desktop`, so
path-filtering has little to gain beyond skipping `docs/`-only thesis commits. A wrong
filter silently skips real checks, which is a worse failure than a slow build. Adding
`dorny/paths-filter` later is a three-line change.

## Repository changes required

Beyond the workflow file:

1. `.github/workflows/ci.yml` — new, the pipeline itself.
2. `biome.json` — new, at the repo root.
3. `package.json` (root) — add `@biomejs/biome` to `devDependencies`.
4. `.gitignore` — add `.freebuff/` and `bun.lock`, both currently untracked and neither
   intentional.

Deliberately **not** changing: `tsconfig.json`, `vitest.config.ts`, `Cargo.toml`, the
per-package `package.json` files, and the existing `src-tauri/Cargo.lock` ignore rule.

## `biome.json` scope

Lint only, over the app source. Explicitly excluded:

- `apps/desktop/src/routeTree.gen.ts` — generated by `tsr generate`
- `pnpm-lock.yaml`, `bun.lock` — generated
- `.freebuff/`, `docs/` — not application source
- `apps/desktop/src-tauri` — Rust, handled by `clippy` and `rustfmt`

One rule is switched off: `suspicious/noUnknownAtRules`. It fires three times on the
`@tailwind` directives at `apps/desktop/src/index.css:1-3`, which are Tailwind
directives, not CSS at-rules. Fixing them is impossible; disabling the rule is correct.

The `formatter` block sets `indentStyle: "space"` and `indentWidth: 2` to match the
existing code, so enabling the formatter later will not reindent the tree.

## D4: Format checking stays out of the CI gate

Measured on 2026-09-26 against the current tree: enabling Biome's formatter produces
formatting diffs in most of the source files under every line width tried (default 80,
and 100). The JSX in this repo was hand-wrapped; Biome's canonical form collapses those
multi-line props onto single lines.

`biome check` would therefore force a mechanical rewrite of the whole tree into the same
change that introduces CI, which makes the change impossible to review in isolation. v1
runs `biome lint` instead. Adding `biome format` to the gate is a separate decision.

**Update, 2026-09-26, during implementation.** The reformat happened anyway, and
unintentionally: `biome check --write --only=assist/source/organizeImports` restricts
*lint rules* but not the formatter, so the import-ordering pass also rewrote 55 files to
Biome's canonical style. The source is untracked in git, so the change was not
recoverable. It was verified cosmetic — 34/34 tests pass, `tsc --noEmit` is clean, and
the lint error count was unchanged at 12.

The tree is now Biome-formatted: `biome format src` reports zero diffs. Consequences:

- The "add formatting later as a dedicated commit" step is already paid for. The reformat
  needs committing as its own change, separate from the lint fixes, to stay reviewable.
- `biome format` could now be added to the CI gate cheaply, since it would pass. It is
  still left out, to keep the gate's scope limited to lint.
- `biome.json`'s `formatter` block still sets `indentStyle: "space"` and
  `indentWidth: 2`, which is what makes the tree conformant rather than tab-indented.



## Error handling

- No `continue-on-error` on any step. A failing check fails the job.
- No retries and no `if: always()` cleanup steps; both jobs only read the checkout.
- No Step Summary annotations in v1. `biome check` and `tsc` already print actionable
  diffs and diagnostics to the log.
- A `frontend` failure and a `rust` failure are independent: fixing Rust does not
  unblock a red frontend check, and both must go green.

## Testing the pipeline itself

The pipeline cannot be tested before it exists. Verification order:

1. Run each command locally and confirm a zero exit code. Done on 2026-09-26:
   `vitest run` 34/34 pass, `tsc --noEmit` clean, `cargo fmt --check` 0,
   `cargo clippy --all-targets -- -D warnings` 0, `cargo check` 0.
2. Push a branch and confirm both jobs appear and pass on `ubuntu-latest`. This is the
   first real test of the `libwebkit2gtk-4.0-dev` dependency list and of `stable` clippy
   against nightly-authored code.
3. Deliberately break each gate in a throwaway commit and confirm the corresponding job
   goes red: an unused import for Biome, a type error for `tsc`, a failing assertion for
   Vitest, a formatting change for `cargo fmt`, an unused variable for `clippy`.
4. Confirm `concurrency` cancels a superseded run by pushing twice in quick succession.

Steps 3 and 4 are one-time smoke tests on a throwaway branch, not permanent tests.
