import { Link, useRouterState } from "@tanstack/react-router";
import {
  ClipboardList,
  FileClock,
  Info,
  type LucideIcon,
  Lock,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ScrollText,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AiStatusIcon, describeAi } from "@/components/ai/AiStatusIndicator";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";
import { useAiStatus, useExamStats } from "@/lib/api/queries";
import type { Permission } from "@/lib/api/types";
import { ROLE_LABELS } from "@/lib/format";
import { useSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import { useShell } from "./shell-context";

interface NavItem {
  to: "/" | "/patients" | "/exams" | "/audit" | "/settings" | "/about";
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  permission?: Permission;
  /** Also active for nested routes (`/patients/…`). */
  matchPrefix?: boolean;
}

const PRIMARY: NavItem[] = [
  { to: "/", label: "Worklist", icon: ClipboardList, shortcut: "Ctrl+1" },
  {
    to: "/patients",
    label: "Patients",
    icon: Users,
    shortcut: "Ctrl+2",
    matchPrefix: true,
  },
  {
    to: "/exams",
    label: "Examinations",
    icon: FileClock,
    shortcut: "Ctrl+3",
    matchPrefix: true,
  },
];

const SECONDARY: NavItem[] = [
  {
    to: "/audit",
    label: "Audit log",
    icon: ScrollText,
    permission: "audit_read",
  },
  { to: "/settings", label: "Settings", icon: Settings, shortcut: "Ctrl+," },
  { to: "/about", label: "About & help", icon: Info, shortcut: "F1" },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * The floating source list. A translucent material panel inset from the
 * window edge, so the canvas reads behind it; the selected row is a solid
 * accent-tinted capsule. Counts are live from the backend, never decorative.
 */
export function Sidebar() {
  const { session, can, lock, logout } = useSession();
  const { openCommandPalette, registerPatient } = useShell();
  const stats = useExamStats();
  const ai = useAiStatus();
  const availability = describeAi(ai.data);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const inWorkspace = /^\/exams\/[^/]+$/.test(pathname);
  const [collapsed, setCollapsed] = useState(
    () => inWorkspace && window.innerWidth < 1440,
  );

  // Give the MRI viewer room on narrower windows (including live resize);
  // restore the full rail when leaving the workspace or widening past 1440px.
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1439px)");
    const sync = () =>
      setCollapsed(inWorkspace && (query.matches || window.innerWidth < 1440));
    sync();
    query.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    return () => {
      query.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, [inWorkspace]);

  const isActive = (item: NavItem) =>
    item.to === "/"
      ? pathname === "/"
      : item.matchPrefix
        ? pathname.startsWith(item.to)
        : pathname === item.to;

  const counts: Partial<Record<NavItem["to"], number>> = {
    "/": stats.data?.totalOpen,
  };
  const flagged = stats.data?.flaggedOpen ?? 0;

  const renderItem = (item: NavItem) => {
    if (item.permission && !can(item.permission)) return null;
    const active = isActive(item);
    const Icon = item.icon;
    const count = counts[item.to];
    const link = (
      <Link
        to={item.to}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? item.label : undefined}
        title={
          !collapsed && item.shortcut
            ? `${item.label} (${item.shortcut})`
            : undefined
        }
        className={cn(
          "group relative flex h-8 items-center rounded-lg text-[13px] outline-none transition-colors duration-fast focus-visible:shadow-focus",
          collapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
          active
            ? "bg-accent/[0.13] font-semibold text-accent-ink"
            : "font-medium text-ink-secondary hover:bg-black/[0.045] hover:text-ink",
        )}
      >
        <Icon
          aria-hidden="true"
          strokeWidth={active ? 2.1 : 1.8}
          className={cn(
            "size-[17px] shrink-0",
            active
              ? "text-accent"
              : "text-ink-muted group-hover:text-ink-secondary",
          )}
        />
        {collapsed ? (
          item.to === "/" && flagged > 0 ? (
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger"
            />
          ) : null
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.to === "/" && flagged > 0 ? (
              <span
                className="tabular rounded-full bg-danger px-1.5 text-2xs font-semibold leading-[18px] text-white"
                title={`${flagged} open examinations flagged by AI`}
              >
                {flagged}
              </span>
            ) : null}
            {typeof count === "number" && count > 0 ? (
              <span
                className={cn(
                  "tabular text-xs",
                  active ? "text-accent-ink/80" : "text-ink-faint",
                )}
              >
                {count}
              </span>
            ) : null}
          </>
        )}
      </Link>
    );
    return (
      <li key={item.to}>
        {collapsed ? (
          <Tooltip content={item.label} shortcut={item.shortcut} side="right">
            {link}
          </Tooltip>
        ) : (
          link
        )}
      </li>
    );
  };

  const user = session?.user;

  return (
    <aside
      aria-label="Sidebar"
      className={cn(
        "no-print material-sidebar mb-2 ml-2 flex shrink-0 flex-col rounded-[14px]",
        collapsed ? "w-[56px]" : "w-[var(--sidebar-w)]",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-1 p-2 pb-1",
          collapsed && "flex-col",
        )}
      >
        {collapsed ? (
          <>
            <IconButton
              label="Expand sidebar"
              tooltipSide="right"
              onClick={() => setCollapsed(false)}
              icon={<PanelLeftOpen className="size-4" aria-hidden="true" />}
            />
            <IconButton
              label="Search"
              shortcut="Ctrl+K"
              tooltipSide="right"
              onClick={openCommandPalette}
              icon={<Search className="size-4" aria-hidden="true" />}
            />
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={openCommandPalette}
              className="pressable group flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg bg-black/[0.045] px-2.5 text-left text-[13px] text-ink-muted shadow-[inset_0_0_0_0.5px_rgb(0_0_0/0.04)] hover:bg-black/[0.07] focus-visible:outline-none focus-visible:shadow-focus"
            >
              <Search className="size-[15px] shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">Search…</span>
              <kbd className="font-mono text-2xs text-ink-faint">Ctrl K</kbd>
            </button>
            {can("patient_write") ? (
              <IconButton
                label="Register patient"
                shortcut="Ctrl+N"
                tooltipSide="right"
                onClick={registerPatient}
                icon={<UserPlus className="size-4" aria-hidden="true" />}
              />
            ) : null}
            <IconButton
              label="Collapse sidebar"
              tooltipSide="right"
              onClick={() => setCollapsed(true)}
              icon={<PanelLeftClose className="size-4" aria-hidden="true" />}
            />
          </>
        )}
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-2 py-2">
        {!collapsed ? (
          <p className="type-eyebrow mb-1 px-2.5 text-ink-faint">Reading</p>
        ) : null}
        <ul className="space-y-px">{PRIMARY.map(renderItem)}</ul>
        {!collapsed ? (
          <p className="type-eyebrow mb-1 mt-5 px-2.5 text-ink-faint">System</p>
        ) : (
          <div className="my-2.5 h-px bg-black/[0.07]" aria-hidden="true" />
        )}
        <ul className="space-y-px">{SECONDARY.map(renderItem)}</ul>
      </nav>

      <div className={cn("space-y-1 p-2 pt-0", collapsed && "flex flex-col items-center")}>
        <Tooltip
          content={
            collapsed ? `${availability.label} — ${availability.detail}` : availability.detail
          }
          side="right"
        >
          <Link
            to="/settings"
            search={{ tab: "ai" }}
            aria-label={collapsed ? availability.label : undefined}
            className={cn(
              "flex h-8 min-w-0 items-center rounded-lg text-xs text-ink-secondary outline-none transition-colors duration-fast hover:bg-black/[0.045] hover:text-ink focus-visible:shadow-focus",
              collapsed ? "w-8 justify-center px-0" : "gap-2 px-2.5",
            )}
          >
            <AiStatusIcon status={ai.data} className="size-[15px]" />
            {!collapsed ? (
              <span className="truncate">{availability.label}</span>
            ) : null}
          </Link>
        </Tooltip>

        {user ? (
          collapsed ? (
            <div className="flex flex-col items-center gap-1 pt-1">
              <IconButton
                size="sm"
                label="Lock workstation"
                shortcut="Ctrl+L"
                tooltipSide="right"
                onClick={() => void lock()}
                icon={<Lock className="size-[15px]" aria-hidden="true" />}
              />
              <IconButton
                size="sm"
                label="Sign out"
                tooltipSide="right"
                onClick={() => void logout()}
                icon={<LogOut className="size-[15px]" aria-hidden="true" />}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-[10px] bg-white/60 p-1.5 pl-2 shadow-[0_0_0_0.5px_rgb(0_0_0/0.06),0_1px_2px_rgb(16_18_27/0.04)]">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[rgb(120_124_134)] to-[rgb(84_88_98)] text-xs font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]"
              >
                {initials(user.fullName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold leading-4 text-ink">
                  {user.fullName}
                </p>
                <p className="truncate text-2xs text-ink-muted">
                  {ROLE_LABELS[user.role]}
                </p>
              </div>
              <IconButton
                size="sm"
                label="Lock workstation"
                shortcut="Ctrl+L"
                tooltipSide="top"
                onClick={() => void lock()}
                icon={<Lock className="size-[15px]" aria-hidden="true" />}
              />
              <IconButton
                size="sm"
                label="Sign out"
                tooltipSide="top"
                onClick={() => void logout()}
                icon={<LogOut className="size-[15px]" aria-hidden="true" />}
              />
            </div>
          )
        ) : null}
      </div>
    </aside>
  );
}
