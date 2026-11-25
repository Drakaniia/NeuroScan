import { listen } from "@tauri-apps/api/event";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api, onSessionError } from "@/lib/api/client";
import { EVENTS } from "@/lib/api/events";
import type { Permission, SessionInfo, SetupInput } from "@/lib/api/types";
import { isPreviewMode } from "@/lib/preview/mode";
import { isTauriRuntime } from "@/lib/tauri";

/**
 * The workstation session as the interface sees it.
 *
 * The backend owns the truth — it re-checks the session and the role on every
 * command — so this context only mirrors it: it boots from `app_bootstrap`,
 * follows `session_locked` / `unauthenticated` errors from any command, sends
 * an activity heartbeat while the user is working, and locks the screen when
 * the inactivity timeout elapses.
 */

export type SessionPhase =
  | "loading"
  | "unavailable"
  | "setup"
  | "signed_out"
  | "password_change"
  | "locked"
  | "active";

interface SessionContextValue {
  phase: SessionPhase;
  session: SessionInfo | null;
  appVersion: string;
  facilityName: string | null;
  bootError: string | null;
  can: (permission: Permission) => boolean;
  setup: (input: SetupInput) => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  lock: () => Promise<void>;
  unlock: (password: string) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  reload: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const HEARTBEAT_MS = 60_000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "wheel"] as const;

function phaseOf(session: SessionInfo | null): SessionPhase {
  if (!session) return "signed_out";
  if (session.locked) return "locked";
  if (session.user.mustChangePassword) return "password_change";
  return "active";
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<SessionPhase>("loading");
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [appVersion, setAppVersion] = useState("");
  const [facilityName, setFacilityName] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const lastActivity = useRef(Date.now());
  const lastHeartbeat = useRef(Date.now());

  const apply = useCallback((next: SessionInfo | null) => {
    setSession(next);
    setPhase(phaseOf(next));
  }, []);

  const reload = useCallback(async () => {
    if (!isTauriRuntime() && !(import.meta.env.DEV && isPreviewMode())) {
      setPhase("unavailable");
      return;
    }
    try {
      const boot = await api.bootstrap();
      setAppVersion(boot.appVersion);
      setFacilityName(boot.facilityName);
      setBootError(null);
      if (boot.setupRequired) {
        setSession(null);
        setPhase("setup");
      } else {
        apply(boot.session);
      }
    } catch (error) {
      setBootError(error instanceof Error ? error.message : String(error));
      setPhase("unavailable");
    }
  }, [apply]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Any command failing on the session moves the interface with it.
  useEffect(
    () =>
      onSessionError((error) => {
        if (error.code === "session_locked") {
          setSession((current) =>
            current ? { ...current, locked: true } : current,
          );
          setPhase((current) =>
            current === "signed_out" ? current : "locked",
          );
        } else if (error.code === "unauthenticated") {
          setSession(null);
          setPhase("signed_out");
        } else if (error.code === "password_change_required") {
          setPhase("password_change");
        }
      }),
    [],
  );

  useEffect(() => {
    if (!isTauriRuntime()) return;
    const off = listen<{ locked: boolean }>(EVENTS.session, (event) => {
      if (event.payload.locked) {
        setSession((current) =>
          current ? { ...current, locked: true } : current,
        );
        setPhase((current) => (current === "active" ? "locked" : current));
      }
    });
    return () => {
      void off.then((unlisten) => unlisten());
    };
  }, []);

  // Activity tracking, heartbeat and the inactivity lock.
  useEffect(() => {
    if (phase !== "active" || !session) return;
    const timeoutMs = session.timeoutMinutes * 60_000;
    const onActivity = () => {
      lastActivity.current = Date.now();
    };
    for (const name of ACTIVITY_EVENTS)
      window.addEventListener(name, onActivity, { passive: true });
    lastActivity.current = Date.now();

    const timer = window.setInterval(() => {
      const now = Date.now();
      if (now - lastActivity.current >= timeoutMs) {
        void api.lock().catch(() => {});
        setSession((current) =>
          current ? { ...current, locked: true } : current,
        );
        setPhase("locked");
        return;
      }
      if (
        lastActivity.current > lastHeartbeat.current &&
        now - lastHeartbeat.current >= HEARTBEAT_MS
      ) {
        lastHeartbeat.current = now;
        void api.heartbeat().catch(() => {});
      }
    }, 5_000);

    return () => {
      for (const name of ACTIVITY_EVENTS)
        window.removeEventListener(name, onActivity);
      window.clearInterval(timer);
    };
  }, [phase, session]);

  const value = useMemo<SessionContextValue>(
    () => ({
      phase,
      session,
      appVersion,
      facilityName,
      bootError,
      can: (permission) => Boolean(session?.permissions.includes(permission)),
      setup: async (input) => {
        const info = await api.setup(input);
        setFacilityName(input.facilityName.trim());
        lastHeartbeat.current = Date.now();
        apply(info);
      },
      login: async (username, password) => {
        const info = await api.login(username, password);
        queryClient.clear();
        lastHeartbeat.current = Date.now();
        apply(info);
      },
      logout: async () => {
        await api.logout().catch(() => {});
        // Patient data must not linger in memory for the next user.
        queryClient.clear();
        apply(null);
      },
      lock: async () => {
        await api.lock().catch(() => {});
        setSession((current) =>
          current ? { ...current, locked: true } : current,
        );
        setPhase("locked");
      },
      unlock: async (password) => {
        try {
          const info = await api.unlock(password);
          lastHeartbeat.current = Date.now();
          apply(info);
        } catch (error) {
          // Repeated failures end the session in the backend; follow it.
          const boot = await api.bootstrap().catch(() => null);
          if (boot && !boot.session) {
            queryClient.clear();
            apply(null);
          }
          throw error;
        }
      },
      changePassword: async (current, next) => {
        apply(await api.changePassword(current, next));
      },
      reload,
    }),
    [
      apply,
      appVersion,
      bootError,
      facilityName,
      phase,
      queryClient,
      reload,
      session,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context)
    throw new Error("useSession must be used inside SessionProvider");
  return context;
}

/** The signed-in user; only valid inside the authenticated shell. */
export function useCurrentUser() {
  const { session } = useSession();
  if (!session)
    throw new Error("useCurrentUser called without an active session");
  return session.user;
}
