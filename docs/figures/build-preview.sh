#!/usr/bin/env bash
# Regenerate figures/preview.html by inlining every NeuroScan figure SVG.
# Single source of truth: the figures/*.svg files listed in `figures` below.
# The preview tab serves one file only, so the viewer must be self-contained.
set -euo pipefail
cd "$(dirname "$0")"

figures=(
  "figure-2-1-conceptual-framework.svg|Figure 2-1. Conceptual framework of the NeuroScan screening system"
  "figure-3-1-process-model.svg|Figure 3-1. Milestone-based process model of the study"
  "figure-3-2-architecture.svg|Figure 3-2. System architecture of NeuroScan"
  "figure-3-3-screening-flowchart.svg|Figure 3-3. Flowchart of the screening process"
  "figure-3-4-cnn-architecture.svg|Figure 3-4. Block diagram of the convolutional network"
)

{
  cat <<'HTML'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>NeuroScan figures &#8212; Chapter 2 and Chapter 3</title>
<style>
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body { padding: 32px 16px; }
  section { margin: 0 auto 56px; max-width: 1600px; }
  h2 { font: 600 16px "Segoe UI", "Helvetica Neue", Arial, sans-serif; color: #334155; margin: 0 0 12px; }
  svg { width: 100%; height: auto; display: block; border: 1px solid #e2e8f0; }
  @media print {
    @page { size: landscape; margin: 10mm; }
    body { padding: 0; }
    section { margin: 0 0 10mm; page-break-after: always; }
    svg { border: none; }
  }
</style>
</head>
<body>
HTML

  for entry in "${figures[@]}"; do
    file="${entry%%|*}"
    caption="${entry#*|}"
    printf '<section>\n<h2>%s</h2>\n' "$caption"
    cat "$file"
    printf '</section>\n'
  done

  cat <<'HTML'
</body>
</html>
HTML
} > preview.html

echo "wrote preview.html ($(wc -c < preview.html) bytes, ${#figures[@]} figures)"
