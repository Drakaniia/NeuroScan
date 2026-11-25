import { beforeEach, describe, expect, it, vi } from "vitest";
import { MENU_IDS, QUIT_REQUESTED_EVENT } from "./menu-ids";

vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn() }));

import { listen } from "@tauri-apps/api/event";
import { MENU_SECTIONS, visibleNodes } from "./menu-definition";
import { dispatchMenuAction, subscribeToQuitRequests } from "./menu-events";
import { MENU_ROUTES } from "./navigation";

const mockedListen = vi.mocked(listen);

function createHandlers() {
  return {
    navigate: vi.fn(),
    newPatient: vi.fn(),
    lock: vi.fn(),
    signOut: vi.fn(),
    showShortcuts: vi.fn(),
    quit: vi.fn(),
  };
}

function calledHandlers(handlers: ReturnType<typeof createHandlers>) {
  return Object.entries(handlers)
    .filter(([, fn]) => fn.mock.calls.length > 0)
    .map(([name]) => name);
}

beforeEach(() => {
  vi.clearAllMocks();
  Reflect.deleteProperty(window, "__TAURI_IPC__");
});

describe("dispatchMenuAction", () => {
  it("navigates to the registered route for every navigation id", () => {
    for (const [id, route] of Object.entries(MENU_ROUTES)) {
      const handlers = createHandlers();
      dispatchMenuAction(id, handlers);
      expect(handlers.navigate).toHaveBeenCalledWith(route);
      expect(calledHandlers(handlers)).toEqual(["navigate"]);
    }
  });

  it("every menu item resolves to exactly one action", () => {
    for (const section of MENU_SECTIONS) {
      for (const node of section.nodes) {
        if (node.kind !== "item") continue;
        const handlers = createHandlers();
        dispatchMenuAction(node.id, handlers);
        expect(calledHandlers(handlers)).toHaveLength(1);
      }
    }
  });

  it("routes the session and window actions to their handlers", () => {
    const cases = [
      [MENU_IDS.fileExit, "quit"],
      [MENU_IDS.fileNewPatient, "newPatient"],
      [MENU_IDS.fileLock, "lock"],
      [MENU_IDS.fileSignOut, "signOut"],
      [MENU_IDS.helpShortcuts, "showShortcuts"],
    ] as const;
    for (const [id, expected] of cases) {
      const handlers = createHandlers();
      dispatchMenuAction(id, handlers);
      expect(calledHandlers(handlers)).toEqual([expected]);
    }
  });

  it("ignores ids it does not know, so a newer menu cannot crash the app", () => {
    const handlers = createHandlers();
    expect(() =>
      dispatchMenuAction("menu:view:not-built-yet", handlers),
    ).not.toThrow();
    expect(calledHandlers(handlers)).toEqual([]);
  });
});

describe("visibleNodes", () => {
  it("hides permission-gated items and the separators they leave behind", () => {
    const file = MENU_SECTIONS[0];
    const nodes = visibleNodes(file, () => false);
    expect(nodes[0]).toMatchObject({ kind: "item", id: MENU_IDS.fileLock });
    expect(
      nodes.some(
        (node) => node.kind === "item" && node.id === MENU_IDS.fileNewPatient,
      ),
    ).toBe(false);
    expect(nodes[nodes.length - 1]?.kind).toBe("item");
    expect(visibleNodes(file, () => true)[0]).toMatchObject({
      id: MENU_IDS.fileNewPatient,
    });
  });
});

describe("subscribeToQuitRequests", () => {
  it("does not register a listener in a plain browser", async () => {
    const unsubscribe = await subscribeToQuitRequests(vi.fn());
    expect(mockedListen).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("calls back when the backend asks for a quit decision", async () => {
    const off = vi.fn();
    mockedListen.mockResolvedValue(off as never);
    (window as unknown as Record<string, unknown>).__TAURI_IPC__ = () => {};

    const onRequested = vi.fn();
    const unsubscribe = await subscribeToQuitRequests(onRequested);
    expect(mockedListen).toHaveBeenCalledWith(
      QUIT_REQUESTED_EVENT,
      expect.any(Function),
    );

    const callback = mockedListen.mock.calls[0][1] as unknown as () => void;
    callback();
    expect(onRequested).toHaveBeenCalledTimes(1);

    unsubscribe();
    expect(off).toHaveBeenCalled();
  });
});
