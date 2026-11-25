import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "viewer";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Buttons follow the macOS control language: a filled accent button for the
 * one primary action on a surface, raised neutral buttons for the rest, and
 * borderless ghost buttons inside toolbars. Press feedback is a 0.97 scale on
 * pointer-down (`.pressable`).
 */
export const buttonVariants = cva(
  [
    "pressable inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium",
    "disabled:cursor-not-allowed focus-visible:outline-none focus-visible:shadow-focus",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-white shadow-control-accent hover:bg-accent-hover disabled:bg-accent/45 disabled:shadow-none",
        secondary:
          "bg-surface text-ink shadow-control hover:bg-surface-muted active:bg-surface-sunken disabled:bg-surface-muted disabled:text-ink-faint disabled:shadow-none",
        ghost:
          "text-ink-secondary hover:bg-black/[0.05] hover:text-ink active:bg-black/[0.08] disabled:text-ink-faint disabled:hover:bg-transparent",
        danger:
          "bg-danger text-white shadow-control-danger hover:bg-danger-hover disabled:bg-danger/45 disabled:shadow-none",
        viewer:
          "bg-white/[0.08] text-viewer-ink ring-[0.5px] ring-inset ring-white/10 hover:bg-white/[0.14] active:bg-white/[0.18] focus-visible:shadow-focus-viewer disabled:text-viewer-muted/60 disabled:hover:bg-white/[0.08]",
      },
      size: {
        sm: "h-7 gap-1.5 rounded-md px-2.5 text-xs",
        md: "h-8 gap-2 rounded-md px-3 text-sm",
        lg: "h-10 gap-2 rounded-lg px-4 text-base",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  /** Shows a spinner and blocks repeat activation while an action runs. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "secondary",
      size = "md",
      icon,
      loading = false,
      disabled,
      className,
      children,
      type = "button",
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(buttonVariants({ variant, size }), className)}
        {...rest}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          icon
        )}
        {children}
      </button>
    );
  },
);
