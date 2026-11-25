import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useCallback,
  useState,
} from "react";
import { TitleBar } from "@/components/chrome/TitleBar";
import { AppShell } from "@/components/shell/AppShell";
import { Button, buttonVariants } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/feedback";
import { MENU_SECTIONS } from "@/lib/menu-definition";
import { dispatchMenuAction } from "@/lib/menu-events";
import type { MenuItemId } from "@/lib/menu-ids";
import { useSession } from "@/lib/session";
import { ChangePasswordScreen } from "@/screens/auth/ChangePasswordForm";
import { LockScreen } from "@/screens/auth/LockScreen";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { SetupScreen } from "@/screens/auth/SetupScreen";

export class AppErrorBoundary extends Component<
  { children: ReactNode; onReturnHome: () => void },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <EmptyState
        className="flex-1"
        icon={<AlertTriangle className="size-5 text-danger" aria-hidden="true" />}
        title="Something went wrong on this screen"
        description={
          this.state.error.message ||
          "An unexpected error occurred. Your saved clinical records are unaffected."
        }
        action={
          <>
            <Button
              variant="secondary"
              icon={<RefreshCw className="size-4" aria-hidden="true" />}
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                this.setState({ error: null });
                this.props.onReturnHome();
              }}
            >
              Return to Worklist
            </Button>
          </>
        }
      />
    );
  }
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    component: RootLayout,
    errorComponent: ({ error, reset }) => (
      <EmptyState
        className="flex-1"
        icon={<AlertTriangle className="size-5 text-danger" aria-hidden="true" />}
        title="This screen encountered an error"
        description={
          error instanceof Error
            ? error.message
            : "An unexpected error occurred while rendering this view."
        }
        action={
          <>
            <Button
              variant="secondary"
              icon={<RefreshCw className="size-4" aria-hidden="true" />}
              onClick={reset}
            >
              Try again
            </Button>
            <Link to="/" className={buttonVariants({ variant: "primary" })}>
              Return to Worklist
            </Link>
          </>
        }
      />
    ),
    notFoundComponent: () => (
      <EmptyState
        title="Page not found"
        description="The address does not match any screen in NeuroScan."
        action={
          <Link to="/" className={buttonVariants({ variant: "primary" })}>
            Return to Worklist
          </Link>
        }
        className="flex-1"
      />
    ),
  },
);

/**
 * The window: the title bar is always present (it is the window frame); below
 * it, the session decides what may be shown. Nothing clinical renders until
 * the backend confirms an unlocked, signed-in session.
 */
function RootLayout() {
  const { phase, bootError, reload, can, lock, logout, facilityName } =
    useSession();
  const navigate = useNavigate();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const onMenuSelect = useCallback(
    (id: MenuItemId) =>
      dispatchMenuAction(id, {
        navigate: (to) => void navigate({ to }),
        newPatient: () => setRegisterOpen(true),
        lock: () => void lock(),
        signOut: () => void logout(),
        showShortcuts: () => setShortcutsOpen(true),
        quit: () => {},
      }),
    [lock, logout, navigate],
  );

  const active = phase === "active";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <a
        href="#main-content"
        className="sr-only z-[100] rounded-md bg-accent px-3 py-2 text-white focus:not-sr-only focus:absolute focus:left-3 focus:top-3"
      >
        Skip to main content
      </a>
      <TitleBar
        sections={active ? MENU_SECTIONS : undefined}
        can={can}
        onMenuSelect={active ? onMenuSelect : undefined}
        context={facilityName ?? undefined}
      />
      {phase === "loading" ? (
        <div
          className="flex flex-1 items-center justify-center gap-2 text-sm text-ink-muted"
          role="status"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Starting NeuroScan…
        </div>
      ) : phase === "unavailable" ? (
        <EmptyState
          className="flex-1"
          icon={
            <AlertTriangle className="size-5 text-warning" aria-hidden="true" />
          }
          title="The clinical backend is not available"
          description={
            bootError ??
            "This preview is running in a plain browser. Start NeuroScan as the desktop application (pnpm tauri:dev) to access patient records and the AI service."
          }
          action={<Button onClick={() => void reload()}>Try again</Button>}
        />
      ) : phase === "setup" ? (
        <SetupScreen />
      ) : phase === "signed_out" ? (
        <LoginScreen />
      ) : phase === "password_change" ? (
        <ChangePasswordScreen />
      ) : phase === "locked" ? (
        <LockScreen />
      ) : (
        <AppErrorBoundary onReturnHome={() => void navigate({ to: "/" })}>
          <AppShell
            registerOpen={registerOpen}
            setRegisterOpen={setRegisterOpen}
            shortcutsOpen={shortcutsOpen}
            setShortcutsOpen={setShortcutsOpen}
          />
        </AppErrorBoundary>
      )}
    </div>
  );
}
