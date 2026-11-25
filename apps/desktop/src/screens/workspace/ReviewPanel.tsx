import { Link, useBlocker } from "@tanstack/react-router";
import {
  CheckCircle2,
  FileText,
  History,
  PenLine,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ImpressionBadge } from "@/components/ui/badges";
import { Button, buttonVariants } from "@/components/ui/Button";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Callout } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { ApiError, errorMessage } from "@/lib/api/client";
import {
  useAmendReview,
  useSaveReview,
  useSignReview,
} from "@/lib/api/queries";
import type {
  AiAgreement,
  ExamDetail,
  Impression,
  ReviewInput,
} from "@/lib/api/types";
import {
  AGREEMENT_LABELS,
  formatDateTime,
  IMPRESSION_LABELS,
} from "@/lib/format";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const IMPRESSIONS: Impression[] = [
  "tumor_suspected",
  "no_tumor",
  "indeterminate",
  "non_diagnostic",
];
const AGREEMENTS: AiAgreement[] = ["agree", "partial", "disagree"];

function toInput(review: ExamDetail["review"]): ReviewInput {
  return {
    impression: review?.impression ?? null,
    aiAgreement:
      review?.aiAgreement === "not_applicable"
        ? null
        : (review?.aiAgreement ?? null),
    findings: review?.findings ?? "",
    recommendation: review?.recommendation ?? "",
  };
}

