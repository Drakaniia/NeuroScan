# Integrating the trained model

NeuroScan runs AI analysis only through a **validated model folder**. Nothing in the
application is specific to one network: everything model-specific is declared in the
folder's manifest, and the application refuses to analyse — and says so — until a folder
passes every check. No result is ever simulated.

## 1. What a model folder contains

```
models/
├── run-config.json   # the manifest (schema below)
└── neuroscan.onnx    # the network named by model.file
```

The ONNX graph must expose, from **one forward pass**:

| Output (default name) | Shape | Purpose |
|---|---|---|
| `logits` | `[1, K]` | class scores (declared by `output.scores`) |
| `features` | `[1, C, h, w]` | last convolutional feature map *before* global pooling |
| `head_w` | `[K, C]` | weights of the final `Linear` layer |
| `head_b` | `[K]` | its bias (exported for parity checks; not required) |

`features` and `head_w` are optional: without an `explainability` section the model still
runs, it just produces no heatmap. With them, NeuroScan computes the classical
gradient-free class activation map `M = ReLU(Σₖ w[c][k] · fₖ)` for the predicted class.
This is only valid when the head is `GlobalAvgPool → Linear`; `ml/export_onnx.py` checks it.

## 2. Producing the folder

```bash
python -m pip install torch torchvision onnx          # once
python ml/export_onnx.py \
    --checkpoint runs/best.pt \
    --architecture resnet18 \
    --threshold 0.42          # τ chosen on the VALIDATION split
    --band 0.05 \
    --version 1.0.0 \
    --metrics runs/test_metrics.json \
    --training-data "Br35H (A. Hamada) + Brain Tumor MRI (M. Nickparvar, CC BY 4.0), deduplicated" \
    --out models/
```

The script rebuilds the torchvision model, loads the checkpoint strictly, wraps it so
the graph emits the four outputs, **verifies the wrapper reproduces the original logits**,
exports with opset 17, restores the contract output names, and writes `run-config.json`
including the SHA-256 of the ONNX file.

`--metrics` is copied verbatim into the manifest and shown in Settings › AI model as
"reported evaluation". Report exactly what was measured on the held-out test split.

## 3. Installing it

Any one of these, in order of precedence:

1. **Settings › AI model › Choose model folder…** (administrator). An explicit choice is
   authoritative: if that folder is invalid, AI stays off rather than falling back.
2. Environment variable `NEUROSCAN_MODEL_DIR` (same rule).
3. Copy the two files into the workstation model folder
   `%APPDATA%\com.neuroscan.app\models\` (shown in Settings › AI model).
4. Ship them inside the installer as a Tauri resource named `models/`.

The model is discovered and validated at start-up and on **Re-check and reload**. No code
change or rebuild is needed.

## 4. Validation (all must pass)

| # | Check | Fails when |
|---|---|---|
| 1 | Manifest found and readable | missing or not valid JSON for the schema |
| 2 | Manifest values valid | unsupported schema version, task, channels, thresholds, duplicate labels, no positive/negative class, path in `model.file` |
| 3 | Model file present | missing or empty |
| 4 | File integrity | `model.sha256` declared and different (warning if not declared) |
| 5 | ONNX Runtime session | the file is not a loadable ONNX graph |
| 6 | Input tensor | name missing, not float32, or shape incompatible with `input` |
| 7 | Output tensors | `scores` / `features` / `weights` missing or not float32 |
| 8 | Self-test inference | a forward pass on a neutral image fails or its outputs cannot be interpreted |

The report is shown in Settings › AI model and recorded in the audit log
(`model_loaded` / `model_load_failed`, with the checksum).

## 5. Manifest schema (`schema_version: 1`)

```json
{
  "schema_version": 1,
  "model": {
    "id": "neuroscan-resnet18-binary",
    "name": "NeuroScan ResNet-18 binary screening model",
    "version": "1.0.0",
    "file": "neuroscan.onnx",
    "sha256": "<64 hex characters>",
    "created": "2026-11-20",
    "description": "…",
    "intended_use": "…",
    "training_data": "…",
    "performance": { "test_accuracy": 0.962, "test_auc": 0.987, "sensitivity": 0.955 },
    "limitations": ["…"],
    "fixture": false
  },
  "task": "classification",
  "input": {
    "name": "input",
    "layout": "NCHW",
    "width": 224, "height": 224, "channels": 3,
    "resize": "bilinear",
    "scale": 0.00392156862745098,
    "mean": [0.485, 0.456, 0.406],
    "std":  [0.229, 0.224, 0.225]
  },
  "output": {
    "scores": "logits",
    "activation": "softmax",
    "classes": [
      { "label": "no_tumor", "display_name": "No tumor", "finding": "negative" },
      { "label": "tumor",    "display_name": "Tumor",    "finding": "positive" }
    ]
  },
  "explainability": { "method": "cam", "features": "features", "weights": "head_w", "features_layout": "NCHW" },
  "decision": { "threshold": 0.42, "low_confidence_band": 0.05 },
  "dicom": { "voi": "file_window_or_minmax" }
}
```

Field notes:

- `input.layout` `NCHW` or `NHWC`; `channels` 1 (luminance) or 3 (RGB); `resize`
  `bilinear` | `nearest` | `bicubic`. Preprocessing is: resize → `pixel × scale` →
  `(x − mean) / std`, per channel.
- `output.activation`: `softmax` (logits over classes), `sigmoid` (one logit, two
  classes) or `none` (scores are already probabilities).
- **Screening probability** = sum of the probabilities of every class with
  `"finding": "positive"`. A future 4-class tumour-typing model (glioma, meningioma,
  pituitary positive; no_tumor negative) therefore works without code changes.
- **Verdict**: within `threshold ± low_confidence_band` → *indeterminate*; above →
  *tumor suspected*; below → *no tumor detected*.
- `dicom.voi`: DICOM frames are rendered to 8-bit through the file's own Window
  Center/Width (falling back to the value range), or always through the value range
  (`minmax`) — choose whichever matches how the training images were exported.
- `model.fixture: true` marks a test model; every result it produces is labelled
  non-clinical in the UI, exports and reports.

## 6. What is stored with every result

Each analysis is an immutable record: probabilities per class, verdict, threshold and
band used, activation map, the model's id, version and SHA-256, the preprocessing applied
(source size, model input, DICOM window), latency, user and time. Re-analysis adds a
record; it never overwrites. If the loaded model's checksum differs from a stored result's,
the workspace marks that result as produced by a different model version.

## 7. Replacing the runtime

`src-tauri/src/ai/engine.rs` defines `InferenceEngine` (tensors in, named tensors out).
`OnnxEngine` implements it with ONNX Runtime on the CPU. A different backend (DirectML,
OpenVINO, a remote service) is another implementation of that trait; manifest handling,
pre/postprocessing, validation, storage and the UI are unchanged.

## 8. Testing the integration without the trained model

`apps/desktop/src-tauri/tests/fixtures/contract-model/` holds an **untrained** network
with random weights (`ml/make_fixture_model.py`) that implements the contract. It is used
by `cargo test` (`tests/fixture_model.rs`) to prove discovery → validation → ONNX Runtime
→ probabilities → CAM end to end, and to check that a tampered file is rejected. It is
never bundled or auto-discovered in release builds. Its outputs have no medical meaning.
