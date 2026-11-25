import { FileClock, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { Page } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/Button";
import {
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  Skeleton,
} from "@/components/ui/feedback";
import { FilterField, Input, Select } from "@/components/ui/form";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { useExams } from "@/lib/api/queries";
import type { AiFlag, ExamQuery, ExamStatus, Priority } from "@/lib/api/types";
import { PRIORITY_LABELS, STATUS_LABELS, VERDICT_LABELS } from "@/lib/format";
import { useDebounced } from "@/lib/hooks/use-debounced";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { ExamTable } from "./ExamTable";

const PAGE_SIZE = 50;

interface Filters {
  status: "" | ExamStatus | "open";
  aiFlag: "" | AiFlag;
  priority: "" | Priority;
  dateFrom: string;
  dateTo: string;
}

const EMPTY: Filters = {
  status: "",
  aiFlag: "",
  priority: "",
  dateFrom: "",
  dateTo: "",
};

/** Every examination, filterable — the history view of the workstation. */
export function ExamsScreen() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [offset, setOffset] = useState(0);
  const debounced = useDebounced(search.trim());
  const searchRef = useRef<HTMLInputElement>(null);
  useKeyboardShortcuts({ "ctrl+f": () => searchRef.current?.focus() });

  const query: ExamQuery = {
    search: debounced || undefined,
    status: filters.status || undefined,
    aiFlag: filters.aiFlag || undefined,
    priority: filters.priority || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    order: "recent",
    limit: PAGE_SIZE,
    offset,
  };
  const exams = useExams(query);
  const filtered =
    Boolean(debounced) || JSON.stringify(filters) !== JSON.stringify(EMPTY);

  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setOffset(0);
  };

  return (
    <Page>
      <PageHeader
        title="Examinations"
        description="All examinations on this workstation, newest first."
      />
      <Panel
        title={
          exams.data
            ? `${exams.data.total.toLocaleString()} examinations`
            : "Examinations"
        }
        actions={
          <SearchInput
            ref={searchRef}
            value={search}
            onChange={(value) => {
              setSearch(value);
              setOffset(0);
            }}
            label="Search examinations"
            placeholder="Name, MRN, accession or description"
            shortcut="Ctrl F"
            className="w-[320px]"
          />
        }
      >
        <div className="flex flex-wrap items-end gap-3 border-b border-line/80 bg-surface-muted/60 px-4 py-3">
          <FilterField label="Status">
            {(id) => (
              <Select
                id={id}
                value={filters.status}
                onChange={(event) =>
                  update("status", event.target.value as Filters["status"])
                }
                className="w-[170px]"
              >
                <option value="">Any status</option>
                <option value="open">All open</option>
                {(Object.keys(STATUS_LABELS) as ExamStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            )}
          </FilterField>
          <FilterField label="AI screening">
            {(id) => (
              <Select
                id={id}
                value={filters.aiFlag}
                onChange={(event) =>
                  update("aiFlag", event.target.value as Filters["aiFlag"])
                }
                className="w-[190px]"
              >
                <option value="">Any result</option>
                <option value="positive">{VERDICT_LABELS.positive}</option>
                <option value="indeterminate">
                  {VERDICT_LABELS.indeterminate}
                </option>
                <option value="negative">{VERDICT_LABELS.negative}</option>
                <option value="flagged">Suspected or indeterminate</option>
                <option value="none">Not analyzed</option>
              </Select>
            )}
          </FilterField>
          <FilterField label="Priority">
            {(id) => (
              <Select
                id={id}
                value={filters.priority}
                onChange={(event) =>
                  update("priority", event.target.value as Filters["priority"])
                }
                className="w-[130px]"
              >
                <option value="">Any</option>
                {(Object.keys(PRIORITY_LABELS) as Priority[]).map(
                  (priority) => (
                    <option key={priority} value={priority}>
                      {PRIORITY_LABELS[priority]}
                    </option>
                  ),
                )}
              </Select>
            )}
          </FilterField>
          <FilterField label="Study date from">
            {(id) => (
              <Input
                id={id}
                type="date"
                value={filters.dateFrom}
                max={filters.dateTo || undefined}
                onChange={(event) => update("dateFrom", event.target.value)}
                className="w-[150px]"
              />
            )}
          </FilterField>
          <FilterField label="Study date to">
            {(id) => (
              <Input
                id={id}
                type="date"
                value={filters.dateTo}
                min={filters.dateFrom || undefined}
                onChange={(event) => update("dateTo", event.target.value)}
                className="w-[150px]"
              />
            )}
          </FilterField>
          {filtered ? (
            <Button
              variant="ghost"
              icon={<RotateCcw className="size-4" aria-hidden="true" />}
              onClick={() => {
                setFilters(EMPTY);
                setSearch("");
                setOffset(0);
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>

        {exams.isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-11 w-full" />
            ))}
          </div>
        ) : exams.isError ? (
          <ErrorState
            error={exams.error}
            onRetry={() => void exams.refetch()}
          />
        ) : exams.data && exams.data.items.length > 0 ? (
          <>
            <ExamTable exams={exams.data.items} caption="Examinations" />
            <Pagination
              offset={offset}
              limit={PAGE_SIZE}
              total={exams.data.total}
              onChange={setOffset}
              noun="examinations"
            />
          </>
        ) : (
          <EmptyState
            icon={<FileClock className="size-5" aria-hidden="true" />}
            title={
              filtered
                ? "No examinations match these filters"
                : "No examinations yet"
            }
            description={
              filtered
                ? "Widen the date range or clear the filters."
                : "Examinations are created from a patient's chart."
            }
          />
        )}
      </Panel>
    </Page>
  );
}
