import { useNavigate } from "@tanstack/react-router";
import {
  Brain,
  HardDrive,
  type LucideIcon,
  MonitorCog,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useId } from "react";
import { Page } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/Button";
import {
  Callout,
  DefinitionList,
  ErrorState,
  PageHeader,
  Panel,
  Spinner,
} from "@/components/ui/feedback";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import {
  useSettings,
  useSystemInfo,
  useUpdateSettings,
} from "@/lib/api/queries";
import type { Permission } from "@/lib/api/types";
import { formatBytes, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/format";
import { useSession } from "@/lib/session";
import { useForm } from "@/lib/use-form";
import { cn } from "@/lib/utils";
import { ChangePasswordForm } from "@/screens/auth/ChangePasswordForm";
import { AiModelSettings } from "./AiModelSettings";
import { UsersSettings } from "./UsersSettings";

export type SettingsTab = "account" | "general" | "ai" | "users" | "system";

const TABS: {
  value: SettingsTab;
  label: string;
  icon: LucideIcon;
  tint: string;
  permission?: Permission;
}[] = [
  { value: "account", label: "My account", icon: UserRound, tint: "bg-[rgb(100_104_114)]" },
  { value: "ai", label: "AI model", icon: Brain, tint: "bg-[rgb(88_86_214)]" },
  {
    value: "general",
    label: "Workstation",
    icon: MonitorCog,
    tint: "bg-accent",
    permission: "settings_manage",
  },
  {
    value: "users",
    label: "Users",
    icon: Users,
    tint: "bg-[rgb(36_138_61)]",
    permission: "user_manage",
  },
  {
    value: "system",
    label: "System",
    icon: HardDrive,
    tint: "bg-[rgb(142_142_147)]",
    permission: "settings_manage",
  },
];

function GeneralSettings() {
  const settings = useSettings();
  const update = useUpdateSettings();
  const toast = useToast();
  const form = useForm({
    facilityName: "",
    department: "",
    sessionTimeoutMinutes: "15",
    autoAnalyzeOnImport: false,
  });
  const { reset } = form;

  useEffect(() => {
    if (settings.data) {
      reset({
        facilityName: settings.data.facilityName,
        department: settings.data.department ?? "",
        sessionTimeoutMinutes: String(settings.data.sessionTimeoutMinutes),
        autoAnalyzeOnImport: settings.data.autoAnalyzeOnImport,
      });
    }
  }, [settings.data, reset]);

  if (settings.isLoading) return <Spinner label="Loading settings…" />;
  if (settings.isError)
    return (
      <ErrorState
        error={settings.error}
        onRetry={() => void settings.refetch()}
      />
    );

  const save = async () => {
    const minutes = Number(form.values.sessionTimeoutMinutes);
    const found: Record<string, string> = {};
    if (!form.values.facilityName.trim())
      found.facilityName = "Facility name is required.";
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240)
      found.sessionTimeoutMinutes = "Enter 1–240 minutes.";
    if (!form.check(found)) return;
    try {
      await update.mutateAsync({
        facilityName: form.values.facilityName.trim(),
        department: form.values.department.trim() || null,
        sessionTimeoutMinutes: minutes,
        autoAnalyzeOnImport: form.values.autoAnalyzeOnImport,
      });
      toast.success(
        "Settings saved",
        "The new session timeout applies from the next sign-in.",
      );
    } catch (error) {
      form.fail(error);
    }
  };

  return (
    <Panel
      title="Workstation"
      description="Applies to every user of this workstation."
      bodyClassName="p-4"
    >
      <form
        className="space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        {form.formError ? (
          <Callout tone="danger">{form.formError}</Callout>
        ) : null}
        <div className="grid max-w-2xl grid-cols-2 gap-3">
          <Field
            label="Facility name"
            required
            error={form.errors.facilityName}
            hint="Printed on reports."
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={form.values.facilityName}
                onChange={(event) => form.set("facilityName", event.target.value)}
              />
            )}
          </Field>
          <Field label="Department" error={form.errors.department}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                value={form.values.department}
                onChange={(event) => form.set("department", event.target.value)}
              />
            )}
          </Field>
          <Field
            label="Automatic lock after inactivity (minutes)"
            required
            error={form.errors.sessionTimeoutMinutes}
            hint="The workstation locks and hides patient information after this period without input."
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                type="number"
                min={1}
                max={240}
                value={form.values.sessionTimeoutMinutes}
                onChange={(event) =>
                  form.set("sessionTimeoutMinutes", event.target.value)
                }
              />
            )}
          </Field>
        </div>
        <Checkbox
          checked={form.values.autoAnalyzeOnImport}
          onChange={(value) => form.set("autoAnalyzeOnImport", value)}
          label="Run AI analysis automatically after import"
          description="Only when a validated model is loaded and the importing user may run analysis."
        />
        <Button type="submit" variant="primary" loading={update.isPending}>
          Save settings
        </Button>
      </form>
    </Panel>
  );
}

