import { useId } from "react";

/**
 * NeuroScan mark: an axial brain slice inside a squircle, lit from above like
 * a desktop app icon. The slice outline is the subject itself — the image the
 * workstation exists to read.
 */
export function BrandMark({ className }: { className?: string }) {
  const id = useId();
  const fill = `${id}-fill`;
  const shine = `${id}-shine`;
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(40 132 240)" />
          <stop offset="1" stopColor="rgb(0 86 196)" />
        </linearGradient>
        <linearGradient id={shine} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="white" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M12 1C4.2 1 1 4.2 1 12s3.2 11 11 11 11-3.2 11-11S19.8 1 12 1Z"
        fill={`url(#${fill})`}
      />
      <path
        d="M12 1C4.2 1 1 4.2 1 12s3.2 11 11 11 11-3.2 11-11S19.8 1 12 1Z"
        fill={`url(#${shine})`}
      />
      <path
        d="M12 5.6c-3.5 0-5.8 2.6-5.8 6.1 0 3.8 2.6 6.6 5.8 6.6s5.8-2.8 5.8-6.6c0-3.5-2.3-6.1-5.8-6.1Z"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
      />
      <path
        d="M12 6v12.2M8.7 9.4c1.2.7 2.1.7 3.3 0M12 13.5c1.3.8 2.3.8 3.5 0"
        stroke="white"
        strokeWidth="1.25"
        fill="none"
        strokeLinecap="round"
        opacity="0.92"
      />
    </svg>
  );
}
