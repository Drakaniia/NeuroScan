import { Link } from "@tanstack/react-router";
import { ArrowLeft, FileSpreadsheet, Printer } from "lucide-react";
import { useState } from "react";
import { BrandMark } from "@/components/chrome/BrandMark";
import { Tag } from "@/components/ui/badges";
import { Button } from "@/components/ui/Button";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage, imageUrls } from "@/lib/api/client";
import { useExam, useSettings } from "@/lib/api/queries";
import type { ExamDetail, ImageItem } from "@/lib/api/types";
import { toCsv } from "@/lib/csv";
import {
  AGREEMENT_LABELS,
  formatDate,
  formatDateTime,
  formatPercent,
  IMPRESSION_LABELS,
  PRIORITY_LABELS,
  patientName,
  SEX_LABELS,
  ageInYears,
  STATUS_LABELS,
  VERDICT_LABELS,
} from "@/lib/format";
import { useSession } from "@/lib/session";

function resultsCsv(detail: ExamDetail): string {
  const { patient, exam } = detail;
  return toCsv(
    [
      "accession_number",
      "mrn",
      "patient",
      "study_date",
      "image_seq",
      "file_name",
      "frame",
      "image_sha256",
      "analysis_status",
      "model_id",
      "model_version",
      "model_sha256",
      "model_fixture",
      "probability",
      "verdict",
      "threshold",
      "low_confidence_band",
      "analyzed_at",
      "error",
    ],
    detail.images.map((image) => {
      const record = image.latestAnalysis;
      return [
        exam.accessionNumber,
        patient.mrn,
        patientName(patient),
        exam.studyDate,
        image.seq,
        image.originalName,
        image.frameIndex + 1,
        image.sha256,
        record?.status ?? "not_analyzed",
        record?.modelId ?? "",
        record?.modelVersion ?? "",
        record?.modelSha256 ?? "",
        record ? String(record.modelFixture) : "",
        record?.probability?.toFixed(6) ?? "",
        record?.verdict ?? "",
        record?.threshold ?? "",
        record?.lowConfidenceBand ?? "",
        record?.createdAt ?? "",
        record?.error ?? "",
      ];
    }),
  );
}

