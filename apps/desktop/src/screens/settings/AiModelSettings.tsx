import { useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CircleDashed,
  FolderOpen,
  RefreshCw,
  RotateCcw,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { AiStatusIcon, describeAi } from "@/components/ai/AiStatusIndicator";
import { Button } from "@/components/ui/Button";
import {
  Callout,
  DefinitionList,
  Panel,
  Spinner,
} from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api/client";
import { keys, useAiStatus, useSettings } from "@/lib/api/queries";
import type { CheckStatus, ModelStatus, SourceKind } from "@/lib/api/types";
import { formatBytes, formatDateTime, formatPercent } from "@/lib/format";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const SOURCE_LABELS: Record<SourceKind, string> = {
  configured: "Folder chosen in Settings",
  environment: "NEUROSCAN_MODEL_DIR environment variable",
  app_data: "Workstation model folder",
  bundled: "Bundled with the installer",
  development: "Development checkout",
};

const CHECK_ICON: Record<
  CheckStatus,
  { icon: typeof CheckCircle2; className: string; label: string }
> = {
  passed: { icon: CheckCircle2, className: "text-success", label: "Passed" },
  warning: { icon: TriangleAlert, className: "text-warning", label: "Warning" },
  failed: { icon: XCircle, className: "text-danger", label: "Failed" },
  skipped: {
    icon: CircleDashed,
    className: "text-ink-faint",
    label: "Not run",
  },
};

function performanceItems(
  performance: unknown,
): { label: string; value: string }[] {
  if (!performance || typeof performance !== "object") return [];
  return Object.entries(performance as Record<string, unknown>).map(
    ([label, value]) => ({
      label: label.replace(/_/g, " "),
      value:
        typeof value === "number"
          ? value <= 1 && value >= 0
            ? `${formatPercent(value)} (${value})`
            : String(value)
          : typeof value === "object"
            ? JSON.stringify(value)
            : String(value),
    }),
  );
}

/**
 * Where the model comes from, whether it passed validation, and what it is.
 * Every value shown comes from the backend's validation run or the model's
 * own manifest; nothing is assumed.
 */
export function AiModelSettings() {
  const ai = useAiStatus();
  const settings = useSettings();
  const client = useQueryClient();
  const toast = useToast();
  const { can } = useSession();
  const [busy, setBusy] = useState<null | "reload" | "choose" | "reset">(null);
  const manage = can("model_manage");
  const status = ai.data;
  const availability = describeAi(status);

  const run = async (
    kind: "reload" | "choose" | "reset",
    action: () => Promise<ModelStatus | null>,
  ) => {
    setBusy(kind);
    try {
      const next = await action();
      if (next) {
        client.setQueryData(keys.aiStatus, next);
        await client.invalidateQueries({ queryKey: keys.settings });
        if (next.state === "ready")
          toast.success("AI model ready", next.message);
        else if (next.state === "not_installed")
          toast.info("No AI model installed", next.message);
        else toast.error("AI model not loaded", next.message);
      }
    } catch (error) {
      toast.error("Action failed", errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  if (!status) return <Spinner label="Reading model status…" />;
  const model = status.model;

  return (
    <div className="space-y-4">
      <Panel
        title={
          <span className="flex items-center gap-2">
            <AiStatusIcon status={status} />
            {availability.label.replace(/^AI: /, "")}
          </span>
        }
        description={`Checked ${formatDateTime(status.updatedAt)}`}
        actions={
          manage ? (
            <>
              <Button
                size="sm"
                icon={<RefreshCw className="size-3.5" aria-hidden="true" />}
                loading={busy === "reload"}
                disabled={busy !== null}
                onClick={() => void run("reload", api.aiReload)}
              >
                Re-check and reload
              </Button>
              <Button
                size="sm"
                variant="primary"
                icon={<FolderOpen className="size-3.5" aria-hidden="true" />}
                loading={busy === "choose"}
                disabled={busy !== null}
                onClick={() => void run("choose", api.aiChooseModelDirectory)}
              >
                Choose model folder…
              </Button>
            </>
          ) : null
        }
        bodyClassName="space-y-4 p-4"
      >
        {status.state === "ready" && model?.fixture ? (
          <Callout tone="warning" title="Integration-test fixture">
            This model has untrained random weights. It exists to test the
            application's model pipeline. Every result it produces is labelled
            as non-clinical. Install the trained model before clinical use.
          </Callout>
        ) : status.state === "ready" ? (
          <Callout tone="success">{status.message}</Callout>
        ) : status.state === "not_installed" ? (
          <Callout tone="info" title="No AI model installed">
            AI analysis is disabled; every other function works. To install a
            model, place <code>run-config.json</code> and the ONNX file in the
            workstation model folder below, or choose a folder. The model is
            validated before it is ever used.
          </Callout>
        ) : status.state === "error" ? (
          <Callout tone="danger" title="Model failed validation">
            {status.message}
          </Callout>
        ) : (
          <Spinner label={status.message} />
        )}

        <div>
          <h3 className="mb-2 text-xs font-medium text-ink-muted">
            Model source
          </h3>
          {status.source ? (
            <p className="selectable text-sm text-ink">
              <span className="font-medium">
                {SOURCE_LABELS[status.source.kind]}
              </span>
              <span className="block break-all font-mono text-xs text-ink-secondary">
                {status.source.directory}
              </span>
            </p>
          ) : null}
          {status.searched.length > 0 && !status.source ? (
            <ul className="space-y-1">
              {status.searched.map((location) => (
                <li
                  key={location.directory}
                  className="selectable text-xs text-ink-secondary"
                >
                  <span className="font-medium text-ink">
                    {SOURCE_LABELS[location.kind]}:
                  </span>{" "}
                  <span className="break-all font-mono">
                    {location.directory}
                  </span>{" "}
                  <span className="text-ink-muted">
                    ({location.hasManifest ? "manifest found" : "no manifest"})
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {manage && settings.data?.modelDirectory ? (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2"
              icon={<RotateCcw className="size-3.5" aria-hidden="true" />}
              loading={busy === "reset"}
              disabled={busy !== null}
              onClick={() =>
                void run("reset", () => api.aiSetModelDirectory(null))
              }
            >
              Use the default model locations
            </Button>
          ) : null}
        </div>

        {status.checks.length > 0 ? (
          <div>
            <h3 className="mb-2 text-xs font-medium text-ink-muted">
              Validation
            </h3>
            <ol className="divide-y divide-line/70 overflow-hidden rounded-xl bg-surface-muted shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.07)]">
              {status.checks.map((check) => {
                const {
                  icon: Icon,
                  className,
                  label,
                } = CHECK_ICON[check.status];
                return (
                  <li
                    key={check.id}
                    className="flex items-start gap-2.5 px-3.5 py-2.5"
                  >
                    <Icon
                      className={cn("mt-0.5 size-4 shrink-0", className)}
                      aria-label={label}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">
                        {check.label}
                      </p>
                      {check.detail ? (
                        <p className="selectable break-words text-xs text-ink-secondary">
                          {check.detail}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : null}
      </Panel>

      {model ? (
        <Panel
          title="Model details"
          description="From the model's manifest and the loaded ONNX graph."
          bodyClassName="space-y-5 p-4"
        >
          <DefinitionList
            columns={3}
            items={[
              { label: "Name", value: model.name },
              { label: "Version", value: model.version },
              { label: "Identifier", value: model.id, mono: true },
              { label: "Runtime", value: model.runtime },
              {
                label: "File",
                value: `${model.fileName} · ${formatBytes(model.fileSize)}`,
              },
              { label: "Created", value: model.created ?? "—" },
              {
                label: "Input",
                value: `${model.inputWidth}×${model.inputHeight} · ${model.inputChannels} channel${model.inputChannels === 1 ? "" : "s"} · ${model.inputLayout}`,
              },
              {
                label: "Decision threshold τ",
                value: formatPercent(model.threshold),
              },
              {
                label: "Indeterminate band",
                value: `± ${formatPercent(model.lowConfidenceBand)}`,
              },
              {
                label: "Classes",
                value: model.classes
                  .map(
                    (item) =>
                      `${item.display_name ?? item.label} (${item.finding})`,
                  )
                  .join(", "),
              },
              {
                label: "Explainability",
                value: model.explainability ?? "None",
              },
              {
                label: "Load / self-test",
                value: `${model.loadMs} ms / ${model.selfTestMs} ms`,
              },
            ]}
          />
          <DefinitionList
            columns={1}
            items={[
              {
                label: "SHA-256",
                value: `${model.sha256}${model.sha256Declared ? " (verified against manifest)" : " (not declared in manifest)"}`,
                mono: true,
              },
              ...(model.description
                ? [{ label: "Description", value: model.description }]
                : []),
              ...(model.intendedUse
                ? [{ label: "Intended use", value: model.intendedUse }]
                : []),
              ...(model.trainingData
                ? [{ label: "Training data", value: model.trainingData }]
                : []),
            ]}
          />
          {performanceItems(model.performance).length > 0 ? (
            <div>
              <h3 className="mb-2 text-xs font-medium text-ink-muted">
                Reported evaluation (from the manifest, as supplied by the
                model's developers)
              </h3>
              <DefinitionList
                columns={3}
                items={performanceItems(model.performance)}
              />
            </div>
          ) : null}
          {model.limitations.length > 0 ? (
            <div>
              <h3 className="mb-2 text-xs font-medium text-ink-muted">
                Stated limitations
              </h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-ink-secondary">
                {model.limitations.map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <h3 className="mb-2 text-xs font-medium text-ink-muted">
              Graph signature
            </h3>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-ink-muted">
                  <th className="py-1 font-medium">Direction</th>
                  <th className="py-1 font-medium">Tensor</th>
                  <th className="py-1 font-medium">Type</th>
                  <th className="py-1 font-medium">Shape</th>
                </tr>
              </thead>
              <tbody className="font-mono text-ink-secondary">
                {[
                  ...model.signature.inputs.map(
                    (spec) => ["input", spec] as const,
                  ),
                  ...model.signature.outputs.map(
                    (spec) => ["output", spec] as const,
                  ),
                ].map(([direction, spec]) => (
                  <tr
                    key={`${direction}-${spec.name}`}
                    className="border-t border-line"
                  >
                    <td className="py-1 font-sans">{direction}</td>
                    <td className="py-1">{spec.name}</td>
                    <td className="py-1">{spec.elementType}</td>
                    <td className="py-1">
                      [
                      {spec.shape
                        .map((dim) => (dim < 0 ? "?" : dim))
                        .join(", ")}
                      ]
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : null}

      <Panel
        title="Installing or replacing the model"
        bodyClassName="space-y-2 p-4 text-sm text-ink-secondary"
      >
        <p>
          A model package is a folder with two files:{" "}
          <code className="font-mono text-xs">run-config.json</code> (the
          manifest: tensor names, input size and normalisation, classes, and
          decision threshold) and the ONNX network file it references.
        </p>
        <p>
          On start-up and whenever you re-check, NeuroScan validates the folder
          (manifest, SHA-256 checksum, ONNX Runtime session, tensor signature,
          and self-test) and enables AI analysis only if every check passes.
          Results always record the model version and checksum that produced
          them.
        </p>
      </Panel>
    </div>
  );
}
