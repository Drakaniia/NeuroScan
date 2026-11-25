/**
 * Burn identification and the AI result into an exported image. A copy of a
 * medical image that leaves the application must carry who it belongs to and
 * what it shows; the AI line is always labelled as decision support.
 */
export function annotateSnapshot(
  image: HTMLCanvasElement,
  lines: { left: string[]; right: string[]; footer: string },
): HTMLCanvasElement {
  const scale = Math.max(1, Math.min(3, image.width / 512));
  const pad = Math.round(10 * scale);
  const lineHeight = Math.round(15 * scale);
  const band = pad * 2 + lineHeight;
  const out = document.createElement("canvas");
  out.width = image.width;
  out.height = image.height + band;
  const ctx = out.getContext("2d");
  if (!ctx) return image;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(image, 0, 0);

  ctx.font = `${Math.round(12 * scale)}px Consolas, "Cascadia Mono", monospace`;
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 3 * scale;
  ctx.fillStyle = "rgba(235,240,245,0.95)";
  lines.left.forEach((line, index) => {
    ctx.fillText(line, pad, pad + index * lineHeight);
  });
  ctx.textAlign = "right";
  lines.right.forEach((line, index) => {
    ctx.fillText(line, out.width - pad, pad + index * lineHeight);
  });

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#14191f";
  ctx.fillRect(0, image.height, out.width, band);
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,200,90,0.95)";
  ctx.fillText(lines.footer, pad, image.height + pad);
  return out;
}

export function canvasToBase64Png(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/png").split(",")[1] ?? "";
}
