import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, Images } from "lucide-react";
import {
  ImpressionBadge,
  PriorityBadge,
  StatusBadge,
} from "@/components/ui/badges";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import type { ExamSummary } from "@/lib/api/types";
import { formatDate, formatPercent, patientName, sexAge } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ExamTableProps {
  exams: ExamSummary[];
  /** Hide the patient column (inside a patient's chart). */
  showPatient?: boolean;
  dense?: boolean;
  caption: string;
}

/**
 * Examinations as a clinical worklist. Each row is one keyboard-reachable
 * link into the workspace; the AI signal and the clinician's impression sit
 * in separate, labelled columns so they are never read as one. Secondary
 * facts (MRN, accession, date, image count) ride under their primary value,
 * so no column wraps.
 */
export function ExamTable({
  exams,
  showPatient = true,
  dense = false,
  caption,
}: ExamTableProps) {
  const navigate = useNavigate();
  const open = (exam: ExamSummary) =>
    void navigate({ to: "/exams/$examId", params: { examId: exam.id } });

  const cell = dense ? "px-2 py-2" : "px-2 py-2.5";
  const head =
    "px-2 pb-2 pt-3 text-xs font-medium text-ink-muted whitespace-nowrap";

  return (
    <section
      // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard-scrollable table region
      tabIndex={0}
      aria-label={caption}
      className="overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
    >
      <table
        className={cn(
          "w-full table-fixed border-collapse text-left text-sm",
          showPatient ? "min-w-[820px]" : "min-w-[620px]",
        )}
      >
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line">
            <th scope="col" className={cn(head, "w-[64px] pl-3")}>
              Priority
            </th>
            {showPatient ? (
              <th scope="col" className={cn(head, "w-[154px]")}>
                Patient
              </th>
            ) : null}
            <th scope="col" className={head}>
              Examination
            </th>
            <th
              scope="col"
              className={cn(head, showPatient ? "w-[156px]" : "w-[162px]")}
            >
              AI screening
            </th>
            <th scope="col" className={cn(head, "w-[126px]")}>
              Status
            </th>
            <th
              scope="col"
              className={cn(head, showPatient ? "w-[156px]" : "w-[164px]")}
            >
              Clinician impression
            </th>
            <th scope="col" className="w-[26px] pr-2">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {exams.map((exam) => (
            <tr
              key={exam.id}
              tabIndex={0}
              aria-label={`Open ${exam.accessionNumber}, ${exam.description}${showPatient ? `, ${patientName(exam.patient)}` : ""}`}
              onClick={() => open(exam)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  open(exam);
                }
              }}
              className="group cursor-pointer border-b border-line/70 transition-colors duration-fast last:border-b-0 hover:bg-black/[0.025] focus-visible:bg-accent-soft/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
            >
              <td className={cn(cell, "pl-3")}>
                <PriorityBadge priority={exam.priority} />
              </td>
              {showPatient ? (
                <td className={cn(cell, "max-w-0")}>
                  <p className="truncate font-semibold text-ink">
                    {patientName(exam.patient)}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    <span className="font-mono text-[11.5px]">
                      {exam.patient.mrn}
                    </span>
                    <span className="mx-1 text-ink-faint">·</span>
                    {sexAge(exam.patient)}
                  </p>
                </td>
              ) : null}
              <td className={cn(cell, "max-w-0")}>
                <p className="truncate text-ink">{exam.description}</p>
                <p className="tabular flex items-center gap-1 truncate text-xs text-ink-muted">
                  <span>{formatDate(exam.studyDate)}</span>
                  <span className="text-ink-faint">·</span>
                  <span className="font-mono text-[11.5px]">
                    {exam.accessionNumber}
                  </span>
                  <span className="text-ink-faint">·</span>
                  <span
                    className="inline-flex items-center gap-0.5"
                    title={`${exam.imageCount} images`}
                  >
                    <Images className="size-3" aria-hidden="true" />
                    {exam.imageCount}
                  </span>
                </p>
              </td>
              <td className={cell}>
                {exam.ai.analyzedCount > 0 ? (
                  <div className="flex flex-col items-start gap-1">
                    <VerdictBadge verdict={exam.ai.overall} size="sm" />
                    <span className="tabular text-2xs text-ink-muted">
                      max {formatPercent(exam.ai.maxProbability)} ·{" "}
                      {exam.ai.analyzedCount}/{exam.imageCount} analyzed
                      {exam.ai.failedCount > 0
                        ? ` · ${exam.ai.failedCount} failed`
                        : ""}
                    </span>
                  </div>
                ) : exam.ai.failedCount > 0 ? (
                  <span className="text-xs font-medium text-danger-ink">
                    Analysis failed
                  </span>
                ) : (
                  <span className="text-xs text-ink-faint">Not analyzed</span>
                )}
              </td>
              <td className={cell}>
                <StatusBadge status={exam.status} />
              </td>
              <td className={cell}>
                <ImpressionBadge
                  impression={exam.review?.impression ?? null}
                  signed={exam.review?.status === "signed"}
                />
                {exam.review?.status === "signed" &&
                exam.review.signedByName ? (
                  <p className="mt-1 truncate text-2xs text-ink-muted">
                    {exam.review.signedByName}
                  </p>
                ) : null}
              </td>
              <td className="pr-2.5">
                <ChevronRight
                  className="size-4 text-ink-faint transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-ink-secondary"
                  aria-hidden="true"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
