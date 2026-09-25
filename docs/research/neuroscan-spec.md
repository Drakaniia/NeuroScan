# NeuroScan — MRI-Based Brain Tumor Screening App (Specification)

**Status:** Draft v3 — v2 corrected against live machine + primary-source verification on 2026-09-04; interview decisions + resolved questions (D1–D5) preserved
**Date:** 2026-09-04 (v3) · 2026-09-03 (v2)
**Short name:** neuroscan

---

## 1. Executive Summary

**NeuroScan** is a Windows desktop application (Tauri 2 + Rust backend, React + TypeScript frontend) that performs **binary brain-tumor screening** on MRI images with a Convolutional Neural Network. A user drops in a single scan or a folder of scans; NeuroScan answers **"tumor present vs. no tumor"** with a confidence score and a **gradient-free CAM heatmap** showing which image regions drove the decision. The model is trained in Python (PyTorch), exported to **ONNX**, and runs entirely locally inside the app via the Rust `ort` (ONNX Runtime) bindings — no Python, no cloud, no network at inference time.

Positioning (per user): **an assistive triage tool that makes screening and identification much faster than fully manual review — NOT a replacement for a clinician and not a medical device.** The UI carries a visible disclaimer.

The repo is currently empty except for `Readme.md` (which contains only the product title and the words "tauri desktop app"). Everything below is greenfield.

---

## 2. Interview Decision Log

Answers gathered via structured interview rounds. User-selected items are marked **[choice]**; interpretation notes are marked *(note)*.

### 2.1 Architecture & model (Round 1)

| # | Question | Decision |
|---|----------|----------|
| 1 | ML runtime inside the app | **[choice] Native Rust + ONNX Runtime** — train in Python, export to ONNX, infer in Rust via the `ort` crate. No Python on end-user machines; single clean installer. |
| 2 | Classification task | **[choice] Binary: tumor vs. no tumor.** Architecture must stay extensible toward 4-class (glioma / meningioma / pituitary / no-tumor) later. |
| 3 | Where to train / dataset sourcing | **[choice] All of the above, flexibly:** a local Python training pipeline AND a Colab notebook path AND fine-tuning from pre-trained backbones (transfer learning). *(note: "i think all options, we can run locally on python and run in collab, or reuse pre-trained model")* |
| 4 | Frontend framework | **[choice] React + TypeScript** (Vite-based, per Tauri conventions). |

### 2.2 Product surface (Round 2)

| # | Question | Decision |
|---|----------|----------|
| 5 | Input formats | **[choice] PNG/JPG first, DICOM later** — but design the file-decoding layer as an abstraction so DICOM support can be added without rework. |
| 6 | Screening workflow | **[choice] Both single-image and batch folder screening.** |
| 7 | Results view | **[choice] Heatmap overlay + per-image log/history** — verdict, probability, gradient-free CAM heatmap, and a browsable history of screenings. |
| 8 | Export | **[choice] CSV + per-image annotated copies** — a CSV of all results plus saved images with the heatmap burned in. |

### 2.3 Engineering constraints (Round 3)

| # | Question | Decision |
|---|----------|----------|
| 9 | Target platforms | **[choice] Windows only for now** — code stays portable; bundling targets NSIS/MSI. |
| 10 | Datasets | **[choice] Both Br35H and Kaggle "Brain Tumor MRI"** — pinned to canonical sources and merged for the shipped model (§7.1, §13 D2/D5). *(note: the canonical Kaggle set is 4-class, not binary — v1 collapses it to binary while keeping fine labels. Provenance = established public datasets; user trusts them and wants no elaborate QA subsystem)* |
| 11 | Training hardware / model size | **[choice — revised 2026-09-04] Colab GPU is the primary training host; the dev machine is CPU-only.** *(The v2 answer assumed an NVIDIA GPU on the dev machine — verified absent, Intel UHD iGPU only; user confirmed the revision.)* Full fine-tunes of pre-trained backbones (ResNet / EfficientNet class, ~10–50 MB ONNX) run on a Colab GPU via the notebook; the local CPU runs the small fallback CNN, evaluation, and parity checks. No hard bundling size constraint stated. |
| 12 | First milestone scope | **[choice] Full pipeline in one go** — the spec below is for the complete usable app (batch UI, heatmaps, history, exports included), not an incremental thin slice. |

### 2.4 Quality & positioning (Round 4)

