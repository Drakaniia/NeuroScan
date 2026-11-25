"""Create the *contract fixture*: a tiny, UNTRAINED network that satisfies the
NeuroScan model contract, used only by automated tests of the application's
model loading, validation, preprocessing, inference and CAM plumbing.

Its weights are seeded random numbers. Its outputs carry no medical meaning
whatsoever, and its manifest says so (``model.fixture = true``); the
application labels every result it produces as meaningless.

Usage::

    python ml/make_fixture_model.py apps/desktop/src-tauri/tests/fixtures/contract-model
"""

from __future__ import annotations

import argparse
from pathlib import Path

import torch
from torch import nn

from neuroscan_contract import CamExportWrapper, ManifestInfo, export


def tiny_backbone() -> nn.Module:
    # 224 -> 112 -> 56 -> 28 -> 14 -> 7, 16 channels: the same 7x7 CAM grid
    # a ResNet-18 produces, at a few kilobytes.
    layers: list[nn.Module] = []
    channels = [3, 8, 12, 16, 16, 16]
    for c_in, c_out in zip(channels, channels[1:]):
        layers += [nn.Conv2d(c_in, c_out, 3, stride=2, padding=1), nn.ReLU()]
    return nn.Sequential(*layers)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("out_dir", type=Path)
    parser.add_argument("--seed", type=int, default=20261106)
    args = parser.parse_args()

    torch.manual_seed(args.seed)
    head = nn.Linear(16, 2)
    # Still arbitrary, but sign-consistent: the "positive" logit grows with the
    # (non-negative) features, so outputs vary with the input and the CAM path
    # is exercised. This does not make the outputs meaningful.
    with torch.no_grad():
        magnitude = head.weight[1].abs() * 20.0
        head.weight[0] = -magnitude
        head.weight[1] = magnitude
        head.bias.zero_()
    wrapper = CamExportWrapper(tiny_backbone(), head)
    info = ManifestInfo(
        model_id="neuroscan-contract-fixture",
        name="NeuroScan contract fixture (untrained)",
        version="0.0.0-fixture",
        threshold=0.5,
        low_confidence_band=0.05,
        description="Tiny CNN with random weights that implements the four-output CAM contract.",
        intended_use=(
            "Automated integration tests of the application only. Untrained random weights: "
            "outputs are meaningless and must never be used to interpret an image."
        ),
        limitations=["Not trained on any data.", "Not a medical model."],
        fixture=True,
    )
    path = export(wrapper, info, args.out_dir)
    print(f"wrote {path} ({path.stat().st_size} bytes) and run-config.json")


if __name__ == "__main__":
    main()
