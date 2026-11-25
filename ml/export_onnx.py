"""Export a trained NeuroScan classifier to the application's model folder.

Takes a PyTorch checkpoint of a torchvision ResNet (the architecture described
in the methodology: ImageNet-initialised ResNet-18 with a two-class head) and
writes ``neuroscan.onnx`` + ``run-config.json`` — the two files the desktop
application discovers, validates and loads automatically.

The decision threshold must be the operating point chosen on the validation
split (never the test split); pass it with ``--threshold``.

Usage::

    python ml/export_onnx.py --checkpoint runs/best.pt --threshold 0.42 \
        --version 1.0.0 --out models/

    # then either copy models/ to %APPDATA%\\com.neuroscan.app\\models, or point
    # Settings → AI model → "Choose model folder" at it.

Optional evaluation metrics (``--metrics metrics.json``) are copied verbatim
into the manifest and shown in the application's model details; report them
exactly as measured.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
from pathlib import Path

import torch
from torch import nn
from torchvision import models

from neuroscan_contract import BINARY_CLASSES, CamExportWrapper, ManifestInfo, export

ARCHITECTURES = {
    "resnet18": models.resnet18,
    "resnet34": models.resnet34,
    "resnet50": models.resnet50,
}


def build(architecture: str, num_classes: int) -> nn.Module:
    model = ARCHITECTURES[architecture](weights=None)
    model.fc = nn.Linear(model.fc.in_features, num_classes)
    return model


def load_checkpoint(model: nn.Module, path: Path) -> None:
    state = torch.load(path, map_location="cpu", weights_only=True)
    if isinstance(state, dict) and isinstance(state.get("state_dict"), dict):
        state = state["state_dict"]
    elif isinstance(state, dict) and isinstance(state.get("model"), dict):
        state = state["model"]
    model.load_state_dict(state, strict=True)


def resnet_backbone(model: nn.Module) -> nn.Module:
    """Everything up to (not including) global pooling: the CAM feature map."""
    return nn.Sequential(
        model.conv1, model.bn1, model.relu, model.maxpool,
        model.layer1, model.layer2, model.layer3, model.layer4,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--checkpoint", type=Path, required=True)
    parser.add_argument("--architecture", choices=sorted(ARCHITECTURES), default="resnet18")
    parser.add_argument("--threshold", type=float, required=True, help="Validation-selected operating point τ")
    parser.add_argument("--band", type=float, default=0.05, help="Low-confidence band around τ")
    parser.add_argument("--version", required=True)
    parser.add_argument("--model-id", default="neuroscan-resnet18-binary")
    parser.add_argument("--name", default="NeuroScan ResNet-18 binary screening model")
    parser.add_argument("--input-size", type=int, default=224)
    parser.add_argument("--metrics", type=Path, help="JSON file of held-out evaluation metrics")
    parser.add_argument("--training-data", default=None, help="Dataset attribution text")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    if not 0.0 < args.threshold < 1.0:
        parser.error("--threshold must be between 0 and 1")

    model = build(args.architecture, len(BINARY_CLASSES))
    load_checkpoint(model, args.checkpoint)
    model.eval()

    wrapper = CamExportWrapper(resnet_backbone(model), model.fc)

    # Parity guard: the wrapper must reproduce the original model's logits.
    probe = torch.rand(2, 3, args.input_size, args.input_size)
    with torch.no_grad():
        expected = model(probe)
        actual = wrapper(probe)[0]
    if not torch.allclose(expected, actual, atol=1e-5):
        raise SystemExit("The CAM wrapper does not reproduce the model's logits; refusing to export.")

    performance = json.loads(args.metrics.read_text(encoding="utf-8")) if args.metrics else None
    info = ManifestInfo(
        model_id=args.model_id,
        name=args.name,
        version=args.version,
        threshold=args.threshold,
        low_confidence_band=args.band,
        input_size=args.input_size,
        created=dt.date.today().isoformat(),
        training_data=args.training_data,
        intended_use=(
            "Assistive screening of 2D brain MRI slices for the presence of a tumor. "
            "Decision support only; every result requires review by a qualified clinician."
        ),
        performance=performance,
        limitations=[
            "Trained and evaluated on public benchmark datasets; not externally or clinically validated.",
            "2D slice classification only; no segmentation or tumor typing.",
            "Inputs other than brain MRI can still produce confident scores.",
        ],
    )
    path = export(wrapper, info, args.out)
    print(f"Exported {path} and run-config.json to {args.out}")


if __name__ == "__main__":
    main()