function keyImages(images: ImageItem[]): ImageItem[] {
  const flagged = images
    .filter(
      (image) =>
        image.latestAnalysis?.verdict === "positive" ||
        image.latestAnalysis?.verdict === "indeterminate",
    )
    .sort(
      (a, b) =>
        (b.latestAnalysis?.probability ?? 0) -
        (a.latestAnalysis?.probability ?? 0),
    );
  return (flagged.length > 0 ? flagged : images).slice(0, 4);
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3 py-1 text-[13px]">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

export function ReportScreen({ examId }: { examId: string }) {
  const exam = useExam(examId);
  const settings = useSettings();
  const toast = useToast();
  const { can, session } = useSession();
  const [exporting, setExporting] = useState(false);

  if (exam.isLoading) return <Skeleton className="m-6 h-[600px]" />;
  if (exam.isError || !exam.data)
    return (
      <ErrorState error={exam.error} onRetry={() => void exam.refetch()} />
    );

  const detail = exam.data;
  const { patient, exam: summary, review } = detail;
  const signed = review?.status === "signed" && summary.status === "finalized";
  const analyzed = detail.images.filter(
    (image) => image.latestAnalysis?.status === "completed",
  );
  const models = Array.from(
    new Set(
      analyzed.map(
        (image) =>
          `${image.latestAnalysis?.modelName} v${image.latestAnalysis?.modelVersion}`,
      ),
    ),
  );
  const fixture = analyzed.some((image) => image.latestAnalysis?.modelFixture);
  const age = ageInYears(
    patient.birthDate,
    new Date(`${summary.studyDate}T12:00:00`),
  );

  const print = () => {
    void api.reportPrinted(examId).catch(() => {});
    window.print();
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const path = await api.saveExport({
        kind: "csv",
        fileName: `${summary.accessionNumber}_ai_results.csv`,
        text: resultsCsv(detail),
        description: `AI results for ${summary.accessionNumber}`,
        examId,
      });
      if (path) toast.success("Results exported", path);
    } catch (error) {
      toast.error("Export failed", errorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="print-root min-h-0 flex-1 overflow-y-auto">
      <div className="no-print sticky top-0 z-10 px-4 pt-1">
        <div className="material-overlay flex items-center gap-3 rounded-xl py-2 pl-2 pr-2.5">
        <Link
          to="/exams/$examId"
          params={{ examId }}
          className="pressable flex h-7 items-center gap-1 rounded-md px-2 text-[13px] font-medium text-accent hover:bg-black/[0.04]"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Workspace
        </Link>
        <span className="h-4 w-px bg-black/10" aria-hidden="true" />
        <span className="text-sm font-semibold text-ink">Report preview</span>
        {!signed ? (
          <Tag tone="warning">Preliminary · not signed</Tag>
        ) : (
          <Tag tone="success">Signed</Tag>
        )}
        <div className="ml-auto flex gap-2">
          {can("report_export") ? (
            <>
              <Button
                size="sm"
                icon={
                  <FileSpreadsheet className="size-3.5" aria-hidden="true" />
                }
                loading={exporting}
                onClick={() => void exportCsv()}
              >
                Export AI results (CSV)
              </Button>
              <Button
                size="sm"
                variant="primary"
                icon={<Printer className="size-3.5" aria-hidden="true" />}
                onClick={print}
              >
                Print / save as PDF
              </Button>
            </>
          ) : null}
        </div>
        </div>
      </div>

      <article className="print-sheet selectable relative mx-auto my-6 max-w-[820px] rounded-[3px] bg-white px-12 py-10 shadow-[0_0_0_0.5px_rgb(0_0_0/0.1),0_2px_4px_rgb(16_18_27/0.04),0_24px_48px_-16px_rgb(16_18_27/0.22)]">
        {!signed ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
          >
            <span className="-rotate-[24deg] select-none text-[88px] font-bold tracking-widest text-ink/[0.05]">
              PRELIMINARY
            </span>
          </div>
        ) : null}

        <header className="flex items-start justify-between border-b-2 border-ink pb-4">
          <div className="flex items-center gap-3">
            <BrandMark className="size-9" />
            <div>
              <p className="text-lg font-semibold text-ink">
                {settings.data?.facilityName || "NeuroScan"}
              </p>
              {settings.data?.department ? (
                <p className="text-sm text-ink-secondary">
                  {settings.data.department}
                </p>
              ) : null}
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-md font-semibold text-ink">
              Brain MRI screening report
            </h1>
            <p className="text-xs text-ink-muted">
              {signed
                ? "Final"
                : `Preliminary · ${STATUS_LABELS[summary.status]}`}{" "}
              · version {review?.version ?? "—"}
            </p>
          </div>
        </header>

        <section className="print-avoid-break grid grid-cols-2 gap-x-10 border-b border-line py-4">
          <dl>
            <Row label="Patient">{patientName(patient)}</Row>
            <Row label="MRN">
              <span className="font-mono">{patient.mrn}</span>
            </Row>
            <Row label="Sex / age">
              {SEX_LABELS[patient.sex]}
              {age !== null ? ` · ${age} years at study` : ""}
            </Row>
            <Row label="Date of birth">{formatDate(patient.birthDate)}</Row>
          </dl>
          <dl>
            <Row label="Accession">
              <span className="font-mono">{summary.accessionNumber}</span>
            </Row>
            <Row label="Examination">{summary.description}</Row>
            <Row label="Study date">{formatDate(summary.studyDate)}</Row>
            <Row label="Priority">{PRIORITY_LABELS[summary.priority]}</Row>
            {summary.referringPhysician ? (
              <Row label="Referring">{summary.referringPhysician}</Row>
            ) : null}
          </dl>
        </section>

        {summary.clinicalIndication ? (
          <section className="print-avoid-break border-b border-line py-4">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Clinical indication
            </h2>
            <p className="whitespace-pre-wrap text-[13px] text-ink">
              {summary.clinicalIndication}
            </p>
          </section>
        ) : null}

        <section className="border-b border-line py-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Clinician review
          </h2>
          {review?.impression ? (
            <div className="space-y-3 text-[13px]">
              <p>
                <span className="text-ink-muted">Impression: </span>
                <span className="text-md font-semibold text-ink">
                  {IMPRESSION_LABELS[review.impression]}
                </span>
              </p>
              <div>
                <p className="text-ink-muted">Findings</p>
                <p className="whitespace-pre-wrap text-ink">
                  {review.findings || "—"}
                </p>
              </div>
              {review.recommendation ? (
                <div>
                  <p className="text-ink-muted">Recommendation</p>
                  <p className="whitespace-pre-wrap text-ink">
                    {review.recommendation}
                  </p>
                </div>
              ) : null}
              {review.aiAgreement && review.aiAgreement !== "not_applicable" ? (
                <p>
                  <span className="text-ink-muted">
                    Concordance with AI screening:{" "}
                  </span>
                  {AGREEMENT_LABELS[review.aiAgreement]}
                </p>
              ) : null}
              {review.amendmentReason ? (
                <p className="text-ink-secondary">
                  <span className="text-ink-muted">
                    Amended (version {review.version}):{" "}
                  </span>
                  {review.amendmentReason}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-[13px] text-ink-muted">
              No clinician review has been recorded.
            </p>
          )}
        </section>

        <section className="print-avoid-break border-b border-line py-4">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            AI screening (decision support)
          </h2>
          {analyzed.length > 0 ? (
            <>
              <p className="mb-2 text-xs text-ink-secondary">
                {models.join(", ")} · {analyzed.length} of{" "}
                {detail.images.length} images analyzed · overall{" "}
                <strong>
                  {summary.ai.overall
                    ? VERDICT_LABELS[summary.ai.overall]
                    : "—"}
                </strong>
                {fixture
                  ? " · PRODUCED BY AN UNTRAINED TEST FIXTURE — NOT CLINICAL"
                  : ""}
              </p>
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-line text-left text-ink-muted">
                    <th className="py-1 pr-2 font-medium">#</th>
                    <th className="py-1 pr-2 font-medium">Image</th>
                    <th className="py-1 pr-2 text-right font-medium">
                      Probability
                    </th>
                    <th className="py-1 pr-2 text-right font-medium">
                      Threshold
                    </th>
                    <th className="py-1 font-medium">AI result</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.images.map((image) => {
                    const record = image.latestAnalysis;
                    return (
                      <tr key={image.id} className="border-b border-line/60">
                        <td className="py-1 pr-2 tabular">{image.seq}</td>
                        <td className="max-w-[300px] truncate py-1 pr-2">
                          {image.originalName}
                          {image.frameCount > 1
                            ? ` (frame ${image.frameIndex + 1})`
                            : ""}
                        </td>
                        <td className="py-1 pr-2 text-right tabular">
                          {formatPercent(record?.probability ?? null)}
                        </td>
                        <td className="py-1 pr-2 text-right tabular">
                          {formatPercent(record?.threshold ?? null)}
                        </td>
                        <td className="py-1">
                          {record?.status === "failed"
                            ? "Analysis failed"
                            : record?.verdict
                              ? VERDICT_LABELS[record.verdict]
                              : "Not analyzed"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          ) : (
            <p className="text-[13px] text-ink-muted">
              AI analysis was not performed for this examination.
            </p>
          )}
        </section>

        {detail.images.length > 0 ? (
          <section className="print-avoid-break border-b border-line py-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Key images
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {keyImages(detail.images).map((image) => (
                <figure key={image.id}>
                  <img
                    src={imageUrls.render(
                      image.id,
                      image.windowCenter,
                      image.windowWidth,
                      image.invert,
                    )}
                    alt={`Key slice ${image.seq}, ${image.originalName}`}
                    className="aspect-square w-full rounded bg-black object-contain"
                  />
                  <figcaption className="mt-1 text-[11px] text-ink-secondary">
                    Image {image.seq}
                    {image.latestAnalysis?.verdict
                      ? ` · AI ${formatPercent(image.latestAnalysis.probability)}`
                      : ""}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        <footer className="pt-4 text-[12px]">
          {signed && review ? (
            <p className="text-ink">
              Electronically signed by <strong>{review.signedByName}</strong> on{" "}
              {formatDateTime(review.signedAt)}.
            </p>
          ) : (
            <p className="font-semibold text-warning-ink">
              Preliminary report — not signed. Not for clinical decision-making.
            </p>
          )}
          <p className="mt-2 leading-relaxed text-ink-muted">
            AI screening results are produced by software intended as decision
            support for qualified clinicians. They are not a diagnosis, have not
            been clinically validated at this site, and must be interpreted
            together with the images and the clinical context. The clinician
            review above is the conclusion of record.
          </p>
          <p className="mt-2 text-ink-faint">
            Generated {formatDateTime(new Date().toISOString())} by{" "}
            {session?.user.fullName ?? "—"} · NeuroScan
          </p>
        </footer>
      </article>
    </div>
  );
}
