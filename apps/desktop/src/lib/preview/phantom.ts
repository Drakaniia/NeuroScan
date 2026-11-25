/**
 * A synthetic axial "brain" phantom for design preview only: skull, cortex,
 * white matter, ventricles and, for some seeds, a ring-enhancing lesion. It is
 * geometry, not patient data, and exists so the viewer can be reviewed in a
 * browser without the clinical backend.
 */
export const PHANTOM_SIZE = 256;

export interface PhantomSpec {
  seed: number;
  lesion: { x: number; y: number; r: number } | null;
  slice: number;
}

const specs = new Map<string, PhantomSpec>();

export function registerPhantom(imageId: string, spec: PhantomSpec) {
  specs.set(imageId, spec);
}

export function phantomSpec(imageId: string): PhantomSpec {
  return specs.get(imageId) ?? { seed: 1, lesion: null, slice: 0.5 };
}

function noise(seed: number) {
  let state = seed * 9301 + 49297;
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

export function phantomValues(spec: PhantomSpec): Float32Array {
  const n = PHANTOM_SIZE;
  const values = new Float32Array(n * n);
  const random = noise(spec.seed);
  const cx = n / 2;
  const cy = n / 2 + 4;
  // Slices nearer the vertex are smaller.
  const scale = 1 - Math.abs(spec.slice - 0.5) * 0.35;
  const ax = 92 * scale;
  const ay = 112 * scale;
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      const dx = (x - cx) / ax;
      const dy = (y - cy) / ay;
      const r = Math.sqrt(dx * dx + dy * dy);
      let v = 20;
      if (r < 1.08 && r >= 1.0) v = 820; // skull
      else if (r < 1.0 && r >= 0.93) v = 240; // CSF rim
      else if (r < 0.93) {
        // Gyri: modulate the cortex boundary with angle.
        const angle = Math.atan2(dy, dx);
        const gyri = 0.04 * Math.sin(angle * 18 + spec.seed);
        v = r > 0.72 + gyri ? 520 : 690; // grey / white matter
        // Ventricles: two lateral crescents.
        const vx = Math.abs(x - cx) - 14 * scale;
        const vy = y - cy + 6;
        if ((vx * vx) / 90 + (vy * vy) / 900 < 1) v = 170;
        // Midline.
        if (Math.abs(x - cx) < 1.2 && r < 0.88) v = 300;
      }
      if (spec.lesion) {
        const lx = x - spec.lesion.x;
        const ly = y - spec.lesion.y;
        const d = Math.sqrt(lx * lx + ly * ly);
        if (d < spec.lesion.r) v = d > spec.lesion.r * 0.68 ? 930 : 380;
        else if (d < spec.lesion.r * 1.6) v = Math.min(v, 600) - 40; // oedema
      }
      values[y * n + x] = v + (random() - 0.5) * 36;
    }
  }
  return values;
}

/** Normalised activation map focused on the lesion (or diffuse noise). */
export function phantomActivation(
  spec: PhantomSpec,
  size = 14,
): { width: number; height: number; values: number[] } {
  const values: number[] = [];
  const random = noise(spec.seed + 7);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const px = ((x + 0.5) / size) * PHANTOM_SIZE;
      const py = ((y + 0.5) / size) * PHANTOM_SIZE;
      let v = random() * 0.12;
      if (spec.lesion) {
        const d = Math.hypot(px - spec.lesion.x, py - spec.lesion.y);
        v = Math.max(v, Math.exp(-(d * d) / (2 * (spec.lesion.r * 1.4) ** 2)));
      }
      values.push(Number(v.toFixed(4)));
    }
  }
  return { width: size, height: size, values };
}

const thumbnails = new Map<string, string>();

export function phantomThumbnail(id: string, spec: PhantomSpec): string {
  const cached = thumbnails.get(id);
  if (cached) return cached;
  const n = PHANTOM_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = n;
  canvas.height = n;
  const context = canvas.getContext("2d");
  if (!context) return "";
  const image = context.createImageData(n, n);
  const values = phantomValues(spec);
  for (let i = 0; i < values.length; i += 1) {
    const g = Math.max(0, Math.min(255, (values[i] / 1000) * 255));
    image.data[i * 4] = g;
    image.data[i * 4 + 1] = g;
    image.data[i * 4 + 2] = g;
    image.data[i * 4 + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  const url = canvas.toDataURL("image/png");
  thumbnails.set(id, url);
  return url;
}
