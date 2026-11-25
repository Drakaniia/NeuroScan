import { Link } from "@tanstack/react-router";
import { ClipboardCheck, UserPlus } from "lucide-react";
import { useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Page } from "@/components/shell/AppShell";
import { useShell } from "@/components/shell/shell-context";
import { Button } from "@/components/ui/Button";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  Skeleton,
} from "@/components/ui/feedback";
import { SearchInput } from "@/components/ui/SearchInput";
import { useExamStats, useExams } from "@/lib/api/queries";
import type { AiFlag, ExamQuery, ExamStatus, WorklistStats } from "@/lib/api/types";
import { SPRING_LAYOUT } from "@/lib/ease";
import { useDebounced } from "@/lib/hooks/use-debounced";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { AiAvailabilityBanner } from "@/screens/ai/AiAvailabilityBanner";
import { ExamTable } from "@/screens/exams/ExamTable";

type Filter = "open" | ExamStatus | "flagged";

/**
 * The queues a reader works through, in reading order. Each count is the
 * backend's own number for that queue; the dot marks queues that need a
 * clinician (flagged / awaiting review), not decoration.
 */
const QUEUES: {
  value: Filter;
  label: string;
  count: (stats: WorklistStats) => number;
  tone?: "danger" | "warning";
}[] = [
  { value: "open", label: "All open", count: (s) => s.totalOpen },
  {
    value: "flagged",
    label: "AI flagged",
    count: (s) => s.flaggedOpen,
    tone: "danger",
  },
  {
    value: "awaiting_review",
    label: "Awaiting review",
    count: (s) => s.awaitingReview,
    tone: "warning",
  },
  {
    value: "ready",
    label: "Ready for AI",
    count: (s) => s.ready + s.analyzing,
  },
  {
    value: "awaiting_images",
    label: "Awaiting images",
    count: (s) => s.awaitingImages,
  },
];

function queryFor(filter: Filter, search: string): ExamQuery {
  const base: ExamQuery = {
    order: "worklist",
    limit: 200,
    search: search || undefined,
  };
  if (filter === "flagged")
    return { ...base, status: "open", aiFlag: "flagged" as AiFlag };
  return { ...base, status: filter };
}

