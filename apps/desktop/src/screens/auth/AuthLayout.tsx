import type { ReactNode } from "react";
import { BrandMark } from "@/components/chrome/BrandMark";

/**
 * Iso-contours of an axial slice, drawn the way a window/level sweep reveals
 * tissue boundaries. Decorative and static: it sits far behind the sheet at
 * low contrast so the form stays the only thing that asks for attention.
 */
function contour(scale: number, gyri: number, phase: number): string {
  const points: string[] = [];
  for (let step = 0; step <= 180; step += 1) {
    const theta = (step / 180) * Math.PI * 2;
    // Axial head shape: wider at the back, gently flattened at the temples.
    const rx = 168 + 14 * Math.sin(theta);
    const ry = 212;
    const ripple = 1 + gyri * Math.sin(theta * 14 + phase);
    const x = Math.cos(theta) * rx * scale * ripple;
    const y = Math.sin(theta) * ry * scale * ripple;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M${points.join("L")}Z`;
}

const RINGS = [
  { scale: 1, gyri: 0, width: 2 },
  { scale: 0.95, gyri: 0, width: 1 },
  { scale: 0.86, gyri: 0.035, width: 1 },
  { scale: 0.74, gyri: 0.045, width: 1 },
  { scale: 0.62, gyri: 0.05, width: 1 },
].map((ring, index) => ({ ...ring, d: contour(ring.scale, ring.gyri, index * 1.3) }));

function SliceContours() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <svg
        aria-hidden="true"
        viewBox="-230 -250 460 500"
        className="absolute left-1/2 top-1/2 h-[96%] max-h-[980px] -translate-x-1/2 -translate-y-1/2 text-ink opacity-[0.075]"
        fill="none"
        stroke="currentColor"
      >
        {RINGS.map((ring) => (
          <path key={ring.scale} d={ring.d} strokeWidth={ring.width} />
        ))}
        {/* Midline and the lateral ventricles. */}
        <path d="M0 -196 V 196" strokeWidth={1} strokeDasharray="2 7" />
        <path
          d="M-12 -46 C -46 -40, -52 10, -30 46 M12 -46 C 46 -40, 52 10, 30 46"
          strokeWidth={1.4}
        />
      </svg>
    </div>
  );
}

/**
 * Setup, sign-in, unlock and password change. One translucent sheet over the
 * light-box canvas — the only glass surface on the screen.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
  wide = false,
  header,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  /** Replaces the default title block (the lock screen shows the user). */
  header?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
      <SliceContours />
      <div
        className="relative m-auto w-full animate-rise-in px-6 py-10"
        style={{ maxWidth: wide ? 580 : 412 }}
      >
        <div className="material-overlay rounded-2xl p-7">
          {header ?? (
            <div className="mb-6">
              <BrandMark className="mb-4 size-11 drop-shadow-[0_4px_10px_rgb(0_86_196/0.3)]" />
              <h1 className="type-title text-ink">{title}</h1>
              {subtitle ? (
                <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
              ) : null}
            </div>
          )}
          {header ? <h1 className="sr-only">{title}</h1> : null}
          {children}
        </div>
        {footer ? <div className="mt-3">{footer}</div> : null}
        <p className="mx-auto mt-6 max-w-[340px] text-center text-2xs leading-relaxed text-ink-muted">
          Clinical decision-support software. AI results are not a diagnosis
          and must be reviewed by a qualified clinician. Authorized personnel
          only; activity is recorded in the audit log.
        </p>
      </div>
    </div>
  );
}
