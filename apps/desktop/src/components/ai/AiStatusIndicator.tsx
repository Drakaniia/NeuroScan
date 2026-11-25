import {
  AlertTriangle,
  CircleDashed,
  CircleOff,
  FlaskConical,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import type { ModelStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export interface AiAvailability {
  ready: boolean;
  fixture: boolean;
  label: string;
  detail: string;
  tone: "ready" | "fixture" | "busy" | "off" | "error";
}

/** One reading of the model status, shared by every place that shows it. */
export function describeAi(status: ModelStatus | undefined): AiAvailability {
  if (!status || status.state === "unchecked" || status.state === "loading") {
    return {
      ready: false,
      fixture: false,
      label: "AI: checking…",
      detail: status?.message ?? "Checking for an AI model…",
      tone: "busy",
    };
  }
  if (status.state === "ready" && status.model) {
    const fixture = status.model.fixture;
    return {
      ready: true,
      fixture,
      label: fixture
        ? "AI: test fixture (not clinical)"
        : `AI: ${status.model.name} v${status.model.version}`,
      detail: status.message,
      tone: fixture ? "fixture" : "ready",
    };
  }
  if (status.state === "not_installed") {
    return {
      ready: false,
      fixture: false,
      label: "AI: no model installed",
      detail: status.message,
      tone: "off",
    };
  }
  return {
    ready: false,
    fixture: false,
    label: "AI: unavailable",
    detail: status.message,
    tone: "error",
  };
}

const ICONS = {
  ready: ShieldCheck,
  fixture: FlaskConical,
  busy: Loader2,
  off: CircleOff,
  error: AlertTriangle,
} as const;

const TONES = {
  ready: "text-success",
  fixture: "text-warning",
  busy: "text-ink-muted",
  off: "text-ink-muted",
  error: "text-danger",
} as const;

export function AiStatusIcon({
  status,
  className,
}: {
  status: ModelStatus | undefined;
  className?: string;
}) {
  const { tone } = describeAi(status);
  const Icon = ICONS[tone] ?? CircleDashed;
  return (
    <Icon
      className={cn(
        "size-3.5 shrink-0",
        TONES[tone],
        tone === "busy" && "animate-spin",
        className,
      )}
      aria-hidden="true"
    />
  );
}
