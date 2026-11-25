# NeuroScan

Offline Windows workstation for brain MRI screening: patient and examination
management, DICOM/PNG/JPEG viewing, local AI screening with class activation maps, and
clinician-signed reports.

> **Intended use.** NeuroScan is research and decision-support software. It is not a
> medical device, has no regulatory clearance and has not been clinically validated. AI
> output must be reviewed by a qualified clinician, who makes every diagnostic decision.

## Clinical workflow

1. **Sign in.** First run creates the facility profile and an administrator. Roles:
   administrator, radiologist, technologist, read-only viewer. Sessions lock after
   inactivity; five failed sign-ins lock an account for five minutes.
2. **Register or find the patient** (unique MRN, validated demographics).
3. **Create an examination**; an accession number is assigned.
4. **Import images**: DICOM Part 10, PNG or JPEG, files or folders, or drag and drop.
   Files are content-sniffed, size-capped, SHA-256 de-duplicated, fully decoded and
   copied into the local image store. DICOM modality, body part and Patient ID are
   checked against the examination, with warnings.
5. **Run AI analysis** (only when a validated model is loaded). One background worker,
   live per-image progress, cancellable; every result records the model version and
   checksum.
6. **Review** in the viewer: window/level, zoom, pan, invert, presets, cursor values,
   CAM heatmap with opacity, floor and colormap, side-by-side comparison.
7. **Record and sign** the clinician review (impression, AI concordance, findings,
   recommendation). Signing requires the password and finalizes the examination;
   amendments create a new version and keep the signed one.
8. **Report**: print / save as PDF, export results as CSV, export annotated images.

Every consequential action is written to a hash-chained, tamper-evident audit log that
administrators can search, export and verify.

## Architecture

```
React + TanStack Router/Query (webview)          Rust (Tauri 1)
  screens ── typed API client ──invoke──▶  commands: session + role check + audit
                       ◀──events──           ├─ patients, exams, reviews (SQLite)
  canvas viewer ◀── neuroscan:// frames ──   ├─ imaging: PNG/JPEG/DICOM decode, import
                                             └─ ai: manifest → preprocess → ONNX Runtime
                                                  → postprocess + CAM (worker thread)
```

- `apps/desktop/src-tauri/src` — backend: `db` (migrations), `auth`, `audit`,
  `patients`, `exams`, `imaging`, `ai`, `analysis`, `reviews`, `commands`, `protocol`.
- `apps/desktop/src` — interface: `lib/api` (contract types, client, queries, events),
  `lib/viewer`, `components/ui` (design system), `screens/*`.
- `ml/` — export tools for the trained model.
- `docs/ai/model-integration.md` — **how to plug in the trained model.**

## AI model

The repository contains no trained model. Without one, AI analysis is disabled and every
screen says so; nothing is simulated. To enable it, export the trained checkpoint with
`ml/export_onnx.py` and install the resulting folder (Settings › AI model › Choose model
folder, or `%APPDATA%\com.neuroscan.app\models`). It is validated (manifest, checksum,
ONNX Runtime session, tensor signature, self-test) before use. See
[`docs/ai/model-integration.md`](docs/ai/model-integration.md).

## Development

Requirements: Node 22+, pnpm, Rust stable (MSVC), WebView2.

```bash
pnpm install
pnpm tauri:dev          # desktop app with hot reload
pnpm typecheck && pnpm lint && pnpm test
cd apps/desktop/src-tauri && cargo test && cargo clippy --all-targets -- -D warnings
pnpm tauri:build        # NSIS / MSI installers
```

`NEUROSCAN_DATA_DIR` overrides the data folder (database, images, models), useful for a
throwaway test database. The first Rust build is memory-hungry; on 8 GB machines use
`cargo build -j 1`.

## Data and privacy

All data stays on the workstation: SQLite database and image store in the data folder,
no network access at runtime, no telemetry. The application's sign-in protects the
interface, not the files: restrict file-system access to the data folder and include it
in backups.

## Dataset attribution

The screening model is trained on Br35H (Ahmed Hamada; record licence "Data files ©
Original Authors") and the Brain Tumor MRI dataset (Masoud Nickparvar; CC BY 4.0).
