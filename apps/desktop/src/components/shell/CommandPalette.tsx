import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import {
  ClipboardList,
  FileClock,
  Info,
  Keyboard,
  Lock,
  LogOut,
  ScrollText,
  Search,
  Settings,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { type ComponentType, type ReactNode, useState } from "react";
import { api } from "@/lib/api/client";
import { useDebounced } from "@/lib/hooks/use-debounced";
import { formatDate, patientName, sexAge } from "@/lib/format";
import { useSession } from "@/lib/session";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { StatusBadge } from "@/components/ui/badges";

/**
 * Ctrl+K: jump anywhere, run any shell action, or find a patient or
 * examination by name, MRN or accession. Opened hundreds of times a day, so
 * it appears instantly — no entrance animation.
 */
export function CommandPalette({
  open,
  onOpenChange,
  onRegisterPatient,
  onShowShortcuts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegisterPatient: () => void;
  onShowShortcuts: () => void;
}) {
  const navigate = useNavigate();
  const { can, lock, logout } = useSession();
  const [search, setSearch] = useState("");
  const term = useDebounced(search.trim(), 160);
  const searching = term.length >= 2;
  const typing = search.trim() !== term;

  const patients = useQuery({
    queryKey: ["palette", "patients", term],
    queryFn: () => api.listPatients({ search: term, limit: 5, offset: 0 }),
    enabled: open && searching && can("patient_read"),
    staleTime: 10_000,
  });
  const exams = useQuery({
    queryKey: ["palette", "exams", term],
    queryFn: () =>
      api.listExams({ search: term, limit: 5, offset: 0, order: "recent" }),
    enabled: open && searching && can("exam_read"),
    staleTime: 10_000,
  });

  const close = () => {
    onOpenChange(false);
    setSearch("");
  };
  const run = (action: () => void) => () => {
    close();
    action();
  };
  const go = (to: "/" | "/patients" | "/exams" | "/audit" | "/settings" | "/about") =>
    run(() => void navigate({ to }));

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-[rgb(16_18_27/0.14)]" />
        <DialogPrimitive.Content
          aria-label="Command palette"
          className="material-overlay fixed left-1/2 top-[14vh] z-[90] w-[640px] max-w-[calc(100vw-48px)] -translate-x-1/2 overflow-hidden rounded-2xl focus:outline-none"
        >
          <DialogPrimitive.Title className="sr-only">
            Command palette
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search screens, actions, patients and examinations.
          </DialogPrimitive.Description>
          <Command
            label="Command palette"
            shouldFilter={!searching}
            loop
            className="flex flex-col"
          >
            <div className="flex items-center gap-3 border-b border-black/[0.07] px-4">
              <Search className="size-[18px] shrink-0 text-ink-muted" aria-hidden="true" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Search patients, examinations, or type a command…"
                className="h-[52px] w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-faint"
              />
              <kbd className="shrink-0 rounded-[5px] bg-black/[0.06] px-1.5 py-0.5 font-mono text-2xs text-ink-muted">
                Esc
              </kbd>
            </div>
            <Command.List className="max-h-[min(420px,56vh)] overflow-y-auto p-2 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-ink-faint">
              <Command.Empty className="px-3 py-10 text-center text-sm text-ink-muted">
                {typing || (searching && (patients.isFetching || exams.isFetching))
                  ? "Searching…"
                  : `Nothing matches “${search}”. Try a family name, MRN or accession number.`}
              </Command.Empty>

              {searching ? (
                <>
                  {patients.data?.items.length ? (
                    <Command.Group heading="Patients">
                      {patients.data.items.map((patient) => (
                        <Item
                          key={patient.id}
                          value={`patient-${patient.id}`}
                          icon={User}
                          onSelect={run(
                            () =>
                              void navigate({
                                to: "/patients/$patientId",
                                params: { patientId: patient.id },
                              }),
                          )}
                          trailing={
                            <span className="font-mono text-2xs text-ink-muted">
                              {patient.mrn}
                            </span>
                          }
                        >
                          <span className="font-medium">{patientName(patient)}</span>
                          <span className="ml-2 text-xs text-ink-muted">
                            {sexAge(patient)}
                          </span>
                        </Item>
                      ))}
                    </Command.Group>
                  ) : null}
                  {exams.data?.items.length ? (
                    <Command.Group heading="Examinations">
                      {exams.data.items.map((exam) => (
                        <Item
                          key={exam.id}
                          value={`exam-${exam.id}`}
                          icon={FileClock}
                          onSelect={run(
                            () =>
                              void navigate({
                                to: "/exams/$examId",
                                params: { examId: exam.id },
                              }),
                          )}
                          trailing={
                            <span className="flex items-center gap-1.5">
                              <VerdictBadge verdict={exam.ai.overall} size="sm" />
                              <StatusBadge status={exam.status} />
                            </span>
                          }
                        >
                          <span className="font-medium">{patientName(exam.patient)}</span>
                          <span className="ml-2 text-xs text-ink-muted">
                            {exam.description} · {formatDate(exam.studyDate)} ·{" "}
                            <span className="font-mono">{exam.accessionNumber}</span>
                          </span>
                        </Item>
                      ))}
                    </Command.Group>
                  ) : null}
                </>
              ) : (
                <>
                  <Command.Group heading="Go to">
                    <Item value="Worklist" icon={ClipboardList} shortcut="Ctrl 1" onSelect={go("/")}>
                      Worklist
                    </Item>
                    <Item value="Patients" icon={Users} shortcut="Ctrl 2" onSelect={go("/patients")}>
                      Patients
                    </Item>
                    <Item value="Examinations" icon={FileClock} shortcut="Ctrl 3" onSelect={go("/exams")}>
                      Examinations
                    </Item>
                    {can("audit_read") ? (
                      <Item value="Audit log" icon={ScrollText} onSelect={go("/audit")}>
                        Audit log
                      </Item>
                    ) : null}
                    <Item value="Settings" icon={Settings} shortcut="Ctrl ," onSelect={go("/settings")}>
                      Settings
                    </Item>
                    <Item value="About and help" icon={Info} shortcut="F1" onSelect={go("/about")}>
                      About &amp; help
                    </Item>
                  </Command.Group>
                  <Command.Group heading="Actions">
                    {can("patient_write") ? (
                      <Item
                        value="Register patient new"
                        icon={UserPlus}
                        shortcut="Ctrl N"
                        onSelect={run(onRegisterPatient)}
                      >
                        Register patient…
                      </Item>
                    ) : null}
                    <Item value="Keyboard shortcuts help" icon={Keyboard} shortcut="?" onSelect={run(onShowShortcuts)}>
                      Keyboard shortcuts
                    </Item>
                    <Item value="Lock workstation" icon={Lock} shortcut="Ctrl L" onSelect={run(() => void lock())}>
                      Lock workstation
                    </Item>
                    <Item value="Sign out logout" icon={LogOut} onSelect={run(() => void logout())}>
                      Sign out
                    </Item>
                  </Command.Group>
                </>
              )}
            </Command.List>
            <div className="flex items-center gap-4 border-t border-black/[0.06] px-4 py-2 text-2xs text-ink-muted">
              <span>
                <kbd className="font-mono">↑↓</kbd> to move
              </span>
              <span>
                <kbd className="font-mono">Enter</kbd> to open
              </span>
              <span className="ml-auto">Type 2+ characters to search records</span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Item({
  value,
  icon: Icon,
  shortcut,
  trailing,
  onSelect,
  children,
}: {
  value: string;
  icon: ComponentType<{ className?: string }>;
  shortcut?: string;
  trailing?: ReactNode;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="group flex h-10 cursor-default items-center gap-3 rounded-lg px-2.5 text-sm text-ink outline-none data-[selected=true]:bg-accent data-[selected=true]:text-white [&[data-selected=true]_*]:!text-white"
    >
      <Icon className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing ? (
        <span className="shrink-0 group-data-[selected=true]:[&_*]:!bg-white/20 group-data-[selected=true]:[&_*]:!shadow-none">
          {trailing}
        </span>
      ) : null}
      {shortcut ? (
        <span className="shrink-0 font-mono text-2xs text-ink-faint">{shortcut}</span>
      ) : null}
    </Command.Item>
  );
}
