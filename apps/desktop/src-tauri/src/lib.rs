//! NeuroScan backend.
//!
//! ```text
//! commands ──▶ state (session + permission gate) ──▶ domain modules ──▶ db (SQLite)
//!     │                                                   │
//!     └──▶ analysis queue (worker thread) ──▶ ai (manifest → preprocess → engine → postprocess)
//! protocol (neuroscan://) ──▶ imaging (decode PNG/JPEG/DICOM)
//! ```
//!
//! The webview never touches files, the database or the model directly; it
//! asks through commands and the image protocol, and every request is checked
//! against the signed-in user's role.

// Rust 1.100+ resolves WaitOnAddress from the first import lib; Tauri 1.x's
// windows 0.37/0.39 bind it to vertdll.dll (enclave-only -> 0xC0000005).
#[cfg(all(windows, target_env = "msvc"))]
#[link(name = "synchronization", kind = "dylib")]
extern "C" {}

pub mod ai;
pub mod analysis;
pub mod audit;
pub mod auth;
pub mod commands;
pub mod db;
pub mod error;
pub mod exams;
pub mod export;
pub mod imaging;
pub mod patients;
pub mod protocol;
pub mod quit_guard;
pub mod reviews;
pub mod settings;
pub mod state;
pub mod util;

use std::path::PathBuf;
use std::sync::Arc;

use tauri::Manager;

use crate::analysis::Emitter;
use crate::state::AppState;

/// Overrides the data directory (database, images, models). Used for
/// portable installs and for testing against a throwaway database.
pub const DATA_DIR_ENV: &str = "NEUROSCAN_DATA_DIR";

fn data_directory(app: &tauri::App) -> Option<PathBuf> {
    if let Ok(path) = std::env::var(DATA_DIR_ENV) {
        if !path.trim().is_empty() {
            return Some(PathBuf::from(path.trim()));
        }
    }
    app.path_resolver().app_data_dir()
}

fn fatal(message: &str) -> ! {
    tauri::api::dialog::blocking::message(
        None::<&tauri::Window>,
        "NeuroScan could not start",
        message,
    );
    std::process::exit(1);
}

pub fn run() {
    tauri::Builder::default()
        .manage(quit_guard::PendingQuit::default())
        .register_uri_scheme_protocol("neuroscan", protocol::handle)
        .invoke_handler(tauri::generate_handler![
            commands::app_bootstrap,
            commands::setup_initialize,
            commands::auth_login,
            commands::auth_logout,
            commands::auth_lock,
            commands::auth_unlock,
            commands::auth_heartbeat,
            commands::auth_change_password,
            commands::users_list,
            commands::users_create,
            commands::users_update,
            commands::users_reset_password,
            commands::settings_get,
            commands::settings_update,
            commands::system_info,
            commands::patients_list,
            commands::patients_get,
            commands::patients_create,
            commands::patients_update,
            commands::exams_list,
            commands::exams_stats,
            commands::exams_create,
            commands::exams_update,
            commands::exams_get,
            commands::images_import,
            commands::images_import_dialog,
            commands::images_remove,
            commands::images_analysis_history,
            commands::ai_status,
            commands::ai_reload,
            commands::ai_set_model_directory,
            commands::ai_choose_model_directory,
            commands::analysis_start,
            commands::analysis_cancel,
            commands::analysis_jobs,
            commands::review_save_draft,
            commands::review_sign,
            commands::review_amend,
            commands::audit_list,
            commands::audit_verify,
            commands::export_save,
            commands::report_printed,
            quit_guard::request_quit,
            quit_guard::confirm_quit,
            quit_guard::cancel_quit,
        ])
        .setup(|app| {
            let Some(data_dir) = data_directory(app) else {
                fatal("The application data folder could not be determined.");
            };
            let bundled_models = app.path_resolver().resolve_resource("models");
            let handle = app.handle();
            let emit: Emitter = Arc::new(move |event: &str, payload: serde_json::Value| {
                let _ = handle.emit_all(event, payload);
            });
            let state = match AppState::new(data_dir.clone(), bundled_models, emit) {
                Ok(state) => state,
                Err(error) => fatal(&format!(
                    "The local database in {} could not be opened.\n\n{error}",
                    data_dir.display()
                )),
            };
            app.manage(state);

            // Model discovery and validation run in the background; the
            // interface reports "checking" until the result arrives.
            let handle = app.handle();
            std::thread::Builder::new()
                .name("neuroscan-model-load".into())
                .spawn(move || {
                    let state = handle.state::<AppState>();
                    if let Err(error) = state.reload_model(None) {
                        eprintln!("neuroscan: model discovery failed: {error}");
                    }
                })
                .expect("the model loader thread could not start");

            // OS close paths share the title bar's guard.
            quit_guard::guard_window_close(app);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running NeuroScan");
}
