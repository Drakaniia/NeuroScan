import { createFileRoute } from "@tanstack/react-router";
import {
  type SettingsTab,
  SettingsScreen,
} from "@/screens/settings/SettingsScreen";

const TABS: SettingsTab[] = ["account", "general", "ai", "users", "system"];

export const Route = createFileRoute("/settings")({
  validateSearch: (search: Record<string, unknown>): { tab?: SettingsTab } => {
    const tab = search.tab;
    return typeof tab === "string" && (TABS as string[]).includes(tab)
      ? { tab: tab as SettingsTab }
      : {};
  },
  component: SettingsRoute,
});

function SettingsRoute() {
  const { tab } = Route.useSearch();
  return <SettingsScreen tab={tab ?? "account"} />;
}