function AccountSettings() {
  const { session } = useSession();
  const toast = useToast();
  if (!session) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Profile" bodyClassName="space-y-4 p-4">
        <DefinitionList
          columns={2}
          items={[
            { label: "Name", value: session.user.fullName },
            { label: "Username", value: session.user.username, mono: true },
            { label: "Role", value: ROLE_LABELS[session.user.role] },
            {
              label: "Automatic lock",
              value: `${session.timeoutMinutes} minutes of inactivity`,
            },
          ]}
        />
        <p className="text-sm text-ink-secondary">
          {ROLE_DESCRIPTIONS[session.user.role]}
        </p>
      </Panel>
      <Panel title="Change password" bodyClassName="p-4">
        <ChangePasswordForm onDone={() => toast.success("Password changed")} />
      </Panel>
    </div>
  );
}

function SystemSettings() {
  const info = useSystemInfo();
  if (info.isLoading) return <Spinner label="Reading system information…" />;
  if (info.isError || !info.data)
    return (
      <ErrorState error={info.error} onRetry={() => void info.refetch()} />
    );
  const data = info.data;
  return (
    <Panel
      title="System"
      description="Local storage on this workstation."
      bodyClassName="space-y-4 p-4"
    >
      <DefinitionList
        columns={3}
        items={[
          { label: "Application version", value: data.appVersion },
          { label: "Database size", value: formatBytes(data.databaseBytes) },
          {
            label: "Image storage",
            value: formatBytes(data.imageStorageBytes),
          },
          { label: "Patients", value: data.patients.toLocaleString() },
          { label: "Examinations", value: data.examinations.toLocaleString() },
          { label: "Images", value: data.images.toLocaleString() },
          { label: "AI analyses", value: data.analyses.toLocaleString() },
          { label: "Users", value: data.users.toLocaleString() },
          { label: "Audit entries", value: data.auditEntries.toLocaleString() },
        ]}
      />
      <DefinitionList
        columns={1}
        items={[
          { label: "Data folder", value: data.dataDirectory, mono: true },
        ]}
      />
      <Callout tone="info" title="Backups and access control">
        The data folder holds the database and every imported image. Include it
        in the facility's backup schedule and restrict file-system access to it;
        the application's sign-in protects the interface, not the files on disk.
      </Callout>
    </Panel>
  );
}

export function SettingsScreen({ tab }: { tab: SettingsTab }) {
  const navigate = useNavigate();
  const { can } = useSession();
  const baseId = useId();
  const tabs = TABS.filter((item) => !item.permission || can(item.permission));
  const active = tabs.some((item) => item.value === tab) ? tab : "account";
  const tabId = (value: SettingsTab) => `${baseId}-tab-${value}`;

  return (
    <Page>
      <PageHeader title="Settings" />
      <div className="grid items-start gap-6 lg:grid-cols-[208px_minmax(0,1fr)]">
      <div
        role="tablist"
        aria-label="Settings sections"
        aria-orientation="vertical"
        className="flex flex-col gap-px lg:sticky lg:top-4"
      >
        {tabs.map((item, index) => {
          const Icon = item.icon;
          const selected = active === item.value;
          return (
            <button
              key={item.value}
              id={tabId(item.value)}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => {
                void navigate({ to: "/settings", search: { tab: item.value } });
              }}
              onKeyDown={(event) => {
                const list = event.currentTarget.parentElement;
                if (!list) return;
                const buttons = Array.from(
                  list.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
                );
                const nextIndex =
                  event.key === "ArrowDown"
                    ? (index + 1) % buttons.length
                    : event.key === "ArrowUp"
                      ? (index - 1 + buttons.length) % buttons.length
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? buttons.length - 1
                          : -1;
                if (nextIndex < 0) return;
                event.preventDefault();
                buttons[nextIndex]?.focus();
              }}
              className={cn(
                "pressable flex h-9 items-center gap-2.5 rounded-lg px-2 text-left text-[13px] font-medium outline-none focus-visible:shadow-focus",
                selected
                  ? "bg-accent text-white"
                  : "text-ink hover:bg-black/[0.045]",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-6 items-center justify-center rounded-[7px] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]",
                  item.tint,
                  selected && "ring-1 ring-white/50",
                )}
              >
                <Icon className="size-3.5" strokeWidth={2.2} />
              </span>
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        aria-labelledby={tabId(active)}
        key={active}
        className="min-w-0 animate-fade-in"
      >
        {active === "account" ? (
          <AccountSettings />
        ) : active === "ai" ? (
          <AiModelSettings />
        ) : active === "general" ? (
          <GeneralSettings />
        ) : active === "users" ? (
          <UsersSettings />
        ) : (
          <SystemSettings />
        )}
      </div>
      </div>
    </Page>
  );
}
