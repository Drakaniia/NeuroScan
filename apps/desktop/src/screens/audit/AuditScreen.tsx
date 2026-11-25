import { RotateCcw, ShieldCheck, ShieldX } from "lucide-react";
import { useRef, useState } from "react";
import { Page } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/Button";
import {
  Callout,
  EmptyState,
  ErrorState,
  PageHeader,
  Panel,
  Skeleton,
} from "@/components/ui/feedback";
import { FilterField, Input, Select } from "@/components/ui/form";
import { Pagination } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { useToast } from "@/components/ui/toast";
import { api, errorMessage } from "@/lib/api/client";
import { useAudit } from "@/lib/api/queries";
import type { AuditVerification } from "@/lib/api/types";
import { toCsv } from "@/lib/csv";
import { auditActionLabel, formatDateTime } from "@/lib/format";
import { useDebounced } from "@/lib/hooks/use-debounced";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 100;

function detailsText(details: Record<string, unknown> | null): string {
  if (!details) return "";
  return Object.entries(details)
    .filter(
      ([, value]) => value !== null && value !== undefined && value !== "",
    )
    .map(
      ([key, value]) =>
        `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`,
    )
    .join(" · ");
}

function toUtcStart(date: string) {
  return date ? new Date(`${date}T00:00:00`).toISOString() : undefined;
}
function toUtcEnd(date: string) {
  if (!date) return undefined;
  const end = new Date(`${date}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return end.toISOString();
}

const SECURITY_ACTIONS = new Set([
  "login_failed",
  "unlock_failed",
  "signature_failed",
  "model_load_failed",
]);

export function AuditScreen() {
  const toast = useToast();
  const { can } = useSession();
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [offset, setOffset] = useState(0);
  const [verification, setVerification] = useState<AuditVerification | null>(
    null,
  );
  const [verifying, setVerifying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounced = useDebounced(search.trim());
  const filtered = Boolean(debounced || action || from || to);
  useKeyboardShortcuts({ "ctrl+f": () => searchRef.current?.focus() });

  const query = {
    search: debounced || undefined,
    action: action || undefined,
    from: toUtcStart(from),
    to: toUtcEnd(to),
    limit: PAGE_SIZE,
    offset,
  };
  const audit = useAudit(query);

  if (!can("audit_read")) {
    return (
      <Page>
        <EmptyState
          title="Not available"
          description="Only administrators can view the audit log."
        />
      </Page>
    );
  }

  const verify = async () => {
    setVerifying(true);
    try {
      setVerification(await api.verifyAudit());
      void audit.refetch();
    } catch (error) {
      toast.error("Verification failed", errorMessage(error));
    } finally {
      setVerifying(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await api.listAudit({ ...query, limit: 500, offset: 0 });
      const csv = toCsv(
        [
          "seq",
          "timestamp_utc",
          "user",
          "action",
          "entity_type",
          "entity_id",
          "details",
        ],
        all.items.map((entry) => [
          entry.seq,
          entry.ts,
          entry.username ?? "",
          entry.action,
          entry.entityType ?? "",
          entry.entityId ?? "",
          entry.details ? JSON.stringify(entry.details) : "",
        ]),
      );
      const path = await api.saveExport({
        kind: "csv",
        fileName: "neuroscan_audit_log.csv",
        text: csv,
        description: `Audit log export (${all.items.length} of ${all.total} entries)`,
      });
      if (path)
        toast.success(
          "Audit log exported",
          all.total > 500 ? `${path} (first 500 matching entries)` : path,
        );
    } catch (error) {
      toast.error("Export failed", errorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Page>
      <PageHeader
        title="Audit log"
        description="Every sign-in, record change, AI analysis, signature and export, in a tamper-evident hash chain."
        actions={
          <>
            <Button loading={exporting} onClick={() => void exportCsv()}>
              Export CSV
            </Button>
            <Button
              variant="primary"
              loading={verifying}
              icon={<ShieldCheck className="size-4" aria-hidden="true" />}
              onClick={() => void verify()}
            >
              Verify integrity
            </Button>
          </>
        }
      />
      {verification ? (
        verification.valid ? (
          <Callout tone="success" title="Audit chain intact" className="mb-4">
            {verification.checked.toLocaleString()} entries verified at{" "}
            {formatDateTime(verification.verifiedAt)}. No entry has been
            altered, removed or reordered.
          </Callout>
        ) : (
          <Callout tone="danger" title="Audit chain broken" className="mb-4">
            The chain fails at entry #{verification.firstInvalidSeq}: an entry
            from that point was altered or removed outside the application.
            Preserve the database file and report this to your security officer.
          </Callout>
        )
      ) : null}

      <Panel
        title={
          audit.data
            ? `${audit.data.total.toLocaleString()} entries`
            : "Entries"
        }
        actions={
          <SearchInput
            ref={searchRef}
            value={search}
            onChange={(value) => {
              setSearch(value);
              setOffset(0);
            }}
            label="Search audit log"
            placeholder="User, action, record or detail"
            shortcut="Ctrl F"
            className="w-[280px]"
          />
        }
      >
        <div className="flex flex-wrap items-end gap-3 border-b border-line px-4 py-3">
          <FilterField label="Action">
            {(id) => (
              <Select
                id={id}
                value={action}
                onChange={(event) => {
                  setAction(event.target.value);
                  setOffset(0);
                }}
                className="w-[230px]"
              >
                <option value="">All actions</option>
                {audit.data?.actions.map((name) => (
                  <option key={name} value={name}>
                    {auditActionLabel(name)}
                  </option>
                ))}
              </Select>
            )}
          </FilterField>
          <FilterField label="From">
            {(id) => (
              <Input
                id={id}
                type="date"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setOffset(0);
                }}
                className="w-[150px]"
              />
            )}
          </FilterField>
          <FilterField label="To">
            {(id) => (
              <Input
                id={id}
                type="date"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setOffset(0);
                }}
                className="w-[150px]"
              />
            )}
          </FilterField>
          {filtered ? (
            <Button
              variant="ghost"
              icon={<RotateCcw className="size-4" aria-hidden="true" />}
              onClick={() => {
                setSearch("");
                setAction("");
                setFrom("");
                setTo("");
                setOffset(0);
              }}
            >
              Clear filters
            </Button>
          ) : null}
        </div>
        {audit.isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton key={row} className="h-8 w-full" />
            ))}
          </div>
        ) : audit.isError ? (
          <ErrorState
            error={audit.error}
            onRetry={() => void audit.refetch()}
          />
        ) : audit.data && audit.data.items.length > 0 ? (
          <>
            <section
              // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard-scrollable table region
              tabIndex={0}
              aria-label="Audit entries"
              className="overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
            >
            <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-sm">
              <caption className="sr-only">Audit entries</caption>
              <thead>
                <tr className="border-b border-line text-xs font-medium text-ink-muted [&>th]:pb-2 [&>th]:pt-3 [&>th]:font-medium">
                  <th scope="col" className="w-16 px-4 py-2 font-semibold">
                    #
                  </th>
                  <th scope="col" className="w-44 px-3 py-2 font-semibold">
                    Time
                  </th>
                  <th scope="col" className="w-36 px-3 py-2 font-semibold">
                    User
                  </th>
                  <th scope="col" className="w-56 px-3 py-2 font-semibold">
                    Action
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="selectable">
                {audit.data.items.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-line align-top last:border-b-0"
                  >
                    <td className="px-4 py-2 tabular text-xs text-ink-faint">
                      {entry.seq}
                    </td>
                    <td className="px-3 py-2 tabular text-xs text-ink-secondary">
                      {formatDateTime(entry.ts)}
                    </td>
                    <td className="truncate px-3 py-2 font-mono text-xs text-ink-secondary">
                      {entry.username ?? "—"}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-sm",
                        SECURITY_ACTIONS.has(entry.action)
                          ? "font-medium text-danger-ink"
                          : "text-ink",
                      )}
                    >
                      {SECURITY_ACTIONS.has(entry.action) ? (
                        <ShieldX
                          className="mr-1 inline size-3.5"
                          aria-hidden="true"
                        />
                      ) : null}
                      {auditActionLabel(entry.action)}
                      {entry.entityType ? (
                        <span className="block text-2xs text-ink-muted">
                          {entry.entityType}{" "}
                          <span className="font-mono">
                            {entry.entityId?.slice(0, 8)}
                          </span>
                        </span>
                      ) : null}
                    </td>
                    <td className="break-words px-3 py-2 text-xs text-ink-secondary">
                      {detailsText(entry.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </section>
            <Pagination
              offset={offset}
              limit={PAGE_SIZE}
              total={audit.data.total}
              onChange={setOffset}
              noun="entries"
            />
          </>
        ) : (
          <EmptyState
            title="No entries match"
            description="Clear the search or widen the date range."
          />
        )}
      </Panel>
    </Page>
  );
}
