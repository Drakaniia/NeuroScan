"""The NeuroScan model contract, shared by the export tools.

The desktop application loads a *model folder* containing:

* ``neuroscan.onnx`` – the network, exported with four outputs from a single
  forward pass: ``logits`` [1, K], ``features`` [1, C, h, w] (the last
  convolutional feature map before global average pooling), ``head_w`` [K, C]
  and ``head_b`` [K] (the final linear layer).
* ``run-config.json`` – the manifest written by :func:`write_manifest`.

Everything model-specific lives in the manifest; the application hard-codes
none of it. See ``docs/ai/model-integration.md`` for the full schema.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path

import torch
from torch import nn

SCHEMA_VERSION = 1
MANIFEST_FILE = "run-config.json"
MODEL_FILE = "neuroscan.onnx"
OUTPUT_NAMES = ["logits", "features", "head_w", "head_b"]

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


@dataclass
class ClassSpec:
    label: str
    display_name: str
    finding: str  # "positive" | "negative"


BINARY_CLASSES = [
    ClassSpec("no_tumor", "No tumor", "negative"),
    ClassSpec("tumor", "Tumor", "positive"),
]


@dataclass
class ManifestInfo:
    model_id: str
    name: str
    version: str
    threshold: float
    low_confidence_band: float = 0.05
    input_size: int = 224
    channels: int = 3
    mean: list[float] = field(default_factory=lambda: list(IMAGENET_MEAN))
    std: list[float] = field(default_factory=lambda: list(IMAGENET_STD))
    classes: list[ClassSpec] = field(default_factory=lambda: list(BINARY_CLASSES))
    description: str | None = None
    created: str | None = None
    training_data: str | None = None
    intended_use: str | None = None
    performance: dict | None = None
    limitations: list[str] = field(default_factory=list)
    fixture: bool = False


class CamExportWrapper(nn.Module):
    """Wraps ``backbone`` (feature extractor) and ``head`` (``nn.Linear``) so the
    exported graph emits logits, the pre-pooling feature map and the head
    parameters in one pass — the inputs to class activation mapping."""

    def __init__(self, backbone: nn.Module, head: nn.Linear):
        super().__init__()
        if not isinstance(head, nn.Linear):
            raise TypeError(
                "CAM requires the classification head to be GlobalAvgPool -> Linear; "
                f"got {type(head).__name__}."
            )
        self.backbone = backbone
        self.head = head

    def forward(self, x: torch.Tensor):
        features = self.backbone(x)
        if features.dim() != 4:
            raise ValueError("The backbone must return a [N, C, h, w] feature map.")
        pooled = features.mean(dim=(2, 3))
        logits = self.head(pooled)
        # `+ 0` keeps the parameters as computed graph outputs rather than bare
        # initializers, which every ONNX consumer accepts.
        return logits, features, self.head.weight + 0, self.head.bias + 0


def export(wrapper: CamExportWrapper, info: ManifestInfo, out_dir: Path, opset: int = 17) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    wrapper.eval()
    dummy = torch.zeros(1, info.channels, info.input_size, info.input_size)
    model_path = out_dir / MODEL_FILE
    with torch.no_grad():
        torch.onnx.export(
            wrapper,
            (dummy,),
            str(model_path),
            input_names=["input"],
            output_names=OUTPUT_NAMES,
            opset_version=opset,
            do_constant_folding=True,
            dynamo=False,
        )
    restore_output_names(model_path, OUTPUT_NAMES)
    write_manifest(info, out_dir, model_path)
    return model_path


def restore_output_names(model_path: Path, names: list[str]) -> None:
    """Constant folding turns the head parameters into initializers and drops
    their requested output names; put the contract names back."""
    import onnx

    model = onnx.load(str(model_path))
    graph = model.graph
    if len(graph.output) != len(names):
        raise SystemExit(f"Expected {len(names)} outputs, the exported graph has {len(graph.output)}.")
    for output, wanted in zip(graph.output, names):
        old = output.name
        if old == wanted:
            continue
        for node in graph.node:
            for field in (node.input, node.output):
                renamed = [wanted if name == old else name for name in field]
                del field[:]
                field.extend(renamed)
        for initializer in graph.initializer:
            if initializer.name == old:
                initializer.name = wanted
        for info in graph.value_info:
            if info.name == old:
                info.name = wanted
        output.name = wanted
    onnx.checker.check_model(model)
    onnx.save(model, str(model_path))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_manifest(info: ManifestInfo, out_dir: Path, model_path: Path) -> Path:
    manifest = {
        "schema_version": SCHEMA_VERSION,
        "model": {
            "id": info.model_id,
            "name": info.name,
            "version": info.version,
            "file": model_path.name,
            "sha256": sha256_file(model_path),
            "description": info.description,
            "created": info.created,
            "training_data": info.training_data,
            "intended_use": info.intended_use,
            "performance": info.performance,
            "limitations": info.limitations,
            "fixture": info.fixture,
        },
        "task": "classification",
        "input": {
            "name": "input",
            "layout": "NCHW",
            "width": info.input_size,
            "height": info.input_size,
            "channels": info.channels,
            "resize": "bilinear",
            "scale": 1.0 / 255.0,
            "mean": info.mean,
            "std": info.std,
        },
        "output": {
            "scores": "logits",
            "activation": "softmax",
            "classes": [
                {"label": c.label, "display_name": c.display_name, "finding": c.finding}
                for c in info.classes
            ],
        },
        "explainability": {"method": "cam", "features": "features", "weights": "head_w"},
        "decision": {
            "threshold": info.threshold,
            "low_confidence_band": info.low_confidence_band,
        },
        "dicom": {"voi": "file_window_or_minmax"},
    }
    path = out_dir / MANIFEST_FILE
    path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return path
