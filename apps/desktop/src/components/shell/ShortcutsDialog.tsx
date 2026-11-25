import { Dialog } from "@/components/ui/Dialog";
import { Kbd } from "@/components/ui/feedback";

const GROUPS: { title: string; items: [string[], string][] }[] = [
  {
    title: "Navigation",
    items: [
      [["Ctrl", "K"], "Command palette and record search"],
      [["Ctrl", "1"], "Worklist"],
      [["Ctrl", "2"], "Patients"],
      [["Ctrl", "3"], "Examinations"],
      [["Ctrl", ","], "Settings"],
      [["F1"], "About & help"],
      [["Ctrl", "F"], "Focus search on list screens"],
    ],
  },
  {
    title: "Session",
    items: [
      [["Ctrl", "N"], "Register a patient"],
      [["Ctrl", "L"], "Lock the workstation"],
      [["?"], "Show this list"],
    ],
  },
  {
    title: "Image viewer",
    items: [
      [["↑", "↓"], "Previous / next image"],
      [["Wheel"], "Zoom at the pointer"],
      [["Drag"], "Pan (Pan tool) or adjust window/level (W/L tool)"],
      [["W"], "Window/level tool"],
      [["P"], "Pan tool"],
      [["H"], "Show / hide AI heatmap"],
      [["I"], "Invert grayscale"],
      [["R"], "Reset view and window"],
      [["F"], "Fit to window"],
    ],
  },
];

export function ShortcutsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Keyboard shortcuts" size="lg">
      <div className="grid grid-cols-2 gap-x-8 gap-y-6">
        {GROUPS.map((group) => (
          <section
            key={group.title}
            className={
              group.title === "Image viewer" ? "col-span-2" : undefined
            }
          >
            <h3 className="type-eyebrow mb-2 text-ink-muted">{group.title}</h3>
            <dl
              className={
                group.title === "Image viewer"
                  ? "grid grid-cols-2 gap-x-8 divide-y-0"
                  : ""
              }
            >
              {group.items.map(([keys, label]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 border-b border-line/70 py-1.5 last:border-0"
                >
                  <dt className="text-sm text-ink-secondary">{label}</dt>
                  <dd className="flex shrink-0 gap-1">
                    {keys.map((key) => (
                      <Kbd key={key}>{key}</Kbd>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
