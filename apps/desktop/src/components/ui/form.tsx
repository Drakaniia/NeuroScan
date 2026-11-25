import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useId,
} from "react";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";

/**
 * Text controls: a white well with a hairline edge, and an accent focus halo
 * that grows out of the edge rather than replacing it.
 */
const CONTROL =
  "w-full rounded-md bg-surface px-2.5 text-sm text-ink shadow-[0_0_0_0.5px_rgb(0_0_0/0.14),0_1px_1px_rgb(16_18_27/0.04)] transition-shadow duration-fast placeholder:text-ink-faint hover:shadow-[0_0_0_0.5px_rgb(0_0_0/0.24),0_1px_1px_rgb(16_18_27/0.04)] focus:outline-none focus-visible:outline-none focus:shadow-[0_0_0_1px_rgb(var(--ns-accent)),0_0_0_4px_rgb(var(--ns-accent)/0.18)] disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted disabled:shadow-[0_0_0_0.5px_rgb(0_0_0/0.08)]";

function controlTone(invalid: boolean | undefined) {
  return invalid
    ? "shadow-[0_0_0_1px_rgb(var(--ns-danger))] hover:shadow-[0_0_0_1px_rgb(var(--ns-danger))] focus:shadow-[0_0_0_1px_rgb(var(--ns-danger)),0_0_0_4px_rgb(var(--ns-danger)/0.16)]"
    : "";
}

export interface FieldProps {
  label: string;
  /** Rendered inside the label row, right-aligned (e.g. a character count). */
  aside?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: (control: {
    id: string;
    describedBy?: string;
    invalid: boolean;
  }) => ReactNode;
}

/**
 * Label, control, hint and error wired together: the error is announced and
 * linked through `aria-describedby`, and required fields are marked in text.
 */
export function Field({
  label,
  aside,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-medium text-ink-secondary">
          {label}
          {required ? (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          ) : null}
          {required ? <span className="sr-only"> (required)</span> : null}
        </label>
        {aside ? (
          <span className="tabular text-2xs text-ink-faint">{aside}</span>
        ) : null}
      </div>
      {children({
        id,
        describedBy: describedBy || undefined,
        invalid: Boolean(error),
      })}
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="animate-fade-in text-xs text-danger-ink"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leading?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, leading, className, ...rest },
  ref,
) {
  if (leading) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-ink-faint">
          {leading}
        </span>
        <input
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(CONTROL, controlTone(invalid), "h-8 pl-8", className)}
          {...rest}
        />
      </div>
    );
  }
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(CONTROL, controlTone(invalid), "h-8", className)}
      {...rest}
    />
  );
});

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ invalid, className, rows = 3, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={cn(
          CONTROL,
          controlTone(invalid),
          "resize-y py-2 leading-5",
          className,
        )}
        {...rest}
      />
    );
  },
);

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

/**
 * Native select (the OS list is the most familiar, accessible picker on the
 * platform). Uses the native picker indicator so engines never render a
 * duplicate caret.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ invalid, className, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          CONTROL,
          controlTone(invalid),
          "h-8 cursor-pointer",
          className,
        )}
        {...rest}
      >
        {children}
      </select>
    );
  },
);

export function Checkbox({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      <CheckboxPrimitive.Root
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange(value === true)}
        className={cn(
          "pressable mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[5px] focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50",
          checked
            ? "bg-accent text-white shadow-control-accent"
            : "bg-surface shadow-[0_0_0_0.5px_rgb(0_0_0/0.3),0_1px_1px_rgb(16_18_27/0.06)]",
        )}
      >
        <CheckboxPrimitive.Indicator className="animate-pop-in">
          <Check className="size-3" strokeWidth={3} aria-hidden="true" />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description ? (
          <span className="block text-xs text-ink-muted">{description}</span>
        ) : null}
      </label>
    </div>
  );
}

/** Compact label-above control used in filter bars. */
export function FilterField({
  label,
  children,
}: {
  label: string;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="type-eyebrow text-ink-muted">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

/**
 * A compact segmented choice (radio group) for 2–5 short options. The
 * selected thumb glides between segments with a critically damped spring,
 * so the eye can follow where the selection went.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  tone = "light",
  size = "md",
}: {
  value: T;
  options: readonly { value: T; label: string; title?: string }[];
  onChange: (value: T) => void;
  label: string;
  tone?: "light" | "viewer";
  size?: "sm" | "md";
}) {
  const layoutId = useId();
  const reduce = useReducedMotion();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex rounded-lg p-0.5",
        tone === "light"
          ? "bg-black/[0.055] shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.04)]"
          : "bg-white/[0.07] shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.06)]",
      )}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          // biome-ignore lint/a11y/useSemanticElements: a segmented control styled as buttons, with full radio semantics
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option.title}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              const step =
                event.key === "ArrowRight" || event.key === "ArrowDown"
                  ? 1
                  : event.key === "ArrowLeft" || event.key === "ArrowUp"
                    ? -1
                    : 0;
              if (!step) return;
              event.preventDefault();
              const next =
                options[(index + step + options.length) % options.length];
              onChange(next.value);
              const group = event.currentTarget.parentElement;
              requestAnimationFrame(() =>
                group
                  ?.querySelector<HTMLButtonElement>('[aria-checked="true"]')
                  ?.focus(),
              );
            }}
            className={cn(
              "relative isolate rounded-md px-2.5 font-medium transition-colors duration-fast focus-visible:outline-none",
              tone === "light"
                ? "focus-visible:shadow-focus"
                : "focus-visible:shadow-focus-viewer",
              size === "sm" ? "h-6 text-2xs" : "h-7 text-xs",
              tone === "light"
                ? selected
                  ? "text-ink"
                  : "text-ink-muted hover:text-ink"
                : selected
                  ? "text-viewer-ink"
                  : "text-viewer-muted hover:text-viewer-ink",
            )}
          >
            {selected ? (
              <motion.span
                layoutId={layoutId}
                transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                aria-hidden="true"
                className={cn(
                  "absolute inset-0 -z-10 rounded-md",
                  tone === "light"
                    ? "bg-surface shadow-[0_0_0_0.5px_rgb(0_0_0/0.08),0_1px_2px_rgb(16_18_27/0.1),0_2px_6px_-2px_rgb(16_18_27/0.08)]"
                    : "bg-white/[0.16] shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.14)]",
                )}
              />
            ) : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
