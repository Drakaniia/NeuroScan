import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, FilePlus2, Pencil, Stethoscope } from "lucide-react";
import { useState } from "react";
import { Page } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/Button";
import {
  DefinitionList,
  EmptyState,
  ErrorState,
  Panel,
  Skeleton,
} from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { usePatient } from "@/lib/api/queries";
import {
  ageInYears,
  formatDate,
  formatDateTime,
  patientName,
  SEX_LABELS,
} from "@/lib/format";
import { useSession } from "@/lib/session";
import { ExamFormDialog } from "@/screens/exams/ExamFormDialog";
import { ExamTable } from "@/screens/exams/ExamTable";
import { PatientFormDialog } from "./PatientFormDialog";

export function PatientDetailScreen({ patientId }: { patientId: string }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { can } = useSession();
  const detail = usePatient(patientId);
  const [editing, setEditing] = useState(false);
  const [creatingExam, setCreatingExam] = useState(false);

  if (detail.isLoading) {
    return (
      <Page>
        <Skeleton className="mb-4 h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </Page>
    );
  }
  if (detail.isError || !detail.data) {
    return (
      <Page>
        <ErrorState
          error={detail.error}
          onRetry={() => void detail.refetch()}
          title="The patient record could not be opened"
        />
      </Page>
    );
  }

  const { patient, exams } = detail.data;
  const age = ageInYears(patient.birthDate);
  const open = exams.filter((exam) => exam.status !== "finalized").length;

  return (
    <Page>
      <Link
        to="/patients"
        className="pressable mb-4 inline-flex items-center gap-1 rounded-md py-1 pr-2 text-[13px] font-medium text-accent hover:text-accent-hover"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Patients
      </Link>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[rgb(150_154_164)] to-[rgb(100_104_114)] text-xl font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_6px_16px_-6px_rgb(16_18_27/0.35)]"
          >
            {patient.familyName[0]}
            {patient.givenName[0]}
          </span>
          <div className="min-w-0">
            <h1 className="selectable type-display text-ink">
              {patientName(patient)}
            </h1>
            <p className="selectable mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-secondary">
              <span className="rounded-md bg-black/[0.05] px-1.5 py-0.5 font-mono text-xs font-medium text-ink">
                {patient.mrn}
              </span>
              <span>{SEX_LABELS[patient.sex]}</span>
              <span className="text-ink-faint">·</span>
              <span>
                {patient.birthDate
                  ? `Born ${formatDate(patient.birthDate)}`
                  : "Date of birth not recorded"}
                {age !== null ? ` (${age} y)` : ""}
              </span>
              {patient.phone ? (
                <>
                  <span className="text-ink-faint">·</span>
                  <span>{patient.phone}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {can("patient_write") ? (
            <Button
              icon={<Pencil className="size-4" aria-hidden="true" />}
              onClick={() => setEditing(true)}
            >
              Edit details
            </Button>
          ) : null}
          {can("exam_write") ? (
            <Button
              variant="primary"
              icon={<FilePlus2 className="size-4" aria-hidden="true" />}
              onClick={() => setCreatingExam(true)}
            >
              New examination
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_272px]">
        <Panel
          title="Examinations"
          description={`${exams.length} total · ${open} open`}
          bodyClassName="min-h-[120px]"
        >
          {exams.length > 0 ? (
            <ExamTable
              exams={exams}
              showPatient={false}
              dense
              caption={`Examinations for ${patientName(patient)}`}
            />
          ) : (
            <EmptyState
              icon={<Stethoscope className="size-5" aria-hidden="true" />}
              title="No examinations yet"
              description="Create an examination, then import the MRI images into it for viewing, AI analysis and review."
              action={
                can("exam_write") ? (
                  <Button
                    variant="primary"
                    onClick={() => setCreatingExam(true)}
                  >
                    New examination
                  </Button>
                ) : undefined
              }
            />
          )}
        </Panel>

        <Panel title="Record" bodyClassName="p-4 space-y-4">
          <DefinitionList
            columns={1}
            items={[
              {
                label: "Clinical notes",
                value: patient.notes ? (
                  <span className="whitespace-pre-wrap">{patient.notes}</span>
                ) : (
                  "None recorded"
                ),
              },
              { label: "Registered", value: formatDateTime(patient.createdAt) },
              {
                label: "Last updated",
                value: formatDateTime(patient.updatedAt),
              },
            ]}
          />
        </Panel>
      </div>

      <PatientFormDialog
        open={editing}
        onClose={() => setEditing(false)}
        patient={patient}
        onSaved={() => toast.success("Patient details saved")}
      />
      <ExamFormDialog
        open={creatingExam}
        onClose={() => setCreatingExam(false)}
        patient={patient}
        onSaved={(exam) => {
          toast.success(
            "Examination created",
            `${exam.accessionNumber} · ${exam.description}`,
          );
          void navigate({ to: "/exams/$examId", params: { examId: exam.id } });
        }}
      />
    </Page>
  );
}
