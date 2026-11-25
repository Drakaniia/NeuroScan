import * as Menubar from "@radix-ui/react-menubar";
import type { MenuNode, MenuSection } from "@/lib/menu-definition";
import type { MenuItemId } from "@/lib/menu-ids";

/**
 * The application menu bar (File · View · Help).
 *
 * Radix Menubar provides the desktop menu-bar contract: hovering a sibling
 * while a menu is open switches to it, arrow keys move between menus and
 * items, Escape closes and returns focus to the trigger.
 */
export function TitleBarMenu({
  sections,
  nodesFor,
  onSelect,
}: {
  sections: readonly MenuSection[];
  nodesFor: (section: MenuSection) => readonly MenuNode[];
  onSelect: (id: MenuItemId) => void;
}) {
  return (
    <Menubar.Root
      aria-label="Application menu"
      className="flex items-center gap-0.5 px-1"
    >
      {sections.map((section) => {
        const nodes = nodesFor(section);
        return (
          <Menubar.Menu key={section.label}>
            <Menubar.Trigger className="h-7 rounded-md px-2.5 text-[13px] font-medium text-ink-secondary outline-none transition-colors duration-fast hover:bg-black/[0.05] hover:text-ink focus-visible:shadow-focus data-[state=open]:bg-black/[0.07] data-[state=open]:text-ink">
              {section.label}
            </Menubar.Trigger>
            <Menubar.Portal>
              <Menubar.Content
                align="start"
                sideOffset={6}
                className="popover-motion material-overlay z-[70] min-w-[240px] rounded-xl p-1.5 outline-none"
              >
                {nodes.map((node, index) =>
                  node.kind === "separator" ? (
                    <Menubar.Separator
                      // Separators have no identity of their own; anchor on the item before.
                      key={`separator-after-${nodes[index - 1]?.kind === "item" ? (nodes[index - 1] as { id: string }).id : "start"}`}
                      className="mx-2 my-1 h-px bg-black/[0.08]"
                    />
                  ) : (
                    <Menubar.Item
                      key={node.id}
                      onSelect={() => onSelect(node.id)}
                      className="flex h-7 cursor-default items-center justify-between gap-8 rounded-md px-2.5 text-[13px] text-ink outline-none data-[highlighted]:bg-accent data-[highlighted]:text-white"
                    >
                      <span>{node.label}</span>
                      {node.accelerator ? (
                        <span className="font-mono text-2xs opacity-60">
                          {node.accelerator}
                        </span>
                      ) : null}
                    </Menubar.Item>
                  ),
                )}
              </Menubar.Content>
            </Menubar.Portal>
          </Menubar.Menu>
        );
      })}
    </Menubar.Root>
  );
}