function QueueTabs({
  value,
  onChange,
  stats,
}: {
  value: Filter;
  onChange: (filter: Filter) => void;
  stats: WorklistStats | undefined;
}) {
  const layoutId = useId();
  const reduce = useReducedMotion();
  return (
    <div
      role="tablist"
      aria-label="Worklist queues"
      className="flex flex-wrap items-stretch gap-1"
    >
      {QUEUES.map((queue, index) => {
        const selected = queue.value === value;
        const count = stats ? queue.count(stats) : undefined;
        return (
          <button
            key={queue.value}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(queue.value)}
            onKeyDown={(event) => {
              const step =
                event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
              if (!step) return;
              event.preventDefault();
              const next = QUEUES[(index + step + QUEUES.length) % QUEUES.length];
              onChange(next.value);
              const list = event.currentTarget.parentElement;
              requestAnimationFrame(() =>
                list?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus(),
              );
            }}
            className={cn(
              "pressable relative isolate flex min-w-[124px] flex-col items-start rounded-xl px-3.5 pb-2.5 pt-2 text-left outline-none focus-visible:shadow-focus",
              selected ? "text-ink" : "text-ink-muted hover:bg-black/[0.035] hover:text-ink",
            )}
          >
            {selected ? (
              <motion.span
                layoutId={layoutId}
                transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                aria-hidden="true"
                className="paper absolute inset-0 -z-10 rounded-xl"
              />
            ) : null}
            <span
              className={cn(
                "tabular text-[26px] font-semibold leading-8 tracking-[-0.022em]",
                selected ? "text-ink" : "text-ink-secondary",
                queue.tone === "danger" && count ? "text-danger-ink" : "",
              )}
            >
              {count === undefined ? "–" : count.toLocaleString()}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-medium">
              {queue.tone && count ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-1.5 rounded-full",
                    queue.tone === "danger" ? "bg-danger" : "bg-warning",
                  )}
                />
              ) : null}
              {queue.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function WorklistScreen() {
  const { session, facilityName, can } = useSession();
  const shell = useShell();
  const [filter, setFilter] = useState<Filter>("open");
  const [search, setSearch] = useState("");
  const debounced = useDebounced(search.trim());
  const searchRef = useRef<HTMLInputElement>(null);
  const stats = useExamStats();
  const exams = useExams(queryFor(filter, debounced), {
    refetchInterval: 20_000,
  });

  useKeyboardShortcuts({ "ctrl+f": () => searchRef.current?.focus() });

  const greeting = (() => {
    const hour = new Date().getHours();
    return hour < 12
      ? "Good morning"
      : hour < 18
        ? "Good afternoon"
        : "Good evening";
  })();
  const firstName = session?.user.fullName.split(" ")[0] ?? "";
  const queueLabel = QUEUES.find((queue) => queue.value === filter)?.label;

  return (
    <Page>
      <PageHeader
        eyebrow={
          <>
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            {facilityName ? ` · ${facilityName}` : ""}
          </>
        }
        title={`${greeting}, ${firstName}`}
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

      <AiAvailabilityBanner className="mb-4" />

      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <QueueTabs value={filter} onChange={setFilter} stats={stats.data} />
        <SearchInput
          ref={searchRef}
          value={search}
          onChange={setSearch}
          label="Search worklist"
          placeholder="Name, MRN or accession"
          shortcut="Ctrl F"
          className="mb-1 w-[280px]"
        />
      </div>

      <Panel
        title={queueLabel}
        description={
          exams.data
            ? `${exams.data.total.toLocaleString()} ${exams.data.total === 1 ? "examination" : "examinations"} · STAT first, then by arrival`
            : undefined
        }
      >
        {exams.isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-12 w-full" />
            ))}
          </div>
        ) : exams.isError ? (
          <ErrorState
            error={exams.error}
            onRetry={() => void exams.refetch()}
          />
        ) : exams.data && exams.data.items.length > 0 ? (
          <>
            <ExamTable
              exams={exams.data.items}
              caption={`${queueLabel} examinations`}
            />
            {exams.data.total > exams.data.items.length ? (
              <div className="flex items-center justify-between gap-4 border-t border-line/80 px-4 py-2.5 text-xs text-ink-muted">
                <span className="tabular">
                  Showing first {exams.data.items.length.toLocaleString()} of{" "}
                  {exams.data.total.toLocaleString()} examinations in priority
                  order.
                </span>
                <Link
                  to="/exams"
                  className="font-medium text-accent hover:underline"
                >
                  Browse all in Examinations
                </Link>
              </div>
            ) : null}
          </>
        ) : debounced ? (
          <EmptyState
            title="No matching examinations"
            description={`Nothing in this queue matches “${debounced}”. Search covers family name, given name, MRN and accession number.`}
            action={<Button onClick={() => setSearch("")}>Clear search</Button>}
          />
        ) : stats.data && stats.data.patientCount === 0 ? (
          <EmptyState
            icon={<UserPlus className="size-5" aria-hidden="true" />}
            title="Start by registering a patient"
            description="Examinations are created from a patient's chart. Images are imported into an examination, then analyzed and reviewed."
            action={
              can("patient_write") ? (
                <Button variant="primary" onClick={shell.registerPatient}>
                  Register patient
                </Button>
              ) : undefined
            }
          />
        ) : (
          <EmptyState
            icon={<ClipboardCheck className="size-5" aria-hidden="true" />}
            title={
              filter === "open"
                ? "No open examinations"
                : "Nothing in this queue"
            }
            description={
              <>
                Create an examination from a{" "}
                <Link
                  to="/patients"
                  className="font-medium text-accent hover:underline"
                >
                  patient's chart
                </Link>
                , or review finalized studies under{" "}
                <Link
                  to="/exams"
                  className="font-medium text-accent hover:underline"
                >
                  Examinations
                </Link>
                .
              </>
            }
          />
        )}
      </Panel>
    </Page>
  );
}