function ChoiceList<T extends string>({
  name,
  legend,
  value,
  options,
  labels,
  onChange,
  disabled,
  error,
}: {
  name: string;
  legend: string;
  value: T | null;
  options: T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
  disabled?: boolean;
  error?: string | null;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-medium text-ink-secondary">
        {legend}
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      </legend>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((option) => (
          <label
            key={option}
            className={cn(
              "pressable relative flex min-h-9 cursor-default items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-[13px] has-[:focus-visible]:shadow-focus",
              value === option
                ? "bg-accent-soft font-medium text-accent-ink shadow-[inset_0_0_0_1px_rgb(var(--ns-accent))]"
                : "bg-surface text-ink shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.14)] hover:bg-surface-muted",
              disabled && "pointer-events-none opacity-60",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              disabled={disabled}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {labels[option]}
            <span
              aria-hidden="true"
              className={cn(
                "flex size-4 shrink-0 items-center justify-center rounded-full transition-colors duration-fast",
                value === option
                  ? "bg-accent text-white"
                  : "shadow-[inset_0_0_0_1px_rgb(0_0_0/0.2)]",
              )}
            >
              {value === option ? (
                <CheckCircle2 className="size-4" aria-hidden="true" />
              ) : null}
            </span>
          </label>
        ))}
      </div>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-danger-ink">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export function ReviewPanel({ detail }: { detail: ExamDetail }) {
  const { can, session } = useSession();
  const toast = useToast();
  const review = detail.review;
  const finalized = detail.exam.status === "finalized";
  const signer = can("review_sign");
  const editable = signer && !finalized;
  const hasAi = detail.exam.ai.analyzedCount > 0;
  const analyzing = detail.exam.status === "analyzing";

  const [input, setInput] = useState<ReviewInput>(() => toInput(review));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [signOpen, setSignOpen] = useState(false);
  const [amendOpen, setAmendOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const save = useSaveReview(detail.exam.id);
  const sign = useSignReview(detail.exam.id);
  const amend = useAmendReview(detail.exam.id);

  const reviewKey = `${review?.id ?? "none"}:${review?.updatedAt ?? ""}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only when a different saved version arrives
  useEffect(() => {
    setInput(toInput(review));
    setErrors({});
  }, [reviewKey]);

  const saved = useMemo(() => toInput(review), [review]);
  const dirty = JSON.stringify(saved) !== JSON.stringify(input);
  const blocker = useBlocker({
    shouldBlockFn: () => editable && dirty,
    enableBeforeUnload: () => editable && dirty,
    withResolver: true,
  });

  const update = <K extends keyof ReviewInput>(
    key: K,
    value: ReviewInput[K],
  ) => {
    setInput((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };

  const validateForSigning = () => {
    const found: Record<string, string> = {};
    if (!input.impression) found.impression = "Select an impression.";
    if (!input.findings.trim()) found.findings = "Document your findings.";
    if (hasAi && !input.aiAgreement)
      found.aiAgreement = "Record whether you agree with the AI result.";
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const saveDraft = async () => {
    try {
      await save.mutateAsync({
        ...input,
        aiAgreement: hasAi ? input.aiAgreement : null,
      });
      toast.success("Draft saved", "The review is saved but not signed.");
    } catch (error) {
      if (error instanceof ApiError && error.field)
        setErrors({ [error.field]: error.message });
      else toast.error("Draft not saved", errorMessage(error));
    }
  };

  if (!signer && !review) {
    return (
      <div className="p-4">
        <Callout tone="info" title="Awaiting clinician review">
          A radiologist records and signs the clinical impression. Your role can
          view the review once it is written.
        </Callout>
      </div>
    );
  }

  const readOnly = !editable;

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="type-headline text-ink">Clinician review</h3>
          <p className="text-xs text-ink-muted">
            {review
              ? review.status === "signed"
                ? `Version ${review.version} · signed ${formatDateTime(review.signedAt)} by ${review.signedByName ?? "—"}`
                : `Version ${review.version} draft · last saved ${formatDateTime(review.updatedAt)}${review.authorName ? ` by ${review.authorName}` : ""}`
              : "No review recorded yet."}
          </p>
        </div>
        {review ? (
          <ImpressionBadge
            impression={review.impression}
            signed={review.status === "signed"}
          />
        ) : null}
      </div>

      {review?.amendmentReason ? (
        <Callout tone="info" title={`Amendment (version ${review.version})`}>
          {review.amendmentReason}
        </Callout>
      ) : null}

      {finalized ? (
        <Callout tone="success" title="Report finalized">
          The signed report is locked.{" "}
          {signer
            ? "Reopen it for amendment to make a correction; the signed version is kept."
            : ""}
        </Callout>
      ) : analyzing ? (
        <Callout tone="info">
          AI analysis is running. You can draft the review; signing is available
          when it finishes.
        </Callout>
      ) : null}

      {hasAi ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2 shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.07)]">
          <span className="text-xs text-ink-secondary">
            AI screening result for this examination
          </span>
          <VerdictBadge verdict={detail.exam.ai.overall} size="sm" />
        </div>
      ) : (
        <p className="text-xs text-ink-muted">
          No AI results exist for this examination; the review stands on its
          own.
        </p>
      )}

      <ChoiceList
        name="impression"
        legend="Impression"
        value={input.impression}
        options={IMPRESSIONS}
        labels={IMPRESSION_LABELS}
        onChange={(value) => update("impression", value)}
        disabled={readOnly}
        error={errors.impression}
      />

      {hasAi ? (
        <ChoiceList
          name="aiAgreement"
          legend="Concordance with AI"
          value={input.aiAgreement}
          options={AGREEMENTS}
          labels={AGREEMENT_LABELS}
          onChange={(value) => update("aiAgreement", value)}
          disabled={readOnly}
          error={errors.aiAgreement}
        />
      ) : null}

      <Field
        label="Findings"
        required
        error={errors.findings}
        aside={`${input.findings.length}/5000`}
      >
        {({ id, describedBy, invalid }) => (
          <Textarea
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            rows={6}
            maxLength={5000}
            readOnly={readOnly}
            placeholder="Describe what you observed in the images: location, size, signal characteristics, mass effect…"
            value={input.findings}
            onChange={(event) => update("findings", event.target.value)}
          />
        )}
      </Field>
      <Field
        label="Recommendation"
        error={errors.recommendation}
        aside={`${input.recommendation.length}/2000`}
      >
        {({ id, describedBy, invalid }) => (
          <Textarea
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            rows={3}
            maxLength={2000}
            readOnly={readOnly}
            placeholder="Follow-up imaging, referral, correlation with clinical findings…"
            value={input.recommendation}
            onChange={(event) => update("recommendation", event.target.value)}
          />
        )}
      </Field>

      <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-wrap items-center gap-1.5 border-t border-line/70 bg-surface/85 px-3 py-2.5 backdrop-blur-xl">
        {editable && dirty ? (
          <p className="w-full text-2xs font-medium text-warning-ink">
            Unsaved changes — save draft or sign before leaving.
          </p>
        ) : null}
        {editable ? (
          <>
            <Button
              size="sm"
              className="px-2"
              icon={<Save className="size-3.5" aria-hidden="true" />}
              onClick={() => void saveDraft()}
              loading={save.isPending}
              disabled={!dirty}
            >
              Save draft
            </Button>
            <Button
              size="sm"
              variant="primary"
              className="px-2"
              icon={<ShieldCheck className="size-3.5" aria-hidden="true" />}
              disabled={analyzing || detail.images.length === 0}
              title={
                detail.images.length === 0
                  ? "Import images before signing"
                  : undefined
              }
              onClick={() => {
                if (validateForSigning()) setSignOpen(true);
              }}
            >
              Sign &amp; finalize
            </Button>
          </>
        ) : null}
        {finalized && signer ? (
          <Button
            size="sm"
            className="px-2"
            icon={<RotateCcw className="size-3.5" aria-hidden="true" />}
            onClick={() => setAmendOpen(true)}
          >
            Amend report
          </Button>
        ) : null}
        <Link
          to="/exams/$examId/report"
          params={{ examId: detail.exam.id }}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "px-2")}
        >
          <FileText className="size-3.5" aria-hidden="true" />
          Report
        </Link>
        {detail.reviewHistory.length > 1 ? (
          <Button
            size="sm"
            variant="ghost"
            className="px-2"
            icon={<History className="size-3.5" aria-hidden="true" />}
            onClick={() => setHistoryOpen(true)}
          >
            Versions ({detail.reviewHistory.length})
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={blocker.status === "blocked"}
        onClose={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
        title="Discard unsaved review changes?"
        description="Your draft findings and impression have not been saved. Leaving this screen will discard them."
        confirmLabel="Discard changes"
        tone="danger"
      />

      <SignDialog
        open={signOpen}
        onClose={() => setSignOpen(false)}
        signerName={session?.user.fullName ?? ""}
        input={input}
        hasAi={hasAi}
        pending={sign.isPending}
        onSign={async (password) => {
          try {
            await sign.mutateAsync({
              input: {
                ...input,
                aiAgreement: hasAi ? input.aiAgreement : null,
              },
              password,
            });
            setSignOpen(false);
            toast.success("Report signed", "The examination is finalized.");
            return null;
          } catch (error) {
            if (
              error instanceof ApiError &&
              error.field &&
              error.field !== "password"
            ) {
              setSignOpen(false);
              setErrors({ [error.field]: error.message });
              return null;
            }
            return errorMessage(error);
          }
        }}
      />

      <AmendDialog
        open={amendOpen}
        onClose={() => setAmendOpen(false)}
        pending={amend.isPending}
        onAmend={async (reason) => {
          try {
            await amend.mutateAsync(reason);
            setAmendOpen(false);
            toast.info(
              "Report reopened",
              "Edit the new draft version, then sign it again.",
            );
            return null;
          } catch (error) {
            return errorMessage(error);
          }
        }}
      />

      <Dialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Review versions"
        size="lg"
      >
        <ol className="space-y-3">
          {detail.reviewHistory.map((version) => (
            <li
              key={version.id}
              className="rounded-xl bg-surface-muted p-3.5 shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.07)]"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">
                  Version {version.version}{" "}
                  <span className="font-normal text-ink-muted">
                    {version.status === "signed"
                      ? `· signed ${formatDateTime(version.signedAt)} by ${version.signedByName ?? "—"}`
                      : "· draft"}
                  </span>
                </p>
                <ImpressionBadge
                  impression={version.impression}
                  signed={version.status === "signed"}
                />
              </div>
              {version.amendmentReason ? (
                <p className="mt-1 text-xs text-ink-secondary">
                  Amendment reason: {version.amendmentReason}
                </p>
              ) : null}
              <p className="selectable mt-2 whitespace-pre-wrap text-sm text-ink">
                {version.findings || "—"}
              </p>
              {version.recommendation ? (
                <p className="selectable mt-1 whitespace-pre-wrap text-sm text-ink-secondary">
                  {version.recommendation}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      </Dialog>
    </div>
  );
}

function SignDialog({
  open,
  onClose,
  signerName,
  input,
  hasAi,
  pending,
  onSign,
}: {
  open: boolean;
  onClose: () => void;
  signerName: string;
  input: ReviewInput;
  hasAi: boolean;
  pending: boolean;
  onSign: (password: string) => Promise<string | null>;
}) {
  const [password, setPassword] = useState("");
  const [attested, setAttested] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPassword("");
      setAttested(false);
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    if (!attested) {
      setError("Confirm the attestation to sign.");
      return;
    }
    if (!password) {
      setError("Enter your password to sign.");
      return;
    }
    const failure = await onSign(password);
    if (failure) {
      setError(failure);
      setPassword("");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Sign and finalize report"
      description="Signing locks the report and records your electronic signature in the audit log."
      role="alertdialog"
      dismissible={!pending}
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={pending}
            icon={<CheckCircle2 className="size-4" aria-hidden="true" />}
            onClick={() => void submit()}
          >
            Sign report
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <dl className="grid grid-cols-[120px_1fr] gap-y-1 text-sm">
          <dt className="text-ink-muted">Impression</dt>
          <dd className="font-medium text-ink">
            {input.impression ? IMPRESSION_LABELS[input.impression] : "—"}
          </dd>
          {hasAi ? (
            <>
              <dt className="text-ink-muted">AI concordance</dt>
              <dd className="text-ink">
                {input.aiAgreement ? AGREEMENT_LABELS[input.aiAgreement] : "—"}
              </dd>
            </>
          ) : null}
          <dt className="text-ink-muted">Signer</dt>
          <dd className="text-ink">{signerName}</dd>
        </dl>
        <Checkbox
          checked={attested}
          onChange={setAttested}
          label="I have personally reviewed the images"
          description="This conclusion is my own clinical judgement. AI output was used, if at all, as decision support only."
        />
        <Field label="Password" required error={error}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              type="password"
              autoComplete="current-password"
              data-autofocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}
        </Field>
        <button
          type="submit"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </form>
    </Dialog>
  );
}

function AmendDialog({
  open,
  onClose,
  pending,
  onAmend,
}: {
  open: boolean;
  onClose: () => void;
  pending: boolean;
  onAmend: (reason: string) => Promise<string | null>;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    if (reason.trim().length < 5) {
      setError(
        "Describe why the signed report is being amended (at least 5 characters).",
      );
      return;
    }
    const failure = await onAmend(reason.trim());
    if (failure) setError(failure);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Reopen report for amendment"
      description="The signed version is kept unchanged. A new draft version is created and must be signed again."
      role="alertdialog"
      dismissible={!pending}
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={pending}
            icon={<PenLine className="size-4" aria-hidden="true" />}
            onClick={() => void submit()}
          >
            Reopen for amendment
          </Button>
        </>
      }
    >
      <Field
        label="Reason for amendment"
        required
        error={error}
        aside={`${reason.length}/500`}
      >
        {({ id, describedBy, invalid }) => (
          <Textarea
            id={id}
            aria-describedby={describedBy}
            invalid={invalid}
            rows={3}
            maxLength={500}
            data-autofocus
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        )}
      </Field>
    </Dialog>
  );
}
