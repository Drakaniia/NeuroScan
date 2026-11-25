import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Ban,
  Bot,
  FlaskConical,
  History,
  Play,
  RefreshCw,
  Square,
} from "lucide-react";
import { useState } from "react";
import { describeAi } from "@/components/ai/AiStatusIndicator";
import { ProbabilityGauge } from "@/components/ai/ProbabilityGauge";
import { Button } from "@/components/ui/Button";
import { Callout, DefinitionList, ProgressBar } from "@/components/ui/feedback";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { useAiStatus, useAnalysisHistory } from "@/lib/api/queries";
import type {
  AnalysisRecord,
  ExamDetail,
  ImageItem,
  JobProgress,
} from "@/lib/api/types";
import { formatDateTime, formatPercent, VERDICT_HINTS } from "@/lib/format";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export interface AiFindingsPanelProps {
  detail: ExamDetail;
  image: ImageItem | null;
  job: JobProgress | null;
  jobActive: boolean;
  onAnalyze: (scope: "all" | "unanalyzed" | "image") => void;
  onCancel: () => void;
  starting: boolean;
}

function shortHash(hash: string | null | undefined) {
  return hash ? `${hash.slice(0, 12)}…` : "—";
}

function ResultCard({
  record,
  currentSha,
}: {
  record: AnalysisRecord;
  currentSha: string | null;
}) {
  if (record.status === "failed") {
    return (
      <Callout tone="danger" title="Analysis failed for this image">
        {record.error ?? "The model could not process this image."}
        <p className="mt-1 text-2xs text-ink-muted">
          {record.modelName} v{record.modelVersion} ·{" "}
          {formatDateTime(record.createdAt)}
        </p>
      </Callout>
    );
  }
  const stale =
    currentSha !== null &&
    record.modelSha256 !== null &&
    record.modelSha256 !== currentSha;
  return (
    <div className="space-y-3">
      {record.modelFixture ? (
        <Callout tone="warning" title="Produced by the untrained test fixture">
          This result comes from an integration-test model with random weights.
          It carries no medical meaning.
        </Callout>
      ) : null}
      {stale ? (
        <Callout tone="info" title="Produced by a different model version">
          The loaded model has changed since this analysis. Re-analyze to obtain
          a result from the current model.
        </Callout>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div>
          <VerdictBadge verdict={record.verdict} />
          {record.verdict ? (
            <p className="mt-1 text-xs text-ink-muted">
              {VERDICT_HINTS[record.verdict]}
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="tabular text-[32px] font-semibold leading-none tracking-[-0.025em] text-ink">
            {formatPercent(record.probability)}
          </p>
          <p className="mt-1 text-2xs text-ink-muted">screening probability</p>
        </div>
      </div>

      {record.probability !== null &&
      record.threshold !== null &&
      record.verdict ? (
        <ProbabilityGauge
          probability={record.probability}
          threshold={record.threshold}
          band={record.lowConfidenceBand ?? 0}
          verdict={record.verdict}
        />
      ) : null}

      {record.classProbabilities.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium text-ink-muted">
            Class probabilities
          </p>
          <ul className="space-y-1.5">
            {record.classProbabilities.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-xs">
                <span
                  className="w-28 truncate text-ink-secondary"
                  title={item.label}
                >
                  {item.displayName}
                </span>
                <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full",
                      item.finding === "positive"
                        ? "bg-danger/70"
                        : "bg-success/70",
                    )}
                    style={{ width: `${item.probability * 100}%` }}
                  />
                </span>
                <span className="w-12 text-right tabular text-ink">
                  {formatPercent(item.probability)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-xs text-ink-muted">
        {record.activationMap
          ? `Heatmap: class activation map for “${record.activationLabel ?? record.predictedLabel ?? "prediction"}”. It shows the regions that most increased the model's score, not a lesion outline.`
          : "No activation map for this result (the map carried no positive evidence, or the model does not export one)."}
      </p>

      <details className="group rounded-lg bg-surface-muted shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.07)]">
        <summary className="flex cursor-default select-none list-none items-center justify-between px-3 py-2.5 text-xs font-medium text-ink-secondary hover:text-ink [&::-webkit-details-marker]:hidden">
          Provenance and processing
          <span
            aria-hidden="true"
            className="text-ink-faint transition-transform duration-fast group-open:rotate-90"
          >
            ›
          </span>
        </summary>
        <div className="border-t border-line/70 px-3 py-3">
          <DefinitionList
            columns={2}
            items={[
              {
                label: "Model",
                value: `${record.modelName} v${record.modelVersion}`,
              },
              {
                label: "Model checksum",
                value: shortHash(record.modelSha256),
                mono: true,
              },
              { label: "Analyzed", value: formatDateTime(record.createdAt) },
              { label: "By", value: record.createdByName ?? "—" },
              {
                label: "Inference time",
                value:
                  record.latencyMs !== null ? `${record.latencyMs} ms` : "—",
              },
              {
                label: "Model input",
                value: record.preprocessing
                  ? `${record.preprocessing.inputWidth}×${record.preprocessing.inputHeight} · ${record.preprocessing.channels} ch · ${record.preprocessing.layout}`
                  : "—",
              },
              {
                label: "Source",
                value: record.preprocessing
                  ? `${record.preprocessing.sourceWidth}×${record.preprocessing.sourceHeight}, ${record.preprocessing.resize} resize`
                  : "—",
              },
              {
                label: "DICOM window",
                value: record.preprocessing?.dicomWindow
                  ? `L ${Math.round(record.preprocessing.dicomWindow[0])} / W ${Math.round(record.preprocessing.dicomWindow[1])}`
                  : "Not applicable",
              },
            ]}
          />
        </div>
      </details>
    </div>
  );
}

function ImageHistory({
  imageId,
  currentId,
}: {
  imageId: string;
  currentId: string | undefined;
}) {
  const history = useAnalysisHistory(imageId);
  const previous = (history.data ?? []).filter(
    (record) => record.id !== currentId,
  );
  if (previous.length === 0) return null;
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ink-muted">
        <History className="size-3" aria-hidden="true" />
        Earlier analyses of this image
      </p>
      <ul className="divide-y divide-line/70 rounded-lg bg-surface-muted shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.07)]">
        {previous.map((record) => (
          <li
            key={record.id}
            className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
          >
            <span className="text-ink-muted">
              {formatDateTime(record.createdAt)}
            </span>
            <span className="truncate text-ink-secondary">
              v{record.modelVersion}
            </span>
            {record.status === "failed" ? (
              <span className="text-danger-ink">failed</span>
            ) : (
              <span className="tabular text-ink">
                {formatPercent(record.probability)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AiFindingsPanel({
  detail,
  image,
  job,
  jobActive,
  onAnalyze,
  onCancel,
  starting,
}: AiFindingsPanelProps) {
  const ai = useAiStatus();
  const { can } = useSession();
  const availability = describeAi(ai.data);
  const currentSha = ai.data?.model?.sha256 ?? null;
  const finalized = detail.exam.status === "finalized";
  const canRun =
    can("analysis_run") &&
    availability.ready &&
    !finalized &&
    detail.images.length > 0;
  const summary = detail.exam.ai;
  const unanalyzed = detail.images.filter(
    (item) => !item.latestAnalysis,
  ).length;
  const [confirmAll, setConfirmAll] = useState(false);

  return (
    <div className="space-y-4 p-4">
      <section
        aria-label="Examination AI summary"
        className="rounded-xl bg-surface-muted p-3.5 shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.07)]"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Bot className="size-4 text-ink-muted" aria-hidden="true" />
            AI screening
          </h3>
          <VerdictBadge verdict={summary.overall} size="sm" />
        </div>
        <p className="text-xs text-ink-secondary">
          {summary.analyzedCount} of {detail.images.length} images analyzed
          {summary.positiveCount > 0
            ? ` · ${summary.positiveCount} suspected`
            : ""}
          {summary.indeterminateCount > 0
            ? ` · ${summary.indeterminateCount} indeterminate`
            : ""}
          {summary.failedCount > 0 ? ` · ${summary.failedCount} failed` : ""}
          {summary.maxProbability !== null
            ? ` · max ${formatPercent(summary.maxProbability)}`
            : ""}
        </p>

        {jobActive && job ? (
          <div className="mt-3 space-y-1.5" aria-live="polite">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-progress-ink">
                {job.state === "queued"
                  ? "Queued…"
                  : `Analyzing image ${Math.min(job.done + 1, job.total)} of ${job.total}`}
                {job.cancelRequested ? " — stopping after this image" : ""}
              </span>
              <span className="tabular text-ink-muted">
                {job.done}/{job.total}
              </span>
            </div>
            <ProgressBar
              value={job.total ? job.done / job.total : 0}
              label="Analysis progress"
              tone="progress"
            />
            {can("analysis_run") ? (
              <Button
                size="sm"
                variant="ghost"
                icon={<Square className="size-3.5" aria-hidden="true" />}
                onClick={onCancel}
                disabled={job.cancelRequested}
              >
                Stop analysis
              </Button>
            ) : null}
          </div>
        ) : job && (job.state === "failed" || job.error) && job.finishedAt ? (
          <Callout tone="warning" className="mt-3">
            {job.error ?? "The last analysis did not complete."}
          </Callout>
        ) : null}

        {!jobActive ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {canRun ? (
              unanalyzed > 0 ? (
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Play className="size-3.5" aria-hidden="true" />}
                  loading={starting}
                  onClick={() => onAnalyze("unanalyzed")}
                >
                  Analyze{" "}
                  {unanalyzed === detail.images.length
                    ? "all"
                    : `${unanalyzed} remaining`}
                </Button>
              ) : confirmAll ? (
                <>
                  <Button
                    size="sm"
                    variant="primary"
                    loading={starting}
                    onClick={() => onAnalyze("all")}
                  >
                    Re-analyze all {detail.images.length}
                  </Button>
                  <Button size="sm" onClick={() => setConfirmAll(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  icon={<RefreshCw className="size-3.5" aria-hidden="true" />}
                  onClick={() => setConfirmAll(true)}
                >
                  Re-analyze all
                </Button>
              )
            ) : null}
          </div>
        ) : null}

        {!availability.ready && !jobActive ? (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-muted">
            <Ban className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>
              {availability.detail}{" "}
              {can("model_manage") ? (
                <Link
                  to="/settings"
                  search={{ tab: "ai" }}
                  className="font-medium text-accent hover:underline"
                >
                  Open AI settings
                </Link>
              ) : null}
            </span>
          </p>
        ) : null}
        {finalized ? (
          <p className="mt-3 text-xs text-ink-muted">
            The examination is finalized; reopen it for amendment to re-analyze.
          </p>
        ) : null}
        {availability.fixture ? (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-warning-ink">
            <FlaskConical
              className="mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            Test fixture model loaded — results are not clinical.
          </p>
        ) : null}
      </section>

      {image ? (
        <section aria-label="Selected image result" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3
              className="truncate text-sm font-semibold text-ink"
              title={image.originalName}
            >
              Image {image.seq}: {image.originalName}
              {image.frameCount > 1 ? ` · frame ${image.frameIndex + 1}` : ""}
            </h3>
            {canRun && !jobActive ? (
              <Button
                size="sm"
                variant="ghost"
                icon={<Play className="size-3.5" aria-hidden="true" />}
                onClick={() => onAnalyze("image")}
                disabled={starting}
              >
                {image.latestAnalysis ? "Re-analyze" : "Analyze"}
              </Button>
            ) : null}
          </div>
          {image.warnings.length > 0 ? (
            <Callout tone="warning" title="Input check">
              <ul className="list-disc space-y-0.5 pl-4">
                {image.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </Callout>
          ) : null}
          {jobActive && job?.currentImageId === image.id ? (
            <p className="flex items-center gap-2 text-sm text-progress-ink">
              <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
              Analyzing this image…
            </p>
          ) : image.latestAnalysis ? (
            <ResultCard record={image.latestAnalysis} currentSha={currentSha} />
          ) : (
            <p className="rounded-xl border border-dashed border-line-strong px-3 py-6 text-center text-sm text-ink-muted">
              This image has not been analyzed.
            </p>
          )}
          <ImageHistory
            imageId={image.id}
            currentId={image.latestAnalysis?.id}
          />
        </section>
      ) : null}

      <p className="flex items-start gap-1.5 border-t border-line/70 pt-3 text-2xs leading-relaxed text-ink-muted">
        <AlertTriangle
          className="mt-0.5 size-3 shrink-0 text-warning"
          aria-hidden="true"
        />
        AI output is decision support for a qualified clinician. It is not a
        diagnosis, was trained on brain MRI only, and can be wrong — including
        with high confidence on images it was not designed for.
      </p>
    </div>
  );
}