| # | Question | Decision |
|---|----------|----------|
| 13 | Acceptance bar | **[choice] ≥ 95% accuracy on the held-out test set.** |
| 14 | Data QA depth | **[choice] Light/no elaborate QA.** Reputable public sources; standard stratified splits and cheap integrity checks inside the training pipeline only. *(note: reconcile with #10 — provenance matters, automated QA ceremony does not)* |
| 15 | History persistence | **[choice] Persist to disk** — history survives app restarts, browsable, exportable to CSV. |
| 16 | Legal / ethical positioning | **[choice] Assistive tool.** "Not a complete replacement — makes screening/identification much faster than manual." UI + README disclaimer: not a medical device, not for diagnosis; a clinician makes final calls. |

---

## 3. Environment (verified on the dev machine)

| Component | Version | Notes |
|-----------|---------|-------|
| OS | Windows (win32, Git Bash) | Primary dev + target platform |
| CPU | 12th Gen Intel Core i5-12450H | 8 logical cores |
| RAM | 8 GB (7.7 GB usable) | Bounds batch processing (§8.1, §9, §14) |
| Disk | 113 GB free on C: | Datasets ≈ 115 MB raw archives + processed copies |
| GPU | **None (no NVIDIA)** — Intel UHD integrated only | `nvidia-smi` not found → **no CUDA training locally**; Colab GPU is the training host (§2.3 #11) |
| Node / npm | v24.12.0 / 11.15.0 | For frontend + Tauri CLI |
| Rust / cargo | 1.99.0-nightly (active, MSVC) | **Stable 1.88.0 (MSVC + GNU) also installed** — app builds pin stable (§12.3) |
| Python | 3.14.2 (pip 26.1.2) | System interpreter; torch **2.12.0+cpu** installed + importable (§12.2) |
| uv | 0.11.13 | Training env manager |
| Git | 2.52.0.windows.1 | Repo not yet initialized (`git init` needed) |
| Kaggle access | No `kaggle.json`, no `KAGGLE_*` env vars | Not required — anonymous public-archive downloads verified working (§7.1) |

*Every row re-verified by direct command on 2026-09-04. v2's "GPU: NVIDIA CUDA (present)" row was factually wrong and has been removed.*

---

## 4. Scope

### 4.1 In scope (v1)

- Repo bootstrap: `git init`, layout, `.gitignore`, README, workspace tooling.
- Python ML pipeline (`ml/`):
  - Data acquisition scripts: Br35H and Kaggle "Brain Tumor MRI", both via the **direct no-auth archive download** (Kaggle API token optional, not required).
  - Light integrity/stratified-split step inside training flow.
  - Config-driven PyTorch training: fine-tune pre-trained backbone (ResNet18/34 or EfficientNet-B0) as the primary path (run on a **Colab GPU**); small custom CNN included as a CPU-trainable fallback. CUDA is used when present but never assumed (§2.3 #11).
  - Evaluation: held-out accuracy, ROC AUC, confusion matrix, per-class precision/recall, F1, threshold analysis.
  - ONNX export producing a stable inference contract (see §7.4) that the Rust side consumes.
  - A Colab notebook running the same pipeline on a cloud GPU — **the primary host for full fine-tunes** (§2.3 #11).
- Tauri app (`app/`):
  - Single-image screening: open/drag-drop → verdict + confidence + heatmap.
  - Batch folder screening with progress and a results grid.
  - Session history persisted to disk, browsable across restarts.
  - Export: CSV summary + per-image annotated (heatmap-burned) copies.
  - Disclaimer copy in UI; Windows installer packaging (NSIS/MSI).
- Cross-check: Python (ONNX Runtime) vs Rust (`ort`) inference parity test on sample images.

### 4.2 Out of scope (v1, tracked for later)

- DICOM parsing (design seam only).
- 4-class tumor-typing (design seam only).
- macOS/Linux builds, code signing, auto-update, multi-instance handling.
- Anything resembling diagnosis or clinical deployment.

---

## 5. Architecture

```
┌──────────────────────────── Tauri app (app/) ───────────────────────────┐
│  React + TS frontend (WebView2)         Rust backend (src-tauri)        │
│  ┌──────────────────────────┐           ┌────────────────────────────┐  │
│  │ Screening UI             │  invoke   │ Commands:                  │  │
│  │  • drop/open single      │ ────────► │ classify_image             │  │
│  │  • batch folder + grid   │  events   │ classify_batch (progress)  │  │
│  │  • heatmap overlay       │ ◄──────── │ history load/append/clear  │  │
│  │  • history panel         │           │ export_csv / export_images │  │
│  │  • disclaimer            │           ├────────────────────────────┤  │
│  └──────────────────────────┘           │ Inference core (ort):      │  │
│                                          │  preprocess → ONNX run →   │  │
│                                          │  softmax + CAM heatmap     │
│                                          │  → overlay via image crate │
│                                          │  persistence: app-data JSON│
│                                          └────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
              ▲ model bundled as Tauri resource (models/neuroscan.onnx)
┌──────────────────────────── Python pipeline (ml/) ──────────────────────┐
│  download_data → verify/split → train (Colab GPU; local CPU fallback)   │
│       → evaluate (≥95% test acc) → export_onnx ───► models/*.onnx       │
│       → colab notebook mirrors the same path                            │
└──────────────────────────────────────────────────────────────────────────┘
```

Key properties:

- **Local-only inference.** The ONNX model ships inside the installer; no network calls at runtime.
- **Single inference core, two validation surfaces.** The Rust side is the only runtime path; the Python side exists to train and to verify parity during development.

---

## 6. Proposed Repository Layout

```
neuroscan/
├─ Readme.md                 # (exists) → expand into real project readme
├─ neuroscan-spec.md         # this file
├─ .gitignore                # data/, models/ outputs, node_modules, target, venvs
├─ ml/                       # Python ML pipeline
│  ├─ pyproject.toml         # deps pinned (torch, torchvision, onnx, onnxruntime, ...
│  ├─ download_data.py       # br35h + kaggle (direct no-auth download)
│  ├─ verify_split.py        # light integrity + stratified train/val/test split
│  ├─ train.py               # config-driven; fine-tune backbone (Colab/CPU)
│  ├─ evaluate.py            # accuracy/AUC/confusion/precision-recall/F1/threshold report
│  ├─ export_onnx.py         # freeze BN, export logits + final feature maps
│  ├─ parity_check.py        # python onnxruntime vs expected outputs
│  └─ colab_neuroscan.ipynb  # cloud-GPU mirror of the pipeline
├─ models/                   # gitignored; neuroscan.onnx + run-config.json
├─ data/                     # gitignored; raw + processed datasets
└─ app/                      # Tauri workspace
   ├─ package.json           # npm; react-ts via create-tauri-app conventions
   ├─ src/                   # React frontend (screens listed in §9)
   ├─ src-tauri/
   │  ├─ src/                # Rust: commands, inference, heatmap, history, export
   │  ├─ Cargo.toml
   │  ├─ tauri.conf.json     # productName "NeuroScan", Windows NSIS/MSI bundling
   │  └─ icons/ …
```

*(Layout is a proposal — finalize at scaffold time; nothing is created yet.)*

---

## 7. ML Pipeline Specification (`ml/`)

### 7.1 Datasets

| Source | Pinned identifier | Access | Contents | Role |
|--------|-------------------|--------|----------|------|
| **Br35H** | Kaggle `ahmedhamada0/brain-tumor-detection` — **license: "Data files © Original Authors"** (the record's own string; **not** CC BY 4.0 — corrected 2026-09-22) | **Direct archive download, no auth — verified 2026-09-04** (anonymous GET → HTTP 200, zip = 57,032,704 B) | **3,060 images in three folders** (`yes`, `no`, `pred`) per the record; the labeled binary subset is 1,500 `yes` (tumor) / 1,500 `no` (no tumor) — balanced. `pred` is unlabeled and unused | Primary binary source |
| **Kaggle "Brain Tumor MRI"** | Kaggle `masoudnickparvar/brain-tumor-mri-dataset` — **license: Attribution 4.0 International (CC BY 4.0)** | **Direct archive download, no auth — verified 2026-09-04** (zip = 58,867,712 B — **re-measure: recorded before the version-2 record was examined, see note below**); Kaggle API token optional, not required | **Version 2** per the record (2026-02-13): **7,200 JPEG/PNG MRI images, 4 classes, balanced** — `Training/` = 1,400 per class (5,600), `Testing/` = 400 per class (1,600) — with duplicates removed and train/test overlap eliminated by the uploader. Earlier publications describe the earlier set of **7,023** images (`Training/` = 5,712 with counts 1,321 / 1,339 / 1,457 / 1,595, `Testing/` = 1,311). **Its `no_tumor` class is sourced from Br35H** — overlap hazard (§13 D2/D5) | Secondary; canonical ~7k set, collapsed to binary |

- User considers both sources **established/public/trusted** — provenance requirement satisfied by these canonical datasets (no elaborate QA wanted).
- **Licensing & attribution (corrected 2026-09-22):** the two sources carry **different** licences and the earlier "both are CC BY 4.0" claim is **retracted**. The Brain Tumor MRI dataset is **Attribution 4.0 International (CC BY 4.0)**; Br35H is **not** CC-licensed — its record's licence string is **"Data files © Original Authors"**, which still requires attribution but grants no CC licence. Attribution is mandatory: names, licences, and URLs are recorded in `data/processed/manifest.json` and credited in the README and the app's About panel, crediting **Ahmed Hamada** (Br35H) and **Masoud Nickparvar** (Brain Tumor MRI). Do not describe Br35H as CC BY 4.0 anywhere in the app, the README, or the thesis.
- **Download path (verified):** both archives download with **zero authentication** via `GET https://www.kaggle.com/api/v1/datasets/download/{owner}/{slug}` (tested live on 2026-09-04; byte sizes in the table). `download_data.py` uses that URL, checks the downloaded byte size against the recorded value, tests zip integrity before extraction, and retries once on transient failure. A Kaggle API token is supported but **not required**. *(v2 said Br35H needed no auth but masoud needed a token — both halves were wrong; Kaggle now serves public archives anonymously.)* **Recorded byte sizes are placeholders until re-measured:** the masoud figure of 58,867,712 B was captured before the version-2 record was examined, and that record reports about 167.8 MB of image files for version 2, so the expected size in `download_data.py` must be re-measured on the first successful download rather than trusted.
- **Vendor pre-split is ignored:** masoud's archive ships `Training/` (5,600 images in version 2) and `Testing/` (1,600), but the pipeline **merges both folders and re-splits itself** (seeded, stratified, after dedupe). Inheriting the vendor split would bake in their fold boundaries and muddle dedupe bookkeeping. The counts the study reports for its own processed set come from `data/processed/manifest.json` at run time, not from any published figure.
- `download_data.py` works with either source alone via a `--sources` flag. Merged binary dataset built to a common layout: `data/processed/{train,val,test}/{0_no_tumor,1_tumor}/`.
- **Fine labels kept:** each source's original 4-class (or Br35H binary) label is recorded in a manifest (`data/processed/manifest.json`) so the future 4-class path (§4.2) reuses the same downloads.
- **Exact-duplicate removal is mandatory:** before splitting, images are content-hashed (sha256 over decoded pixels) across the union and duplicates dropped (masoudnickparvar's `no_tumor` overlaps Br35H's `no`; without dedupe, identical images straddle train/test and leak into the ≥95% metric). Content-hash only — near-duplicate analysis stays out of scope.
- **Dedupe bookkeeping:** `manifest.json` stores, per unique image: sha256, the contributing source(s) + original fine label(s) (provenance list), and the surviving binary label. Per-source evaluation (§7.3) attributes each image to **every** source that contributed it, so a weak source cannot hide behind dedupe.
- **Binary collapse for v1:** glioma / meningioma / pituitary → `tumor`; `no_tumor` unchanged. Collapsed balance ≈ 70/30 tumor-heavy → class-balanced sampling + weighted loss in training (§13 D5).
- **Light verification (per interview):** count + class-balance summary printed, every file decodes (any per-file failure is listed and fails the step — zero tolerated on the training side), stratified split is seeded/deterministic, and the test set is **never** touched during training (no leakage). No elaborate QA tooling.

### 7.2 Model

- **Primary:** fine-tuned pre-trained backbone — ResNet18/ResNet34 or EfficientNet-B0 (ImageNet weights), global pooling head → 2 logits. **Trained on a Colab GPU** (no local NVIDIA GPU — §2.3 #11); the training script auto-detects CUDA and still runs on CPU for smoke runs.
- **Fallback:** small custom CNN (a few conv blocks, ~1–5 MB ONNX) that trains on this machine's CPU in minutes — useful for the parity test and low-resource machines.
- Config-driven via a YAML/JSON run-config (`data_augmentation`, `epochs`, `lr`, `batch_size`, `image_size=224`, `seed`). Full determinism: fixed seeds + saved config + checkpoint versioning.
- Input convention: 224×224 RGB, channel-wise normalization matching the backbone's pre-trained statistics. **Decode rules (identical on both sides):** 1-channel/grayscale → replicated to RGB; 4-channel → alpha dropped; EXIF orientation applied when present; a decode failure surfaces as a per-file error, never a silent skip. Resize is bilinear (torchvision `Resize` with default antialias vs. the `image` crate's `Triangle`). The **constants** (mean/std/size/channel order) are byte-identical in one documented place mirrored into both codebases; **tensor values** are compared with a documented tolerance via the golden-tensor parity test (M4) — exact pixel equality across two independent resamplers is not promised (§14.2).

### 7.3 Evaluation & acceptance

- Metrics: accuracy, ROC AUC, confusion matrix, per-class precision/recall, F1 — reported overall **and per source** (Br35H vs. Kaggle) so a weak source cannot hide (§13 D5).
- **Decision threshold τ:** chosen on the **validation** set (never the test set) to maximize Youden's J subject to **sensitivity ≥ 0.95** when attainable (§13 D3); τ is recorded in `run-config.json` and ships with the model.
- **Acceptance gate: ≥ 95% accuracy on the held-out test set.** If not met with the default backbone, iterate on augmentation/architecture; document the honest numbers either way.

### 7.4 ONNX export contract (the interface between ML and app)

The exported `neuroscan.onnx` must expose **four outputs** (single forward pass):

1. `logits: [1, 2]` — for the verdict + probability (softmax in Rust).
2. `features: [1, C, H, W]` — the final convolutional feature map **before global pooling**, needed for the heatmap (§8.3).
3. `head_w: [2, C]` — the head's final `Linear` weight matrix, emitted directly from the module at export time; lets Rust compute the CAM heatmap with **zero extra forward passes** (§13 D1).
4. `head_b: [2]` — the head's final `Linear` bias (exported for completeness and parity checks).

*(Exact output naming/shapes are frozen in a small contract doc next to `export_onnx.py`; Rust and Python share it.)*

`export_onnx.py` **asserts the CAM precondition**: the classification head must be `GlobalAvgPool → (dropout) → Linear` with no convolution after pooling, so `head_w[c]` is exactly class `c`'s CAM weight vector. Torchvision ResNet/EfficientNet heads satisfy this; export fails loudly otherwise.

Other export rules:

- Opset ≥ 17; model frozen (BatchNorm folded), `torch.onnx.export` with fixed input shape.
- Bundled metadata in `models/run-config.json`: input size, mean/std, class order `["no_tumor","tumor"]`, model id + commit/date — the app reads it to configure preprocessing.
- FP32 default; INT8/FP16 quantization is a possible later size optimization (keep a `--quantize` flag in mind, out of v1 critical path).

---

## 8. App Specification (`app/`)

### 8.1 Rust backend (src-tauri)

Crates: `tauri` 2.x, `tauri-plugin-dialog`, `tauri-plugin-fs` (scoped) or `rfd`/`image`-side IO, `ort` (ONNX Runtime bindings), `image` (decode PNG/JPG, resize, overlay), `serde`/`serde_json`, `ndarray` (ort tensor IO), `directories` or Tauri app-data path.

Invoke commands (all async; batch reports progress via Tauri events):

| Command | Input | Output |
|---------|-------|--------|
| `classify_image(path)` | one image file | `{ verdict, probability, threshold, elapsed_ms }` + heatmap data (see §8.3) |
| `classify_batch(dir)` | folder path | event stream `{ done, total, current }`; final `Vec<ResultEntry>` |
| `load_history()` / `append_history(entry)` / `clear_history()` | — | persisted history |
| `export_csv(entries, dir)` | result entries + target dir | writes `neuroscan_results.csv` |
| `export_annotated(entry, out_dir)` | one entry | writes original + heatmap-burned PNG |

Lifecycle: model + run-config loaded **once** at app start from the bundled resource (`models/`); `ort` session cached in an `Arc<Session>` (`ort` sessions are `Send + Sync` on a thread-safe env — verify at impl time); single-file preprocessing pipeline shared by single and batch paths.

Runtime details / edge cases:
- **Resource resolution:** the model and `onnxruntime.dll` are located via Tauri's path resolver (`resource_dir()`), **never** `std::env::current_dir()` — current-dir lookups break packaged apps. The `ort` crate's `download-binaries` fetches ONNX Runtime at build time; the DLL ships as an extra resource beside the exe in the NSIS/MSI output.
- **Batch robustness:** folder scans **recurse** into subdirectories (per-patient layouts), skip hidden/system dirs, whitelist `.png/.jpg/.jpeg`, and cap per-file size (e.g. 64 MB). A file that fails to decode (truncated, zero-byte, wrong type) yields an `error`-status result row and the scan **continues** — one bad file never aborts a batch. Single-mode returns a typed error for unsupported/missing files.
- **Memory guard (8 GB machine, §9):** images are decoded one at a time, resized to 224² immediately, and the full-resolution copy is dropped before the next file — no batch ever holds all decoded images. Batch classification runs on a blocking worker pool so the UI stays responsive; a single-flight guard prevents overlapping heavy runs.
- **History writes:** one `Mutex`-guarded writer; JSON saved **atomically** (temp file + rename) so a crash mid-write cannot corrupt `history.json` (§8.5).

### 8.2 Preprocessing (Rust)

Mirror training exactly: decode (grayscale → RGB, alpha dropped, EXIF applied) → resize (image crate, `Triangle` ≈ bilinear) → 224×224 RGB → divide by 255 → per-channel `(x − mean) / std` → contiguous `f32` NHWC→NCHW tensor → `ort` run. Unit-tested against golden tensors produced by the Python parity script **with a documented per-element tolerance** (resampler differences make exact equality unrealistic — §14.2).

### 8.3 Heatmap (CAM, gradient-free)

ONNX inference has no backprop, so the heatmap uses the classical gradient-free **CAM** (Zhou et al. 2016), enabled by the export contract (§7.4): because the head is `GAP → Linear`, class `c`'s CAM weight vector is exactly `head_w[c]`. Per image, in Rust:

1. Run the model once → `logits`, `features [C, H, W]`, `head_w`.
2. For the predicted class `c`, compute `M_c = ReLU( Σ_k head_w[c][k] · features[k])` elementwise over the feature map.
3. Resize `M_c` to input resolution (bilinear, matching preprocessing), min–max normalize, apply a colormap (e.g. inferno over the grayscale MRI, opacity from the UI slider), and composite — shown live in the UI and burned into exported copies.
4. **Guards:** if `M_c` is constant (max == min, e.g. a degenerate/uniform input) min–max normalization would divide by zero — skip the overlay and show the uncolored image instead of crashing. Feature maps smaller than the input are upscaled through the same bilinear path as preprocessing.

- **Cost:** the heatmap is effectively free — it reuses the single forward pass (no extra runs). Single-image end-to-end target stays < 1 s on CPU.
- **Fallback:** the §7.4 export-time assertion blocks any non-GAP head before it can ship; should a non-CAM-compatible head ever be genuinely required, Score-CAM with channel sampling capped at 128 masked passes is the documented alternative. UI/export code stays variant-agnostic.
- **Validation (M5):** render heatmaps for ≥ 10 known-tumor images from the test set and visually confirm hotspots localize the lesion region; screenshots + notes go in the repo (§13 D1).

### 8.4 Frontend (React + TS)

Screens/views:

1. **Single screen** — drop zone or Open dialog; large image preview; verdict pill (color-coded) + probability bar with a marker at the screening threshold τ; heatmap toggle/opacity slider overlay; "Add to history" automatic.
2. **Batch screen** — pick folder; progress bar + per-file status list during scan; results grid (thumbnail, filename, verdict, probability) sortable/filterable; click row → detail view w/ heatmap.
3. **History screen** — persisted log grouped by session/date, search, re-open any entry's detail view, select rows → Export CSV / Export annotated images (native folder picker for destination).
4. **About / disclaimer** — persistent, unobtrusive footer bar on all screens: *"NeuroScan is a research/educational screening aid. It is not a medical device and does not provide a diagnosis. A qualified clinician makes final decisions."*

Styling: clean clinical light theme; decision to use Tailwind CSS or hand-rolled CSS made at scaffold (default: Tailwind for speed). English-only UI in v1.

Handling of ambiguous outputs:
- **Near-threshold band:** probabilities within ±0.05 of τ (band width in `run-config.json`) render as **"low confidence — review manually"** (amber) instead of a clean verdict, so borderline images are never presented as decisive.
- **Out-of-domain inputs:** the model is brain-MRI-only; a different modality (X-ray, CT, photo) can still score confidently. Every result carries the one-line reminder "model trained on brain MRI only" plus the persistent disclaimer (§8.4 About); no hard domain classifier is attempted in v1.

### 8.5 History persistence

- Storage: single JSON file in the Tauri app-data directory (`neuroscan/history.json`). Entry schema: `{ id, timestamp, source_path, file_name, verdict, probability, threshold, model_id, model_version }` — the raw **`probability` (0–1) is stored, not just the verdict**, so thresholds stay re-derivable (§13 D3).
- **Growth policy:** capped at **500 entries**, oldest evicted first (FIFO); explicit Clear History always available. *(SQLite revisited only if the log outgrows ~a few thousand entries.)*
- **Atomicity:** every write goes temp-file → rename; a crash can lose at most the in-flight entry, never corrupt the store. Batch runs append one entry at a time through the same single-writer path (§8.1).
- **Heatmap previews are not persisted.** The detail view recomputes the heatmap on demand only when (a) the source file still exists and (b) the entry's `model_id` matches the currently bundled model; otherwise the entry renders verdict/probability with a "source not found" or "rendered by a different model version" notice instead of a heatmap. Recomputation is a single ~free forward pass (§8.3).
- Single screen, batch screen, and manual scans all append through one code path (`append_history`).

### 8.6 Export format

- **CSV:** `file_name, source_path, verdict, probability, threshold, model_id, model_version, timestamp`. Written **UTF-8 with BOM** (so Excel opens it correctly) and RFC 4180 quoting (Windows paths contain commas/backslashes; newlines are escaped).
- **Annotated copies:** per entry, PNG of original + PNG with heatmap overlay burned in, written to a user-chosen folder. Output filenames are sanitized for Windows (`<>:"/\|?*` and reserved names like `CON`); the true source name stays in the CSV/history.

---

## 9. Non-Functional Requirements

- **Offline:** zero network access during screening; all processing local.
- **Speed:** single-image verdict < ~1 s on this machine (CPU inference); batch throughput reported live; heatmap rendering included in budget.
- **Memory:** peak RSS target < ~2 GB (8 GB machine) — one image in flight at a time, streaming batch decode (§8.1).
- **Resilience:** a corrupt/unreadable/unsupported file yields a per-file error, never a crash or aborted batch; a failed export or history write reports an error and leaves existing data intact.
- **Privacy:** scans never leave the machine; no telemetry.
- **Safety copy:** disclaimer present and readable in UI + README (positioning per §2.4).
- **Determinism:** seeded pipeline; versioned model + config metadata shown in UI so results are reproducible.
- **Bundle size:** model ≤ ~50 MB target; app stays small (Tauri baseline).

---

## 10. Acceptance Criteria (v1 complete)

1. `git init` repo; layout, `.gitignore`, and README (title + description + quickstart) in place; `neuroscan-spec.md` committed.
2. `ml/` pipeline runs end-to-end: both archives download anonymously (verified) → dedupe + stratified split → trained (**primary: full fine-tune on a Colab GPU; local CPU runs the fallback CNN and a smoke run**) → **≥ 95% test accuracy** → `neuroscan.onnx` + `run-config.json` produced.
3. Python (onnxruntime) vs Rust (`ort`) produce matching verdicts within tolerance on ≥ 20 sample images (parity test green).
4. `app/` builds and runs on Windows in dev mode and packages as an installer (NSIS).
5. Single-image workflow works: open/drop → verdict + confidence + heatmap overlay shown.
6. Batch workflow works: folder scan with live progress → results grid → row detail with heatmap.
7. History persists across app restarts and is browsable/clearable.
8. Export produces a correct CSV and annotated PNG copies.
9. Disclaimer text visible in the app; README states the non-medical-device positioning.

---

## 11. Roadmap / Milestones

| # | Milestone | Exit criteria |
|---|-----------|---------------|
| M1 | Repo bootstrap | Layout, `.gitignore`, README, spec committed |
| M2 | Data + light split | `download_data.py` (anonymous, integrity-checked downloads) + `verify_split.py` produce deduped, stratified processed splits |
| M3 | Train & export | Full fine-tune on Colab GPU (`train.py` / notebook) hits ≥95% test acc; `evaluate.py` report; `export_onnx.py` outputs the contract model; local CPU fallback run documented |
| M4 | App scaffold + inference | Tauri+React app runs; `classify_image` wired end-to-end w/ bundled model; parity check green |
| M5 | Heatmap | CAM heatmap (exported head weights) overlay visible on single images; visual sanity check on ≥10 known-tumor test images |
| M6 | Batch + history + export | Batch grid w/ progress; persisted history; CSV + annotated exports |
| M7 | Packaging polish | Windows installer; disclaimer pass; README finalized |

User chose "full pipeline in one go" (§2.3) — milestones are for tracking, not staged deliveries.

---

## 12. Assumptions Made (flag if wrong)

1. Package manager: **npm** (present; no signal otherwise).
2. Training env: **uv-managed virtualenv; Python 3.14 is supported** — PyTorch has officially supported Python 3.10–3.14 on Windows since torch 2.10, and this machine already runs torch **2.12.0+cpu** on Python 3.14.2 (verified by import). No CUDA wheels are needed locally (no NVIDIA GPU); the Colab notebook runs on Colab's own runtime + GPU. System Python remains untouched.
3. Rust **stable toolchain** for the app (reproducible builds): stable 1.88.0 (MSVC + GNU) is already installed; nightly 1.99.0 may stay the shell default while app `Cargo` files explicitly pin stable.
4. Model input 224×224, `["no_tumor", "tumor"]` class order — frozen in the contract.
5. Export destination for CSV/annotations chosen by the user at export time (native folder dialog); no fixed default directory.
6. No code signing, no auto-updater, no multi-instance handling in v1.
7. "Heatmap burned into copies" = heatmap overlay composited over the original grayscale MRI as a PNG.
8. React app scaffolded with Vite + `create-tauri-app` conventions; Tailwind default unless user objects.

## 13. Resolved Decisions (formerly Open Questions)

Each former open question is now a firm decision with rationale. Ripple effects are already applied to the cited sections.

**D1 — Heatmap: classical CAM with exported head weights (zero extra forward passes).** *Was:* Score-CAM variant + cost budget. *Decision:* gradient-free CAM (Zhou et al. 2016) computed in Rust from the `head_w` / `features` outputs of the export contract (§7.4); the GAP→Linear head makes `head_w[c]` exactly the class-`c` CAM weights. *Rationale:* ONNX inference has no backprop, and CAM needs none — only the head weights, which are free to export at Python time. One forward pass per image, deterministic, no channel-sampling approximation, well within the < 1 s budget. Score-CAM (≤ 128 masked passes) is the documented fallback only for a hypothetical non-GAP head, and the §7.4 export assertion makes such a head unshippable by mistake. Validated qualitatively at M5 (§8.3).

**D2 — Kaggle source pinned: `masoudnickparvar/brain-tumor-mri-dataset`.** *Was:* ambiguous "Brain Tumor MRI" upload. *Decision:* the canonical 4-class brain MRI set, read from its own record on 2026-09-22 as **version 2 — 7,200 images, balanced at 1,400 training and 400 testing per class, duplicates removed and train/test overlap eliminated**. Earlier publications describe the earlier **7,023-image** set (per-class 1,621 / 1,645 / 2,000 / 1,757; split 4,522 / 1,186 / 1,311), and the often-quoted 1,321 / 1,339 / 1,457 / 1,595 counts describe the older `Training/` folder; the study therefore cites both and takes its own processed counts from `data/processed/manifest.json` (§7.1). v1 **collapses the three tumor types → `tumor`** and keeps fine labels in a manifest for the 4-class path (§7.1). *Rationale:* this is the set researchers mean by "Brain Tumor MRI"; the binary look-alikes (≈250–3k images) are too small or noisy to beat Br35H. Br35H is pinned as `ahmedhamada0/brain-tumor-detection` (1,500 labeled tumor / 1,500 labeled no-tumor within a 3,060-image, three-folder archive per its record).

**D3 — Decision threshold: tuned on validation, sensitivity-first.** *Was:* flat 0.5 vs. tuned operating point. *Decision:* choose τ on the **validation** set (never the test set) to maximize Youden's J subject to **sensitivity ≥ 0.95** when attainable; if unattainable, maximize J and log the shortfall. τ ships in `run-config.json`; the UI probability bar marks τ and states above/below threshold; exports and history store raw `probability` plus τ (§7.3, §8.4, §8.6). *Rationale:* a triage aid must not miss tumors — false negatives are the expensive error — and storing raw probability keeps every result auditable if τ is ever changed.

**D4 — History: 500-entry FIFO cap, heatmaps recomputed on demand.** *Was:* growth policy + heatmap caching. *Decision:* cap history at 500 entries (oldest evicted first) in one `history.json`; **no heatmap caching on disk**; the detail view recomputes a heatmap only when the source file exists **and** the entry's `model_id` matches the bundled model, otherwise shows a notice (§8.5). *Rationale:* keeps app-data small and loads fast, eliminates cache-invalidation bugs, and prevents showing a heatmap produced by a different model than the recorded verdict. Recomputation is ~free (§8.3).

**D5 — Shipped-model training set: merged, deduplicated, Br35H-alone fallback.** *Was:* Br35H alone vs. merged. *Decision:* default = merged Br35H + Kaggle (collapsed) with **exact-duplicate removal by content hash before splitting** — mandatory because masoudnickparvar's `no_tumor` class was *sourced from Br35H*, so naive merging leaks identical images across train/test. The collapsed set is ~70/30 tumor-heavy → class-balanced sampling + weighted loss during training; overall **and per-source** test metrics are reported. If either source archive cannot be retrieved or the merged set underperforms Br35H alone, the documented fallback is training on Br35H alone (§7.1). *Rationale:* honors "use both datasets" while dedupe + stratification keep the ≥95% test metric honest.

## 14. Risks

1. **No local NVIDIA GPU** — full fine-tunes run on a Colab GPU. Colab sessions can be preempted/quota-limited and need network at *training* time only (the shipped app stays fully offline). Mitigation: per-epoch checkpoints saved to Google Drive, `--resume`, and the local CPU fallback CNN keep M3/M4 unblocked (§2.3 #11).
2. **Preprocessing drift between Python and Rust** silently changing predictions — mitigated by shared documented constants + a golden-tensor parity test with an explicit tolerance (M4). Pixel-exact equality across torchvision/PIL and the `image` crate is not promised; the parity suite asserts verdict + probability agreement (§7.2, §8.2).
3. **≥95% test accuracy may require iteration** (augmentation, backbone choice, threshold). If the bar is missed after reasonable effort, ship with honest documented metrics and a lower default threshold note — user sign-off required before lowering the bar.
4. **Cross-source duplication / class imbalance** — masoudnickparvar's `no_tumor` overlaps Br35H's `no` (content-hash dedupe before splitting is mandatory, §13 D5), and the collapsed set is ~70/30 tumor-heavy (balanced sampling + weighted loss + per-source test metrics, §7.1).
5. **Kaggle download flakiness / API policy drift** — anonymous downloads are verified *today*, but Kaggle may re-gate or throttle the endpoint. Mitigation: recorded expected archive sizes + zip-integrity check + retry, per-source `--sources` isolation, and a documented manual-download path in the README. No token is involved, so the pipeline never blocks on credentials.
6. Public MRI datasets contain artifacts (borders, text overlays) that can leak into features — monitor via a short qualitative review of top false positives after training.
7. **8 GB RAM / CPU-only laptop** bounds local work — batch processing streams one image at a time (RSS target < 2 GB, §8.1) and heavy fine-tunes stay off this machine (§12.2).
8. **Out-of-domain inputs** (non-MRI modalities) can score confidently — mitigated by the "brain MRI only" reminder and the near-threshold low-confidence band in the UI (§8.4), never by a claim of reliability.
9. **Dataset licensing** — the sources carry **different** licences (corrected 2026-09-22): the Brain Tumor MRI dataset is CC BY 4.0, while Br35H's record states "Data files © Original Authors". Attribution is required either way: credit Ahmed Hamada (Br35H) and Masoud Nickparvar (Brain Tumor MRI) in the README and the About panel, and record licence + URL per batch in the manifest (§7.1). No CC licence may be asserted for Br35H.

---

*Specification v3 (2026-09-04) — v2 verified against the live machine and primary sources. Corrections: GPU/training-host reality (§2.3 #11, §3), dataset access/licensing/counts (§7.1), Python 3.14 + torch support (§12.2), parity tolerance (§7.2, §8.2); edge-case hardening across §8.1–§8.6, §9, §14. No code changes yet.*

*Correction pass 2026-09-22 — §7.1, §13 D2, and Risk 9 corrected against the two datasets' own Kaggle records: Br35H's licence string is **not** CC BY 4.0, and the Brain Tumor MRI record now documents **version 2** (7,200 images, 1,400 training / 400 testing per class) rather than the 7,023-image set described in earlier publications. Recorded archive byte sizes must be re-measured at first download. Evidence recorded in `sources/verified-sources.md` (ds-01, ds-02); the chapter text that uses these figures is `CHAPTER3.md` §3.1.3 and Table 3-3.*
