#!/usr/bin/env python3
"""Layout linter for the NeuroScan figure SVGs.

Measures every <text> node with the real Segoe UI metrics (via PIL) and reports:
  * text that overflows the shape it sits in
  * text that leaves the viewBox
  * text that collides with another text node
  * text that collides with a filled shape it does not sit in
  * text that an arrow or connector line runs through

Geometry is read from the SVG; only the visual language used in figures/ is
supported (rect, ellipse, path, and one class per text size). Run from anywhere:

    python figures/check-layout.py
"""
from __future__ import annotations

import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import ImageFont

SVG = "{http://www.w3.org/2000/svg}"
FONT_DIR = Path("C:/Windows/Fonts")
TOLERANCE = 1.5  # px of slack before something counts as an overflow
COLLISION_MIN = 3.0  # px of overlap in both axes before it counts as a collision

# class -> (font file, size in user units), matching the <style> blocks in the figures
FONTS = {
    "regular": ("segoeui.ttf", None),
    "bold": ("segoeuib.ttf", None),
    "italic": ("segoeuii.ttf", None),
}
# Fallback only: every figure declares its real sizes in its own <style> block, which is
# parsed below and takes precedence. These values apply to a class a file does not declare.
CLASS_STYLE = {
    "hdr": ("bold", 26.0),
    "t": ("bold", 24.0),
    "ct": ("bold", 24.0),
    "lbl": ("bold", 26.0),
    "b": ("bold", 24.0),
    "box": ("bold", 22.0),
    "chip": ("bold", 22.0),
    "sl": ("bold", 24.0),
    "yn": ("bold", 22.0),
    "d": ("regular", 22.0),
    "n": ("italic", 21.0),
}

# .class { font: [italic] <weight> <size>px "family" ... }  ->  class: (style, size)
STYLE_DECL = re.compile(
    r"\.([A-Za-z][\w-]*)\s*\{[^}]*?font:\s*(?:italic\s+)?(\d+)\s+(\d+(?:\.\d+)?)px",
    re.S,
)


def declared_styles(root: ET.Element) -> dict[str, tuple[str, float]]:
    """Real class -> (font file style, size) as declared in the file's own <style> block."""
    declared: dict[str, tuple[str, float]] = {}
    for elem in root.iter(f"{SVG}style"):
        for name, weight, size in STYLE_DECL.findall(elem.text or ""):
            declared[name] = ("bold" if weight in ("600", "700", "800", "900") else "regular", float(size))
    return declared
ANCHOR = {"start": "ls", "middle": "ms", "end": "rs"}

_font_cache: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}


def font_for(style: str, size: float) -> ImageFont.FreeTypeFont:
    key = (style, round(size * 2))
    if key not in _font_cache:
        name, _ = FONTS[style]
        _font_cache[key] = ImageFont.truetype(str(FONT_DIR / name), round(size * 2))
    return _font_cache[key]


def text_box(elem: ET.Element, styles: dict[str, tuple[str, float]]) -> tuple[float, float, float, float] | None:
    content = "".join(elem.itertext())
    if not content.strip():
        return None
    style, size = styles.get(elem.get("class", ""), ("regular", 12.5))
    anchor = ANCHOR.get(elem.get("text-anchor", "start"), "ls")
    x, y = float(elem.get("x")), float(elem.get("y"))
    # measure at 2x and halve, so fractional sizes keep their precision
    l, t, r, b = font_for(style, size).getbbox(content, anchor=anchor)
    return (x + l / 2, y + t / 2, x + r / 2, y + b / 2)


def segments(root: ET.Element) -> list[tuple[float, float, float, float]]:
    """Straight segments of every path outside <defs>, for M/L/H/V/Z in absolute units."""
    segs: list[tuple[float, float, float, float]] = []
    for elem in root.iter(f"{SVG}path"):
        if elem.get("fill", "none") not in ("none", "#ffffff"):
            continue  # marker glyphs and filled shapes are handled elsewhere
        tokens = (elem.get("d") or "").replace(",", " ").split()
        cx = cy = sx = sy = 0.0
        i, cmd = 0, ""
        while i < len(tokens):
            tok = tokens[i]
            if tok.isalpha():
                cmd = tok.upper()
                i += 1
                if cmd == "Z":
                    segs.append((cx, cy, sx, sy))
                    cx, cy = sx, sy
                continue
            if cmd == "M":
                cx, cy = float(tokens[i]), float(tokens[i + 1])
                sx, sy = cx, cy
                i += 2
            elif cmd == "L":
                nx, ny = float(tokens[i]), float(tokens[i + 1])
                segs.append((cx, cy, nx, ny))
                cx, cy = nx, ny
                i += 2
            elif cmd == "H":
                nx = float(tokens[i])
                segs.append((cx, cy, nx, cy))
                cx = nx
                i += 1
            elif cmd == "V":
                ny = float(tokens[i])
                segs.append((cx, cy, cx, ny))
                cy = ny
                i += 1
            else:
                i += 1
    return segs


