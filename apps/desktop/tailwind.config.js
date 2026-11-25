import animate from "tailwindcss-animate";

/**
 * NeuroScan design tokens.
 *
 * Colours are CSS custom properties (see `src/index.css`) exposed to Tailwind
 * as `rgb(var(--token) / <alpha-value>)`, so every surface, line and status
 * colour comes from one place and supports opacity modifiers.
 *
 * Light-box canvas and solid paper for clinical content; translucent glass for
 * chrome that floats above it; a dark, low-glare stage for the image viewer
 * (the radiology reading-room convention).
 */
const token = (name) => `rgb(var(--ns-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: token("canvas"),
          deep: token("canvas-deep"),
        },
        surface: {
          DEFAULT: token("surface"),
          muted: token("surface-muted"),
          sunken: token("surface-sunken"),
        },
        line: {
          DEFAULT: token("line"),
          strong: token("line-strong"),
        },
        ink: {
          DEFAULT: token("ink"),
          secondary: token("ink-secondary"),
          muted: token("ink-muted"),
          faint: token("ink-faint"),
        },
        accent: {
          DEFAULT: token("accent"),
          hover: token("accent-hover"),
          soft: token("accent-soft"),
          line: token("accent-line"),
          ink: token("accent-ink"),
        },
        danger: {
          DEFAULT: token("danger"),
          hover: token("danger-hover"),
          soft: token("danger-soft"),
          line: token("danger-line"),
          ink: token("danger-ink"),
        },
        warning: {
          DEFAULT: token("warning"),
          soft: token("warning-soft"),
          line: token("warning-line"),
          ink: token("warning-ink"),
        },
        success: {
          DEFAULT: token("success"),
          soft: token("success-soft"),
          line: token("success-line"),
          ink: token("success-ink"),
        },
        progress: {
          DEFAULT: token("progress"),
          soft: token("progress-soft"),
          line: token("progress-line"),
          ink: token("progress-ink"),
        },
        viewer: {
          bg: token("viewer-bg"),
          panel: token("viewer-panel"),
          raised: token("viewer-raised"),
          line: token("viewer-line"),
          ink: token("viewer-ink"),
          muted: token("viewer-muted"),
          accent: token("viewer-accent"),
        },
        // shadcn / beUI aliases mapped onto the NeuroScan tokens.
        background: token("canvas"),
        foreground: token("ink"),
        card: { DEFAULT: token("surface-sunken"), foreground: token("ink") },
        popover: { DEFAULT: token("surface"), foreground: token("ink") },
        primary: { DEFAULT: token("accent"), foreground: "rgb(255 255 255)" },
        secondary: {
          DEFAULT: token("surface-sunken"),
          foreground: token("ink"),
        },
        muted: { DEFAULT: token("surface-sunken"), foreground: token("ink-muted") },
        destructive: { DEFAULT: token("danger"), foreground: "rgb(255 255 255)" },
        border: token("line"),
        input: token("line-strong"),
        ring: token("accent"),
      },
      fontFamily: {
        sans: [
          '"Inter Variable"',
          '"Segoe UI Variable Text"',
          '"Segoe UI"',
          "system-ui",
          "sans-serif",
        ],
        display: [
          '"Inter Variable"',
          '"Segoe UI Variable Display"',
          '"Segoe UI"',
          "system-ui",
          "sans-serif",
        ],
        mono: [
          '"Geist Mono Variable"',
          '"Cascadia Mono"',
          "Consolas",
          "ui-monospace",
          "monospace",
        ],
      },
      fontSize: {
        "2xs": ["11px", { lineHeight: "14px", letterSpacing: "0.005em" }],
        xs: ["12px", { lineHeight: "16px", letterSpacing: "0" }],
        sm: ["13px", { lineHeight: "18px", letterSpacing: "-0.003em" }],
        base: ["14px", { lineHeight: "20px", letterSpacing: "-0.006em" }],
        md: ["15px", { lineHeight: "22px", letterSpacing: "-0.009em" }],
        lg: ["17px", { lineHeight: "24px", letterSpacing: "-0.012em" }],
        xl: ["20px", { lineHeight: "26px", letterSpacing: "-0.017em" }],
        "2xl": ["26px", { lineHeight: "32px", letterSpacing: "-0.022em" }],
        "3xl": ["32px", { lineHeight: "38px", letterSpacing: "-0.025em" }],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        panel:
          "0 0 0 0.5px rgb(0 0 0 / 0.08), 0 1px 2px rgb(16 18 27 / 0.04), 0 2px 8px -2px rgb(16 18 27 / 0.04)",
        raised:
          "0 0 0 0.5px rgb(0 0 0 / 0.1), 0 1px 2px rgb(16 18 27 / 0.06), 0 4px 12px -4px rgb(16 18 27 / 0.1)",
        control:
          "0 0 0 0.5px rgb(0 0 0 / 0.12), 0 1px 1px rgb(16 18 27 / 0.06), inset 0 1px 0 rgb(255 255 255 / 0.6)",
        "control-accent":
          "0 0 0 0.5px rgb(0 60 140 / 0.5), 0 1px 2px rgb(0 60 140 / 0.24), inset 0 1px 0 rgb(255 255 255 / 0.18)",
        "control-danger":
          "0 0 0 0.5px rgb(120 0 12 / 0.5), 0 1px 2px rgb(120 0 12 / 0.24), inset 0 1px 0 rgb(255 255 255 / 0.18)",
        popover:
          "inset 0 1px 0 rgb(255 255 255 / 0.7), 0 0 0 0.5px rgb(0 0 0 / 0.12), 0 16px 40px -8px rgb(16 18 27 / 0.24), 0 4px 12px -4px rgb(16 18 27 / 0.1)",
        modal:
          "inset 0 1px 0 rgb(255 255 255 / 0.7), 0 0 0 0.5px rgb(0 0 0 / 0.14), 0 40px 80px -16px rgb(16 18 27 / 0.36), 0 8px 24px -8px rgb(16 18 27 / 0.16)",
        focus:
          "0 0 0 2px rgb(var(--ns-surface)), 0 0 0 4px rgb(var(--ns-accent))",
        "focus-viewer":
          "0 0 0 2px rgb(var(--ns-viewer-bg)), 0 0 0 4px rgb(var(--ns-viewer-accent))",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.23, 1, 0.32, 1)",
        "in-out": "cubic-bezier(0.77, 0, 0.175, 1)",
        drawer: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      transitionDuration: {
        fast: "120ms",
        normal: "180ms",
        slow: "240ms",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "rise-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        indeterminate: {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(250%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 180ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "rise-in": "rise-in 240ms cubic-bezier(0.23, 1, 0.32, 1) both",
        "pop-in": "pop-in 180ms cubic-bezier(0.23, 1, 0.32, 1) both",
        indeterminate:
          "indeterminate 1.4s cubic-bezier(0.65, 0, 0.35, 1) infinite",
      },
    },
  },
  plugins: [animate],
};
