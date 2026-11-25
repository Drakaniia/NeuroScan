import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Callout } from "@/components/ui/feedback";
import { Field, Input, Segmented, Textarea } from "@/components/ui/form";
import { useCreateExam, useUpdateExam } from "@/lib/api/queries";
import type {
  ExamInput,
  ExamSummary,
  PatientBrief,
  Priority,
} from "@/lib/api/types";
import { PRIORITY_LABELS, patientName, sexAge, todayIso } from "@/lib/format";
import { useForm } from "@/lib/use-form";

type FormValues = {
  description: string;
  clinicalIndication: string;
  referringPhysician: string;
  priority: Priority;
  studyDate: string;
};

const DESCRIPTIONS = [
  "MRI Brain without contrast",
  "MRI Brain with and without contrast",
  "MRI Brain — tumor protocol",
  "MRI Brain — follow-up",
];

function initialValues(exam?: ExamSummary | null): FormValues {
  return {
    description: exam?.description ?? DESCRIPTIONS[0],
    clinicalIndication: exam?.clinicalIndication ?? "",
    referringPhysician: exam?.referringPhysician ?? "",
    priority: exam?.priority ?? "routine",
    studyDate: exam?.studyDate ?? todayIso(),
  };
}

export function ExamFormDialog({
  open,
  onClose,
  patient,
  exam,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  patient: PatientBrief;
  /** Edit this examination; omit to create one. */
  exam?: ExamSummary | null;
  onSaved?: (exam: ExamSummary) => void;
}) {
  const editing = Boolean(exam);
  const form = useForm<FormValues>(initialValues(exam));
  const create = useCreateExam();
  const update = useUpdateExam(exam?.id ?? "");
  const pending = create.isPending || update.isPending;
  const { reset } = form;

  useEffect(() => {
    if (open) reset(initialValues(exam));
  }, [open, exam, reset]);

  const submit = async () => {
    const { values } = form;
    const found: Partial<Record<keyof FormValues, string>> = {};
    if (!values.description.trim())
      found.description = "Study description is required.";
    if (!values.studyDate) found.studyDate = "Study date is required.";
    else if (values.studyDate > todayIso())
      found.studyDate = "Study date cannot be in the future.";
    if (values.clinicalIndication.length > 1000)
      found.clinicalIndication = "At most 1,000 characters.";
    if (!form.check(found)) return;

    const input: ExamInput = {
      description: values.description.trim(),
      clinicalIndication: values.clinicalIndication.trim() || null,
      referringPhysician: values.referringPhysician.trim() || null,
      priority: values.priority,
      studyDate: values.studyDate,
    };
    try {
      const saved = editing
        ? await update.mutateAsync(input)
        : await create.mutateAsync({ patientId: patient.id, input });
      onSaved?.(saved);
      onClose();
    } catch (error) {
      form.fail(error);
    }
  };

  const { values, set, errors } = form;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? "Edit examination" : "New examination"}
      description={
        <>
          {patientName(patient)} · MRN{" "}
          <span className="font-mono">{patient.mrn}</span> · {sexAge(patient)}
        </>
      }
      size="md"
      dismissible={!pending}
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={pending}
            onClick={() => void submit()}
          >
            {editing ? "Save changes" : "Create examination"}
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {form.formError ? (
          <Callout tone="danger">{form.formError}</Callout>
        ) : null}
        <Field label="Study description" required error={errors.description}>
          {({ id, describedBy, invalid }) => (
            <>
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                list={`${id}-suggestions`}
                data-autofocus
                value={values.description}
                onChange={(event) => set("description", event.target.value)}
              />
              <datalist id={`${id}-suggestions`}>
                {DESCRIPTIONS.map((description) => (
                  <option key={description} value={description} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Study date" required error={errors.studyDate}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                type="date"
                max={todayIso()}
                value={values.studyDate}
                onChange={(event) => set("studyDate", event.target.value)}
              />
            )}
          </Field>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-xs font-medium text-ink-secondary">
              Priority
            </legend>
            <div>
              <Segmented<Priority>
                label="Priority"
                value={values.priority}
                onChange={(priority) => set("priority", priority)}
                options={(["routine", "urgent", "stat"] as const).map(
                  (priority) => ({
                    value: priority,
                    label: PRIORITY_LABELS[priority],
                  }),
                )}
              />
            </div>
          </fieldset>
        </div>
        <Field label="Referring physician" error={errors.referringPhysician}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              value={values.referringPhysician}
              onChange={(event) =>
                set("referringPhysician", event.target.value)
              }
            />
          )}
        </Field>
        <Field
          label="Clinical indication"
          error={errors.clinicalIndication}
          aside={`${values.clinicalIndication.length}/1000`}
        >
          {({ id, describedBy, invalid }) => (
            <Textarea
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              rows={3}
              maxLength={1000}
              placeholder="Symptoms and the clinical question, e.g. new-onset seizures, rule out mass."
              value={values.clinicalIndication}
              onChange={(event) =>
                set("clinicalIndication", event.target.value)
              }
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
