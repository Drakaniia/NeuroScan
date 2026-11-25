import { Link } from "@tanstack/react-router";
import { describeAi } from "@/components/ai/AiStatusIndicator";
import { Callout } from "@/components/ui/feedback";
import { useAiStatus } from "@/lib/api/queries";
import { useSession } from "@/lib/session";

/**
 * Explains, where it matters, that AI analysis is not available — and what
 * still works. Renders nothing when a clinical model is ready.
 */
export function AiAvailabilityBanner({ className }: { className?: string }) {
  const ai = useAiStatus();
  const { can } = useSession();
  const availability = describeAi(ai.data);
  if (availability.tone === "ready" || availability.tone === "busy")
    return null;

  const manage = can("model_manage") ? (
    <Link
      to="/settings"
      search={{ tab: "ai" }}
      className="text-sm font-semibold text-accent hover:underline"
    >
      Configure AI model
    </Link>
  ) : null;

  if (availability.fixture) {
    return (
      <Callout
        tone="warning"
        title="Test fixture model loaded — results are not clinical"
        className={className}
        action={manage}
      >
        The installed model is an untrained integration-test fixture. Its
        outputs are meaningless and are labelled as such everywhere they appear.
        Install the trained model before clinical use.
      </Callout>
    );
  }

  return (
    <Callout
      tone={availability.tone === "error" ? "danger" : "info"}
      title={
        availability.tone === "error"
          ? "AI analysis is unavailable"
          : "No AI model is installed"
      }
      className={className}
      action={manage}
    >
      {availability.detail} Examinations can still be created, imaged, viewed
      and reported by a clinician without AI assistance.
    </Callout>
  );
}
