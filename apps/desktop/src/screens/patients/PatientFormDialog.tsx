import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Callout } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { useCreatePatient, useUpdatePatient } from "@/lib/api/queries";
import type { Patient, PatientInput, Sex } from "@/lib/api/types";
import { SEX_LABELS, todayIso } from "@/lib/format";
import { useForm } from "@/lib/use-form";

type FormValues = {
  mrn: string;
  givenName: string;
  familyName: string;
  sex: Sex;
  birthDate: string;
  phone: string;
  notes: string;
};

function initialValues(patient?: Patient | null): FormValues {
  return {
    mrn: patient?.mrn ?? "",
    givenName: patient?.givenName ?? "",
    familyName: patient?.familyName ?? "",
    sex: patient?.sex ?? "unknown",
    birthDate: patient?.birthDate ?? "",
    phone: patient?.phone ?? "",
    notes: patient?.notes ?? "",
  };
}

/** Client-side checks that mirror the backend's; the backend still decides. */
export function validatePatient(
  values: FormValues,
): Partial<Record<keyof FormValues, string>> {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  const mrn = values.mrn.trim();
  if (!mrn) errors.mrn = "Medical record number is required.";
  else if (!/^[A-Za-z0-9\-_./]+$/.test(mrn)) {
    errors.mrn = "Use letters, digits, '-', '_', '.' and '/' only.";
  } else if (mrn.length > 32) errors.mrn = "At most 32 characters.";
  if (!values.givenName.trim()) errors.givenName = "Given name is required.";
  if (!values.familyName.trim()) errors.familyName = "Family name is required.";
  if (values.birthDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.birthDate))
      errors.birthDate = "Enter a valid date.";
    else if (values.birthDate > todayIso())
      errors.birthDate = "Date of birth cannot be in the future.";
    else if (values.birthDate < "1900-01-01")
      errors.birthDate = "Date of birth must be on or after 1900.";
  }
  if (values.phone && !/^[0-9 +\-().]{1,32}$/.test(values.phone.trim())) {
    errors.phone = "Digits, spaces and + - ( ) . only.";
  }
  if (values.notes.length > 2000) errors.notes = "At most 2,000 characters.";
  return errors;
}

export function PatientFormDialog({
  open,
  onClose,
  patient,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  /** Edit this patient; omit to register a new one. */
  patient?: Patient | null;
  onSaved?: (patient: Patient) => void;
}) {
  const editing = Boolean(patient);
  const form = useForm<FormValues>(initialValues(patient));
  const create = useCreatePatient();
  const update = useUpdatePatient(patient?.id ?? "");
  const mutation = editing ? update : create;
  const { reset } = form;

  useEffect(() => {
    if (open) reset(initialValues(patient));
  }, [open, patient, reset]);

  const submit = async () => {
    if (!form.check(validatePatient(form.values))) return;
    const input: PatientInput = {
      mrn: form.values.mrn.trim(),
      givenName: form.values.givenName.trim(),
      familyName: form.values.familyName.trim(),
      sex: form.values.sex,
      birthDate: form.values.birthDate || null,
      phone: form.values.phone.trim() || null,
      notes: form.values.notes.trim() || null,
    };
    try {
      const saved = await mutation.mutateAsync(input);
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
      title={editing ? "Edit patient details" : "Register patient"}
      description={
        editing
          ? "Changes are recorded in the audit log with the fields that changed."
          : "Search the patient list first to avoid duplicate records."
      }
      size="lg"
      dismissible={!mutation.isPending}
      footer={
        <>
          <Button onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={mutation.isPending}
            onClick={() => void submit()}
          >
            {editing ? "Save changes" : "Register patient"}
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
        <div className="grid grid-cols-3 gap-3">
          <Field
            label="Medical record number (MRN)"
            required
            error={errors.mrn}
            className="col-span-1"
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                data-autofocus
                spellCheck={false}
                className="font-mono"
                value={values.mrn}
                onChange={(event) => set("mrn", event.target.value)}
              />
            )}
          </Field>
          <Field label="Family name" required error={errors.familyName}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                autoComplete="off"
                value={values.familyName}
                onChange={(event) => set("familyName", event.target.value)}
              />
            )}
          </Field>
          <Field label="Given name" required error={errors.givenName}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                autoComplete="off"
                value={values.givenName}
                onChange={(event) => set("givenName", event.target.value)}
              />
            )}
          </Field>
          <Field label="Sex" required>
            {({ id }) => (
              <Select
                id={id}
                value={values.sex}
                onChange={(event) => set("sex", event.target.value as Sex)}
              >
                {(Object.keys(SEX_LABELS) as Sex[]).map((sex) => (
                  <option key={sex} value={sex}>
                    {SEX_LABELS[sex]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Date of birth" error={errors.birthDate}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                type="date"
                min="1900-01-01"
                max={todayIso()}
                value={values.birthDate}
                onChange={(event) => set("birthDate", event.target.value)}
              />
            )}
          </Field>
          <Field label="Phone" error={errors.phone}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                type="tel"
                value={values.phone}
                onChange={(event) => set("phone", event.target.value)}
              />
            )}
          </Field>
        </div>
        <Field
          label="Clinical notes"
          error={errors.notes}
          aside={`${values.notes.length}/2000`}
          hint="Allergies, implants or other information relevant to imaging."
        >
          {({ id, describedBy, invalid }) => (
            <Textarea
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              rows={3}
              maxLength={2000}
              value={values.notes}
              onChange={(event) => set("notes", event.target.value)}
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
