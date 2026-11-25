//! Window close guard and the app quit handshake.
//!
//! The window is borderless (`decorations: false`), so the close button in the
//! custom title bar and every OS close path — Alt+F4, the taskbar, the window
//! menu — have to reach the same decision. That decision lives here rather than
//! in the webview, because this layer is what knows whether an AI analysis is
//! mid-flight: quit silently, or ask the webview to confirm and fall back to a
//! native dialog if it cannot answer.
//!
//! Completed results are already persisted one image at a time, so quitting
//! mid-run loses only the image in flight; the examination's status is
//! repaired on the next start.
//!
//! See `docs/spec/desktop-menu-bar-spec.md`.

use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use tauri::api::dialog;
use tauri::{AppHandle, Manager, WindowEvent};

use crate::state::AppState;

/// Rust → webview: a guarded quit is waiting on the user's decision.
pub const QUIT_REQUESTED_EVENT: &str = "app://quit-requested";

/// How long the webview has to answer a guarded quit before the native dialog
/// takes over. Only a webview that cannot answer ever reaches it.
const QUIT_FALLBACK: Duration = Duration::from_millis(1500);

/// The label Tauri gives the window declared in `tauri.conf.json`.
const MAIN_WINDOW: &str = "main";

/// True between "a guarded quit was requested" and the user's decision.
#[derive(Default)]
pub struct PendingQuit(AtomicBool);

impl PendingQuit {
    fn is_pending(&self) -> bool {
        self.0.load(Ordering::SeqCst)
    }

    /// Marks a decision as outstanding. False when one already is.
    fn begin(&self) -> bool {
        !self.0.swap(true, Ordering::SeqCst)
    }

    fn clear(&self) {
        self.0.store(false, Ordering::SeqCst);
    }
}

fn analysis_running(app: &AppHandle) -> bool {
    app.try_state::<AppState>()
        .map(|state| state.queue.is_busy())
        .unwrap_or(false)
}

/// Sends every OS-initiated close through the same guard as the title bar.
pub fn guard_window_close(app: &mut tauri::App) {
    let Some(window) = app.get_window(MAIN_WINDOW) else {
        return;
    };

    let handle = app.handle().clone();

    window.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            if analysis_running(&handle) {
                api.prevent_close();
                begin_quit(&handle);
            }
        }
    });
}

/// Quits, or asks first when an analysis is still in progress.
fn begin_quit(app: &AppHandle) {
    if !analysis_running(app) {
        app.exit(0);
        return;
    }

    // A decision is already on screen; a second request must not stack one.
    if !app.state::<PendingQuit>().begin() {
        return;
    }

    let _ = app.emit_all(QUIT_REQUESTED_EVENT, ());

    // Fallback for a webview that cannot answer, so a wedged window can never
    // make the app unquittable. Runs off the main thread, so blocking is right.
    let handle = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(QUIT_FALLBACK);

        if !handle.state::<PendingQuit>().is_pending() {
            return;
        }

        let parent = handle.get_window(MAIN_WINDOW);
        let quit = dialog::blocking::ask(
            parent.as_ref(),
            "Quit NeuroScan?",
            "An AI analysis is still running. Quitting now stops it; results already completed are saved.",
        );

        if quit {
            handle.exit(0);
        } else {
            handle.state::<PendingQuit>().clear();
        }
    });
}

/// Called by the title bar's close button and by File > Exit.
#[tauri::command]
pub fn request_quit(app: AppHandle) {
    begin_quit(&app);
}

/// The user confirmed the guarded quit.
#[tauri::command]
pub fn confirm_quit(app: AppHandle) {
    app.exit(0);
}

/// The user chose to keep working: stand the guard down.
#[tauri::command]
pub fn cancel_quit(state: tauri::State<'_, PendingQuit>) {
    state.clear();
}
