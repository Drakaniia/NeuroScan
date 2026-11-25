import { useNavigate } from "@tanstack/react-router";
import { ChevronRight, UserPlus, Users } from "lucide-react";
import { useRef, useState } from "react";
import { Page } from "@/components/shell/AppShell";
import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/Button";
import { Tag } from "@/components/ui/badges";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  Skeleton,
} from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { usePatients } from "@/lib/api/queries";
import { useDebounced } from "@/lib/hooks/use-debounced";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import {
  ageInYears,
  formatDate,
  patientName,
  relativeTime,
  SEX_LABELS,
} from "@/lib/format";
import { useSession } from "@/lib/session";

const PAGE_SIZE = 50;

export function PatientsScreen() {
  const navigate = useNavigate();
  const shell = useShell();
  const { can } = useSession();
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const debounced = useDebounced(search.trim());
  const searchRef = useRef<HTMLInputElement>(null);
  const patients = usePatients({
    search: debounced || undefined,
    limit: PAGE_SIZE,
    offset,
  });

  useKeyboardShortcuts({ "ctrl+f": () => searchRef.current?.focus() });

  const open = (id: string) =>
    void navigate({ to: "/patients/$patientId", params: { patientId: id } });

  return (
    <Page>
      <PageHeader
        title="Patients"
        description="Patient registry for this workstation. Search by name or medical record number."
        actions={
          can("patient_write") ? (
            <Button
              variant="primary"
              icon={<UserPlus className="size-4" aria-hidden="true" />}
              onClick={shell.registerPatient}
            >
              Register patient
            </Button>
          ) : null
        }
      />
      <Panel
        title={
          patients.data
            ? `${patients.data.total.toLocaleString()} patients`
            : "Patients"
        }
        actions={
          <SearchInput
            ref={searchRef}
            value={search}
            onChange={(value) => {
              setSearch(value);
              setOffset(0);
            }}
            label="Search patients"
            placeholder="Family name, given name or MRN"
            shortcut="Ctrl F"
            className="w-[320px]"
          />
        }
      >
        {patients.isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton key={row} className="h-10 w-full" />
            ))}
          </div>
        ) : patients.isError ? (
          <ErrorState
            error={patients.error}
            onRetry={() => void patients.refetch()}
          />
        ) : patients.data && patients.data.items.length > 0 ? (
          <>
            <section
              // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard-scrollable table region
              tabIndex={0}
              aria-label="Patients"
              className="overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
            >
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <caption className="sr-only">Patients</caption>
              <thead>
                <tr className="border-b border-line text-xs font-medium text-ink-muted [&>th]:whitespace-nowrap">
                  <th scope="col" className="px-3.5 pb-2 pt-3 font-medium">
                    Patient
                  </th>
                  <th scope="col" className="px-2 pb-2 pt-3 font-medium">
                    MRN
                  </th>
                  <th scope="col" className="px-2 pb-2 pt-3 font-medium">
                    Sex
                  </th>
                  <th scope="col" className="px-2 pb-2 pt-3 font-medium">
                    Date of birth
                  </th>
                  <th scope="col" className="px-2 pb-2 pt-3 font-medium">
                    Examinations
                  </th>
                  <th scope="col" className="px-2 pb-2 pt-3 font-medium">
                    Last study
                  </th>
                  <th scope="col" className="px-2 pb-2 pt-3 font-medium">
                    Updated
                  </th>
                  <th scope="col" className="w-6">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {patients.data.items.map((patient) => {
                  const age = ageInYears(patient.birthDate);
                  return (
                    <tr
                      key={patient.id}
                      tabIndex={0}
                      aria-label={`Open ${patientName(patient)}, MRN ${patient.mrn}`}
                      onClick={() => open(patient.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          open(patient.id);
                        }
                      }}
                      className="group cursor-pointer border-b border-line/70 transition-colors duration-fast last:border-b-0 hover:bg-black/[0.025] focus-visible:bg-accent-soft/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                    >
                      <td className="px-3.5 py-2.5">
                        <span className="flex items-center gap-2.5">
                          <span
                            aria-hidden="true"
                            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-2xs font-semibold text-ink-secondary"
                          >
                            {patient.familyName[0]}
                            {patient.givenName[0]}
                          </span>
                          <span className="truncate font-semibold text-ink">
                            {patientName(patient)}
                          </span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 font-mono text-xs text-ink-secondary">
                        {patient.mrn}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-ink-secondary">
                        {SEX_LABELS[patient.sex]}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 tabular text-ink-secondary">
                        {formatDate(patient.birthDate)}
                        {age !== null ? (
                          <span className="text-ink-muted"> · {age} y</span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5">
                        <span className="tabular text-ink-secondary">
                          {patient.examCount}
                        </span>
                        {patient.openExamCount > 0 ? (
                          <Tag tone="accent" className="ml-1.5">
                            {patient.openExamCount} open
                          </Tag>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 tabular text-ink-secondary">
                        {formatDate(patient.lastStudyDate)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-xs text-ink-muted">
                        {relativeTime(patient.updatedAt)}
                      </td>
                      <td className="pr-2">
                        <ChevronRight
                          className="size-4 text-ink-faint transition-transform duration-fast group-hover:translate-x-0.5 group-hover:text-ink-secondary"
                          aria-hidden="true"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </section>
            <Pagination
              offset={offset}
              limit={PAGE_SIZE}
              total={patients.data.total}
              onChange={setOffset}
              noun="patients"
            />
          </>
        ) : debounced ? (
          <EmptyState
            title="No patient found"
            description={`No patient matches “${debounced}”. Check the spelling or the MRN, then register the patient if they are new.`}
            action={
              can("patient_write") ? (
                <Button
                  onClick={shell.registerPatient}
                  icon={<UserPlus className="size-4" aria-hidden="true" />}
                >
                  Register patient
                </Button>
              ) : undefined
            }
          />
        ) : (
          <EmptyState
            icon={<Users className="size-5" aria-hidden="true" />}
            title="No patients registered yet"
            description="Registered patients appear here. Each patient's chart holds their examinations and reports."
            action={
              can("patient_write") ? (
                <Button variant="primary" onClick={shell.registerPatient}>
                  Register the first patient
                </Button>
              ) : undefined
            }
          />
        )}
      </Panel>
    </Page>
  );
}
