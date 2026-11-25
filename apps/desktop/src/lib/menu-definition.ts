import type { Permission } from "./api/types";
import { MENU_IDS, type MenuItemId } from "./menu-ids";

/**
 * The application menu, in one place.
 *
 * The menu bar renders from this structure and the keyboard registry in
 * `navigation.ts` resolves the same ids, so a menu item and its accelerator
 * cannot drift apart. Items that need a permission are hidden from roles
 * without it rather than shown greyed: there is nothing to discover there.
 *
 * `accelerator` is display text only; bindings live in `navigation.ts` and
 * in the shell.
 */
export interface MenuItem {
  kind: "item";
  id: MenuItemId;
  label: string;
  accelerator?: string;
  permission?: Permission;
}

export interface MenuSeparator {
  kind: "separator";
}

export type MenuNode = MenuItem | MenuSeparator;

export interface MenuSection {
  label: string;
  nodes: readonly MenuNode[];
}

const separator: MenuSeparator = { kind: "separator" };

export const MENU_SECTIONS: readonly MenuSection[] = [
  {
    label: "File",
    nodes: [
      {
        kind: "item",
        id: MENU_IDS.fileNewPatient,
        label: "Register patient…",
        accelerator: "Ctrl+N",
        permission: "patient_write",
      },
      separator,
      {
        kind: "item",
        id: MENU_IDS.fileLock,
        label: "Lock workstation",
        accelerator: "Ctrl+L",
      },
      { kind: "item", id: MENU_IDS.fileSignOut, label: "Sign out" },
      separator,
      {
        kind: "item",
        id: MENU_IDS.fileExit,
        label: "Exit",
        accelerator: "Alt+F4",
      },
    ],
  },
  {
    label: "View",
    nodes: [
      {
        kind: "item",
        id: MENU_IDS.viewWorklist,
        label: "Worklist",
        accelerator: "Ctrl+1",
      },
      {
        kind: "item",
        id: MENU_IDS.viewPatients,
        label: "Patients",
        accelerator: "Ctrl+2",
      },
      {
        kind: "item",
        id: MENU_IDS.viewExaminations,
        label: "Examinations",
        accelerator: "Ctrl+3",
      },
      separator,
      {
        kind: "item",
        id: MENU_IDS.viewAudit,
        label: "Audit log",
        permission: "audit_read",
      },
      {
        kind: "item",
        id: MENU_IDS.viewSettings,
        label: "Settings",
        accelerator: "Ctrl+,",
      },
    ],
  },
  {
    label: "Help",
    nodes: [
      {
        kind: "item",
        id: MENU_IDS.helpShortcuts,
        label: "Keyboard shortcuts",
        accelerator: "?",
      },
      {
        kind: "item",
        id: MENU_IDS.helpAbout,
        label: "About NeuroScan",
        accelerator: "F1",
      },
    ],
  },
];

export function visibleNodes(
  section: MenuSection,
  can: (permission: Permission) => boolean,
): MenuNode[] {
  const nodes = section.nodes.filter(
    (node) =>
      node.kind === "separator" || !node.permission || can(node.permission),
  );
  // Drop leading, trailing and doubled separators left by hidden items.
  return nodes.filter((node, index) => {
    if (node.kind !== "separator") return true;
    const previous = nodes[index - 1];
    return (
      index > 0 && index < nodes.length - 1 && previous?.kind !== "separator"
    );
  });
}
