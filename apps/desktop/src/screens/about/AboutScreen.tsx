import { BrandMark } from "@/components/chrome/BrandMark";
import { Page } from "@/components/shell/AppShell";
import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/Button";
import { Callout, PageHeader, Panel } from "@/components/ui/feedback";
import { useSession } from "@/lib/session";

const WORKFLOW = [
  [
    "Register or find the patient",
    "Patients › Register patient. Search first to avoid duplicate records; the MRN must be unique.",
  ],
  [
    "Create the examination",
    "From the patient's chart. An accession number is assigned automatically.",
  ],
  [
    "Import the images",
    "DICOM (Part 10), PNG or JPEG — files or a whole folder, or drop them on the workspace. Files are validated, checksummed and copied into the local image store; DICOM patient IDs are checked against the MRN.",
  ],
  [
    "Run AI analysis",
    "Available only when a validated model is loaded. Each image is processed on this workstation; progress and per-image results appear as they are produced.",
  ],
  [
    "Review the images",
    "Window/level, zoom, pan and invert in the viewer; compare the original with the AI heatmap side by side.",
  ],
  [
    "Record and sign the review",
    "The clinician's impression is recorded separately from the AI result, with an explicit concordance statement, and signed with a password.",
  ],
  [
    "Print or export the report",
    "Preliminary until signed. Amendments create a new version and keep the signed one.",
  ],
] as const;

export function AboutScreen() {
  const { appVersion } = useSession();
  const shell = useShell();
  return (
    <Page>
      <PageHeader
        title="About & help"
        actions={
          <Button onClick={shell.showShortcuts}>Keyboard shortcuts</Button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <Panel title="Clinical workflow" bodyClassName="p-4">
            <ol>
              {WORKFLOW.map(([title, text], index) => (
                <li key={title} className="relative flex gap-3.5 pb-4 last:pb-0">
                  {index < WORKFLOW.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-[13px] top-7 w-px bg-line-strong"
                    />
                  ) : null}
                  <span className="tabular relative flex size-[27px] shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-accent-ink shadow-[0_0_0_1px_rgb(var(--ns-accent-line)),0_1px_2px_rgb(16_18_27/0.06)]">
                    {index + 1}
                  </span>
                  <div className="pt-0.5">
                    <p className="text-sm font-semibold text-ink">{title}</p>
                    <p className="text-sm text-ink-secondary">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel
            title="Roles"
            bodyClassName="p-4 text-sm text-ink-secondary space-y-1.5"
          >
            <p>
              <strong className="text-ink">Administrator</strong> — users,
              workstation settings, AI model, audit log, plus all clinical
              functions.
            </p>
            <p>
              <strong className="text-ink">Radiologist</strong> — patients,
              examinations, imports, AI analysis, and signing reports.
            </p>
            <p>
              <strong className="text-ink">Technologist</strong> — patients,
              examinations, imports and AI analysis; cannot sign.
            </p>
            <p>
              <strong className="text-ink">Read-only viewer</strong> — views
              records and reports; cannot change anything.
            </p>
          </Panel>
        </div>
        <div className="space-y-4">
          <Panel bodyClassName="p-4">
            <div className="flex items-center gap-3">
              <BrandMark className="size-12 drop-shadow-[0_4px_10px_rgb(0_86_196/0.3)]" />
              <div>
                <p className="type-title text-ink">NeuroScan</p>
                <p className="text-xs text-ink-muted">
                  Version {appVersion || "—"} · Brain MRI screening workstation
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm text-ink-secondary">
              Offline desktop software. Patient records, images and AI inference
              stay on this workstation; nothing is sent over the network.
            </p>
          </Panel>
          <Callout tone="warning" title="Intended use and limitations">
            NeuroScan is a research and decision-support tool. It is not a
            medical device, has no regulatory clearance, and has not been
            clinically validated. AI results indicate image regions and
            probabilities from a model trained on public 2D brain MRI datasets;
            they can be wrong and must always be reviewed by a qualified
            clinician, who makes every diagnostic decision.
          </Callout>
          <Panel
            title="Data sources for the screening model"
            bodyClassName="p-4 text-xs text-ink-secondary space-y-1.5"
          >
            <p>
              The NeuroScan training pipeline uses the Br35H dataset (Ahmed
              Hamada; record licence string “Data files © Original Authors”) and
              the Brain Tumor MRI dataset (Masoud Nickparvar; CC BY 4.0). The
              model actually loaded reports its own training data under Settings
              › AI model.
            </p>
          </Panel>
        </div>
      </div>
    </Page>
  );
}