def hits_rect(seg, rect, inset: float = 2.0) -> bool:
    x0, y0, x1, y1 = rect[0] + inset, rect[1] + inset, rect[2] - inset, rect[3] - inset
    if x1 <= x0 or y1 <= y0:
        return False
    px, py, qx, qy = seg

    def inside(x, y):
        return x0 <= x <= x1 and y0 <= y <= y1

    if inside(px, py) or inside(qx, qy):
        return True
    for edge in ((x0, y0, x1, y0), (x1, y0, x1, y1), (x1, y1, x0, y1), (x0, y1, x0, y0)):
        ax, ay, bx, by = edge
        d1 = (qx - px) * (ay - py) - (qy - py) * (ax - px)
        d2 = (qx - px) * (by - py) - (qy - py) * (bx - px)
        d3 = (bx - ax) * (py - ay) - (by - ay) * (px - ax)
        d4 = (bx - ax) * (qy - ay) - (by - ay) * (qx - ax)
        if ((d1 > 0) != (d2 > 0)) and ((d3 > 0) != (d4 > 0)):
            return True
    return False


def shapes(root: ET.Element) -> list[tuple[str, float, float, float, float, str]]:
    out = []
    for elem in root.iter():
        if elem.tag == f"{SVG}rect":
            x, y = float(elem.get("x", 0)), float(elem.get("y", 0))
            out.append(("rect", x, y, x + float(elem.get("width")), y + float(elem.get("height")), elem.get("fill", "none")))
        elif elem.tag == f"{SVG}ellipse":
            cx, cy = float(elem.get("cx")), float(elem.get("cy"))
            rx, ry = float(elem.get("rx")), float(elem.get("ry"))
            out.append(("ellipse", cx - rx, cy - ry, cx + rx, cy + ry, elem.get("fill", "none")))
    return out


def contains(shape, x, y) -> bool:
    return shape[1] <= x <= shape[3] and shape[2] <= y <= shape[4]


def overlap(a, b) -> tuple[float, float]:
    dx = min(a[3], b[3]) - max(a[1], b[1])
    dy = min(a[4] if len(a) > 4 else a[3], b[4] if len(b) > 4 else b[3]) - max(a[2], b[2])
    return dx, dy


def check(path: Path) -> list[str]:
    root = ET.parse(path).getroot()
    styles = {**CLASS_STYLE, **declared_styles(root)}
    _, _, vw, vh = (float(v) for v in root.get("viewBox").split())
    boxes = shapes(root)
    segs = segments(root)
    problems: list[str] = []

    texts: list[tuple[str, tuple[float, float, float, float]]] = []
    for elem in root.iter(f"{SVG}text"):
        box = text_box(elem, styles)
        if box:
            texts.append(("".join(elem.itertext()), box))

    for content, box in texts:
        label = content if len(content) <= 48 else content[:45] + "..."
        for side, (value, limit) in {"left": (box[0], 0.0), "top": (box[1], 0.0), "right": (-box[2], -vw), "bottom": (-box[3], -vh)}.items():
            if value < limit - TOLERANCE:
                problems.append(f"viewBox overflow ({side}): '{label}'")
        anchor_x, mid_y = (box[0] + box[2]) / 2 if abs(box[0] - box[2]) else box[0], (box[1] + box[3]) / 2
        holders = [s for s in boxes if contains(s, anchor_x, mid_y)]
        holders.sort(key=lambda s: (s[3] - s[1]) * (s[4] - s[2]))
        if holders:
            h = holders[0]
            for side, bad in {
                "left": box[0] < h[1] - TOLERANCE,
                "top": box[1] < h[2] - TOLERANCE,
                "right": box[2] > h[3] + TOLERANCE,
                "bottom": box[3] > h[4] + TOLERANCE,
            }.items():
                if bad:
                    problems.append(f"overflows its {h[0]} on the {side}: '{label}'")
        for s in boxes:
            if s in holders or s[5] == "none" or s[5] == "#ffffff":
                continue
            if box[0] < s[3] and box[2] > s[1] and box[1] < s[4] and box[3] > s[2]:
                dx = min(box[2], s[3]) - max(box[0], s[1])
                dy = min(box[3], s[4]) - max(box[1], s[2])
                if dx > COLLISION_MIN and dy > COLLISION_MIN:
                    problems.append(f"collides with a filled {s[0]}: '{label}'")
        for seg in segs:
            if hits_rect(seg, box):
                problems.append(f"a connector line runs through: '{label}'")
                break

    for i, (ca, ba) in enumerate(texts):
        for cb, bb in texts[i + 1:]:
            dx = min(ba[2], bb[2]) - max(ba[0], bb[0])
            dy = min(ba[3], bb[3]) - max(ba[1], bb[1])
            if dx > COLLISION_MIN and dy > COLLISION_MIN:
                a = ca if len(ca) <= 30 else ca[:27] + "..."
                b = cb if len(cb) <= 30 else cb[:27] + "..."
                problems.append(f"text collides with text: '{a}' / '{b}'")

    return problems


def main() -> int:
    total = 0
    for svg in sorted(Path(__file__).parent.glob("figure-*.svg")):
        problems = check(svg)
        total += len(problems)
        print(f"\n{svg.name}: {len(problems)} issue(s)")
        for p in problems:
            print(f"  - {p}")
    print(f"\n{total} issue(s) across all figures")
    return 0


if __name__ == "__main__":
    sys.exit(main())
