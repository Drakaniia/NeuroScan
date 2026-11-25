//! The IPC surface: every operation the interface can request.
//!
//! Each command (1) checks the session and the role's permission, (2) runs
//! the operation, and (3) writes the audit entry in the same transaction as
//! the change it describes. Commands are executed on Tauri's thread pool
//! (`async`), never on the UI thread.

use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::api::dialog::blocking::FileDialogBuilder;
use tauri::State;

use crate::ai::ModelStatus;
use crate::analysis::{self, AnalysisRecord, JobProgress};
use crate::audit::{self, Actor, AuditPage, AuditQuery, AuditVerification};
use crate::auth::{
    self, LoginOutcome, NewUserInput, Permission, Role, SessionInfo, UpdateUserInput, UserSummary,
};
use crate::error::{AppError, AppResult};
use crate::exams::{self, ExamInput, ExamPage, ExamQuery, ExamSummary, WorklistStats};
use crate::export::{self, ExportRequest};
use crate::imaging::import::ImportSummary;
use crate::imaging::{self, ImageItem};
use crate::patients::{self, Patient, PatientInput, PatientPage, PatientQuery};
use crate::reviews::{self, Review, ReviewInput};
use crate::settings::{self, AppSettings, SettingsInput};
use crate::state::{AppState, SESSION_EVENT};

// ---------------------------------------------------------------------------
// Bootstrap, setup and session
// ---------------------------------------------------------------------------

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Bootstrap {
    pub setup_required: bool,
    pub session: Option<SessionInfo>,
    pub app_version: String,
    pub facility_name: Option<String>,
}

#[tauri::command(async)]
pub fn app_bootstrap(state: State<'_, AppState>) -> AppResult<Bootstrap> {
    let (users, settings) = state
        .db
        .with(|conn| Ok((auth::user_count(conn)?, settings::load(conn)?)))?;
    let session = match state.sessions.info()? {
        Some((info, timed_out)) => {
            if timed_out {
                state.db.with(|conn| {
                    audit::record(
                        conn,
                        Actor::User(&info.user),
                        "session_locked",
                        None,
                        json!({ "reason": "inactivity" }),
                    )
                })?;
            }
            Some(info)
        }
        None => None,
    };
    Ok(Bootstrap {
        setup_required: users == 0,
        session,
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        facility_name: Some(settings.facility_name).filter(|name| !name.is_empty()),
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetupInput {
    pub facility_name: String,
    pub department: Option<String>,
    pub username: String,
    pub full_name: String,
    pub password: String,
}

/// First run: create the administrator and the facility profile, then sign in.
#[tauri::command(async)]
pub fn setup_initialize(state: State<'_, AppState>, input: SetupInput) -> AppResult<SessionInfo> {
    let user = state.db.transaction(|tx| {
        if auth::user_count(tx)? > 0 {
            return Err(AppError::InvalidState(
                "NeuroScan has already been set up.".into(),
            ));
        }
        settings::save(
            tx,
            &SettingsInput {
                facility_name: input.facility_name.clone(),
                department: input.department.clone(),
                session_timeout_minutes: auth::DEFAULT_SESSION_TIMEOUT_MINUTES,
                auto_analyze_on_import: false,
            },
            "setup",
        )?;
        let summary = auth::create_user(
            tx,
            &NewUserInput {
                username: input.username.clone(),
                full_name: input.full_name.clone(),
                role: Role::Admin,
                password: input.password.clone(),
            },
            false,
        )?;
        let user = auth::session_user(tx, &summary.id)?;
        audit::record(
            tx,
            Actor::User(&user),
            "system_initialized",
            Some(("user", &user.id)),
            json!({ "facility": input.facility_name.trim(), "administrator": user.username }),
        )?;
        Ok(user)
    })?;
    state
        .sessions
        .set_timeout_minutes(auth::DEFAULT_SESSION_TIMEOUT_MINUTES);
    let info = state.sessions.begin(user.clone())?;
    state
        .db
        .with(|conn| audit::record(conn, Actor::User(&user), "login_succeeded", None, json!({})))?;
    Ok(info)
}

#[tauri::command(async)]
pub fn auth_login(
    state: State<'_, AppState>,
    username: String,
    password: String,
) -> AppResult<SessionInfo> {
    let outcome = state.db.with(|conn| {
        let outcome = auth::login(conn, &username, &password)?;
        match &outcome {
            LoginOutcome::Success(user) => {
                audit::record(conn, Actor::User(user), "login_succeeded", None, json!({}))?;
            }
            LoginOutcome::Failed {
                user_id, reason, ..
            } => {
                audit::record(
                    conn,
                    Actor::Attempt {
                        user_id: user_id.as_deref(),
                        username: username.trim(),
                    },
                    "login_failed",
                    None,
                    json!({ "reason": reason }),
                )?;
            }
        }
        Ok(outcome)
    })?;
    match outcome {
        LoginOutcome::Success(user) => {
            // Signing in replaces any session left on the workstation.
            if let Some(previous) = state.sessions.end()? {
                if previous.id != user.id {
                    state.db.with(|conn| {
                        audit::record(
                            conn,
                            Actor::User(&previous),
                            "logout",
                            None,
                            json!({ "reason": "replaced by another sign-in" }),
                        )
                    })?;
                }
            }
            let info = state.sessions.begin(user)?;
            (state.emit)(SESSION_EVENT, json!({ "locked": false }));
            Ok(info)
        }
        LoginOutcome::Failed { message, .. } => Err(AppError::AuthFailed(message)),
    }
}

#[tauri::command(async)]
pub fn auth_logout(state: State<'_, AppState>) -> AppResult<()> {
    if let Some(user) = state.sessions.end()? {
        state
            .db
            .with(|conn| audit::record(conn, Actor::User(&user), "logout", None, json!({})))?;
    }
    Ok(())
}

#[tauri::command(async)]
pub fn auth_lock(state: State<'_, AppState>) -> AppResult<()> {
    if let Some(user) = state.sessions.lock()? {
        state.db.with(|conn| {
            audit::record(
                conn,
                Actor::User(&user),
                "session_locked",
                None,
                json!({ "reason": "user locked the workstation" }),
            )
        })?;
    }
    Ok(())
}

#[tauri::command(async)]
pub fn auth_unlock(state: State<'_, AppState>, password: String) -> AppResult<SessionInfo> {
    let owner = state.sessions.owner()?.ok_or(AppError::Unauthenticated)?;
    let outcome = state
        .db
        .with(|conn| auth::login(conn, &owner.username, &password))?;
    match outcome {
        LoginOutcome::Success(user) => {
            state.sessions.refresh_user(user.clone())?;
            let info = state.sessions.unlock()?;
            state.db.with(|conn| {
                audit::record(
                    conn,
                    Actor::User(&user),
                    "session_unlocked",
                    None,
                    json!({}),
                )
            })?;
            Ok(info)
        }
        LoginOutcome::Failed {
            reason, message, ..
        } => {
            state.db.with(|conn| {
                audit::record(
                    conn,
                    Actor::User(&owner),
                    "unlock_failed",
                    None,
                    json!({ "reason": reason }),
                )
            })?;
            if matches!(
                reason,
                "lockout_triggered" | "account_locked" | "inactive_account"
            ) {
                // The account is now locked: release the workstation for others.
                state.sessions.end()?;
                state.db.with(|conn| {
                    audit::record(
                        conn,
                        Actor::User(&owner),
                        "logout",
                        None,
                        json!({ "reason": reason }),
                    )
                })?;
            }
            Err(AppError::AuthFailed(message))
        }
    }
}

/// Activity heartbeat from the interface (pointer/keyboard input).
#[tauri::command(async)]
pub fn auth_heartbeat(state: State<'_, AppState>) -> AppResult<SessionInfo> {
    state.require_user_for_password_change()?;
    state
        .sessions
        .info()?
        .map(|(info, _)| info)
        .ok_or(AppError::Unauthenticated)
}

#[tauri::command(async)]
pub fn auth_change_password(
    state: State<'_, AppState>,
    current_password: String,
    new_password: String,
) -> AppResult<SessionInfo> {
    let user = state.require_user_for_password_change()?;
    let refreshed = state.db.transaction(|tx| {
        if !auth::verify_user_password(tx, &user.id, &current_password)? {
            return Err(AppError::validation(
                "currentPassword",
                "The current password is incorrect.",
            ));
        }
        auth::set_password(tx, &user.id, &new_password, false)?;
        audit::record(
            tx,
            Actor::User(&user),
            "password_changed",
            Some(("user", &user.id)),
            json!({}),
        )?;
        auth::session_user(tx, &user.id)
    })?;
    state.sessions.refresh_user(refreshed)?;
    state
        .sessions
        .info()?
        .map(|(info, _)| info)
        .ok_or(AppError::Unauthenticated)
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

#[tauri::command(async)]
pub fn users_list(state: State<'_, AppState>) -> AppResult<Vec<UserSummary>> {
    state.require(Permission::UserManage)?;
    state.db.with(|conn| auth::list_users(conn))
}

#[tauri::command(async)]
pub fn users_create(state: State<'_, AppState>, input: NewUserInput) -> AppResult<UserSummary> {
    let actor = state.require(Permission::UserManage)?;
    state.db.transaction(|tx| {
        // Accounts created by an administrator start with a temporary password.
        let created = auth::create_user(tx, &input, true)?;
        audit::record(
            tx,
            Actor::User(&actor),
            "user_created",
            Some(("user", &created.id)),
            json!({ "username": created.username, "role": created.role }),
        )?;
        Ok(created)
    })
}

#[tauri::command(async)]
pub fn users_update(
    state: State<'_, AppState>,
    id: String,
    input: UpdateUserInput,
) -> AppResult<UserSummary> {
    let actor = state.require(Permission::UserManage)?;
    let updated = state.db.transaction(|tx| {
        let before = auth::get_user(tx, &id)?;
        let updated = auth::update_user(tx, &actor.id, &id, &input)?;
        audit::record(
            tx,
            Actor::User(&actor),
            "user_updated",
            Some(("user", &id)),
            json!({
                "username": updated.username,
                "role": { "from": before.role, "to": updated.role },
                "active": { "from": before.is_active, "to": updated.is_active },
            }),
        )?;
        Ok(updated)
    })?;
    if let Ok(user) = state.db.with(|conn| auth::session_user(conn, &id)) {
        state.sessions.refresh_user(user)?;
    }
    Ok(updated)
}

#[tauri::command(async)]
pub fn users_reset_password(
    state: State<'_, AppState>,
    id: String,
    temporary_password: String,
) -> AppResult<()> {
    let actor = state.require(Permission::UserManage)?;
    state.db.transaction(|tx| {
        auth::set_password(tx, &id, &temporary_password, true)?;
        audit::record(
            tx,
            Actor::User(&actor),
            "password_reset",
            Some(("user", &id)),
            json!({}),
        )
    })
}

// ---------------------------------------------------------------------------
// Settings and system
// ---------------------------------------------------------------------------

#[tauri::command(async)]
pub fn settings_get(state: State<'_, AppState>) -> AppResult<AppSettings> {
    state.require_user()?;
    state.db.with(|conn| settings::load(conn))
}

#[tauri::command(async)]
pub fn settings_update(state: State<'_, AppState>, input: SettingsInput) -> AppResult<AppSettings> {
    let actor = state.require(Permission::SettingsManage)?;
    let saved = state.db.transaction(|tx| {
        let before = settings::load(tx)?;
        let saved = settings::save(tx, &input, &actor.id)?;
        audit::record(
            tx,
            Actor::User(&actor),
            "settings_changed",
            None,
            json!({
                "facilityName": saved.facility_name,
                "department": saved.department,
                "sessionTimeoutMinutes": { "from": before.session_timeout_minutes, "to": saved.session_timeout_minutes },
                "autoAnalyzeOnImport": { "from": before.auto_analyze_on_import, "to": saved.auto_analyze_on_import },
            }),
        )?;
        Ok(saved)
    })?;
    state
        .sessions
        .set_timeout_minutes(saved.session_timeout_minutes);
    Ok(saved)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemInfo {
    pub app_version: String,
    pub data_directory: String,
    pub database_bytes: u64,
    pub image_storage_bytes: u64,
    pub patients: i64,
    pub examinations: i64,
    pub images: i64,
    pub analyses: i64,
    pub users: i64,
    pub audit_entries: i64,
}

#[tauri::command(async)]
pub fn system_info(state: State<'_, AppState>) -> AppResult<SystemInfo> {
    state.require(Permission::SettingsManage)?;
    let count = |table: &str| -> AppResult<i64> {
        state.db.with(|conn| {
            Ok(
                conn.query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |row| {
                    row.get(0)
                })?,
            )
        })
    };
    let data_dir = state.data_dir();
    let database_bytes = ["neuroscan.db", "neuroscan.db-wal"]
        .iter()
        .filter_map(|name| std::fs::metadata(data_dir.join(name)).ok())
        .map(|meta| meta.len())
        .sum();
    Ok(SystemInfo {
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        data_directory: data_dir.display().to_string(),
        database_bytes,
        image_storage_bytes: imaging::storage_bytes(data_dir),
        patients: count("patients")?,
        examinations: count("examinations")?,
        images: count("images")?,
        analyses: count("analyses")?,
        users: count("users")?,
        audit_entries: count("audit_log")?,
    })
}

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------

#[tauri::command(async)]
pub fn patients_list(state: State<'_, AppState>, query: PatientQuery) -> AppResult<PatientPage> {
    state.require(Permission::PatientRead)?;
    state.db.with(|conn| patients::list(conn, &query))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PatientDetail {
    pub patient: Patient,
    pub exams: Vec<ExamSummary>,
}

#[tauri::command(async)]
pub fn patients_get(state: State<'_, AppState>, id: String) -> AppResult<PatientDetail> {
    let user = state.require(Permission::PatientRead)?;
    state.db.with(|conn| {
        let patient = patients::get(conn, &id)?;
        let exams = exams::list(
            conn,
            &ExamQuery {
                patient_id: Some(id.clone()),
                limit: Some(500),
                ..Default::default()
            },
        )?
        .items;
        audit::record(
            conn,
            Actor::User(&user),
            "patient_record_opened",
            Some(("patient", &id)),
            json!({ "mrn": patient.mrn }),
        )?;
        Ok(PatientDetail { patient, exams })
    })
}

#[tauri::command(async)]
pub fn patients_create(state: State<'_, AppState>, input: PatientInput) -> AppResult<Patient> {
    let user = state.require(Permission::PatientWrite)?;
    state.db.transaction(|tx| {
        let patient = patients::create(tx, &input, &user.id)?;
        audit::record(
            tx,
            Actor::User(&user),
            "patient_registered",
            Some(("patient", &patient.id)),
            json!({ "mrn": patient.mrn }),
        )?;
        Ok(patient)
    })
}

#[tauri::command(async)]
pub fn patients_update(
    state: State<'_, AppState>,
    id: String,
    input: PatientInput,
) -> AppResult<Patient> {
    let user = state.require(Permission::PatientWrite)?;
    state.db.transaction(|tx| {
        let (before, after) = patients::update(tx, &id, &input)?;
        let changed = patients::changed_fields(&before, &after);
        audit::record(
            tx,
            Actor::User(&user),
            "patient_updated",
            Some(("patient", &id)),
            json!({ "mrn": after.mrn, "previousMrn": (before.mrn != after.mrn).then_some(before.mrn.clone()), "fields": changed }),
        )?;
        Ok(after)
    })
}

// ---------------------------------------------------------------------------
// Examinations
// ---------------------------------------------------------------------------

#[tauri::command(async)]
pub fn exams_list(state: State<'_, AppState>, query: ExamQuery) -> AppResult<ExamPage> {
    state.require(Permission::ExamRead)?;
    state.db.with(|conn| exams::list(conn, &query))
}

#[tauri::command(async)]
pub fn exams_stats(state: State<'_, AppState>) -> AppResult<WorklistStats> {
    state.require(Permission::ExamRead)?;
    state.db.with(|conn| exams::worklist_stats(conn))
}

#[tauri::command(async)]
pub fn exams_create(
    state: State<'_, AppState>,
    patient_id: String,
    input: ExamInput,
) -> AppResult<ExamSummary> {
    let user = state.require(Permission::ExamWrite)?;
    state.db.transaction(|tx| {
        let exam = exams::create(tx, &patient_id, &input, &user.id)?;
        audit::record(
            tx,
            Actor::User(&user),
            "examination_created",
            Some(("examination", &exam.id)),
            json!({ "accession": exam.accession_number, "patientId": patient_id, "description": exam.description }),
        )?;
        Ok(exam)
    })
}

#[tauri::command(async)]
pub fn exams_update(
    state: State<'_, AppState>,
    id: String,
    input: ExamInput,
) -> AppResult<ExamSummary> {
    let user = state.require(Permission::ExamWrite)?;
    state.db.transaction(|tx| {
        let exam = exams::update(tx, &id, &input)?;
        audit::record(
            tx,
            Actor::User(&user),
            "examination_updated",
            Some(("examination", &id)),
            json!({ "accession": exam.accession_number }),
        )?;
        Ok(exam)
    })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExamDetail {
    pub exam: ExamSummary,
    pub patient: Patient,
    pub images: Vec<ImageItem>,
    pub review: Option<Review>,
    pub review_history: Vec<Review>,
    pub active_job: Option<JobProgress>,
}

#[tauri::command(async)]
pub fn exams_get(state: State<'_, AppState>, id: String) -> AppResult<ExamDetail> {
    state.require(Permission::ExamRead)?;
    let detail = state.db.with(|conn| {
        let exam = exams::get(conn, &id)?;
        let patient = patients::get(conn, &exam.patient.id)?;
        let images = imaging::list_for_exam(conn, state.data_dir(), &id)?;
        let review_history = reviews::history(conn, &id)?;
        Ok(ExamDetail {
            exam,
            patient,
            images,
            review: review_history.first().cloned(),
            review_history,
            active_job: None,
        })
    })?;
    Ok(ExamDetail {
        active_job: state.queue.active_for_exam(&id),
        ..detail
    })
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

fn run_import(state: &AppState, exam_id: &str, paths: Vec<PathBuf>) -> AppResult<ImportSummary> {
    let user = state.require(Permission::ExamWrite)?;
    let summary = imaging::import::import(&state.db, state.data_dir(), exam_id, &paths, &user)?;
    let auto = state
        .db
        .with(|conn| settings::load(conn))?
        .auto_analyze_on_import;
    if auto
        && !summary.image_ids.is_empty()
        && state.ai.is_ready()
        && user.role.allows(Permission::AnalysisRun)
    {
        let _ = state
            .queue
            .enqueue(exam_id, summary.image_ids.clone(), &user);
    }
    Ok(summary)
}

#[tauri::command(async)]
pub fn images_import(
    state: State<'_, AppState>,
    exam_id: String,
    paths: Vec<String>,
) -> AppResult<ImportSummary> {
    run_import(
        &state,
        &exam_id,
        paths.into_iter().map(PathBuf::from).collect(),
    )
}

/// Open the native picker (files or a folder) and import the selection.
#[tauri::command(async)]
pub fn images_import_dialog(
    state: State<'_, AppState>,
    exam_id: String,
    folder: bool,
) -> AppResult<Option<ImportSummary>> {
    state.require(Permission::ExamWrite)?;
    let paths = if folder {
        FileDialogBuilder::new()
            .set_title("Import a folder of images")
            .pick_folder()
            .map(|path| vec![path])
    } else {
        FileDialogBuilder::new()
            .set_title("Import images")
            .add_filter(
                "Medical images (DICOM, PNG, JPEG)",
                &["dcm", "dicom", "ima", "png", "jpg", "jpeg"],
            )
            .add_filter("All files", &["*"])
            .pick_files()
    };
    match paths {
        Some(paths) if !paths.is_empty() => run_import(&state, &exam_id, paths).map(Some),
        _ => Ok(None),
    }
}

#[tauri::command(async)]
pub fn images_remove(state: State<'_, AppState>, image_id: String) -> AppResult<()> {
    let user = state.require(Permission::ExamWrite)?;
    let location = state
        .db
        .with(|conn| imaging::locate(conn, state.data_dir(), &image_id))?;
    if state.queue.active_for_exam(&location.exam_id).is_some() {
        return Err(AppError::InvalidState(
            "Images cannot be removed while the examination is being analyzed.".into(),
        ));
    }
    state.db.transaction(|tx| {
        let removed = imaging::remove(tx, state.data_dir(), &image_id)?;
        audit::record(
            tx,
            Actor::User(&user),
            "image_removed",
            Some(("examination", &removed.exam_id)),
            json!({
                "imageId": image_id,
                "file": removed.original_name,
                "sha256": removed.sha256,
                "frame": removed.frame_index,
                "analysesRemoved": removed.analyses_removed,
            }),
        )
    })
}

#[tauri::command(async)]
pub fn images_analysis_history(
    state: State<'_, AppState>,
    image_id: String,
) -> AppResult<Vec<AnalysisRecord>> {
    state.require(Permission::ExamRead)?;
    state
        .db
        .with(|conn| analysis::history_for_image(conn, &image_id))
}

// ---------------------------------------------------------------------------
// AI model and analysis
// ---------------------------------------------------------------------------

#[tauri::command(async)]
pub fn ai_status(state: State<'_, AppState>) -> AppResult<ModelStatus> {
    state.require_user()?;
    Ok(state.ai.status())
}

#[tauri::command(async)]
pub fn ai_reload(state: State<'_, AppState>) -> AppResult<ModelStatus> {
    let user = state.require(Permission::ModelManage)?;
    if state.queue.is_busy() {
        return Err(AppError::InvalidState(
            "Wait for the running analysis to finish before reloading the model.".into(),
        ));
    }
    state.reload_model(Some(&user))
}

fn set_model_directory(
    state: &AppState,
    user: &auth::SessionUser,
    directory: Option<String>,
) -> AppResult<ModelStatus> {
    if state.queue.is_busy() {
        return Err(AppError::InvalidState(
            "Wait for the running analysis to finish before changing the model.".into(),
        ));
    }
    state.db.transaction(|tx| {
        match directory
            .as_deref()
            .map(str::trim)
            .filter(|path| !path.is_empty())
        {
            Some(path) => settings::set_value(tx, settings::KEY_MODEL_DIR, path, Some(&user.id))?,
            None => settings::delete_value(tx, settings::KEY_MODEL_DIR)?,
        }
        audit::record(
            tx,
            Actor::User(user),
            "model_directory_changed",
            None,
            json!({ "directory": directory }),
        )
    })?;
    state.reload_model(Some(user))
}

#[tauri::command(async)]
pub fn ai_set_model_directory(
    state: State<'_, AppState>,
    directory: Option<String>,
) -> AppResult<ModelStatus> {
    let user = state.require(Permission::ModelManage)?;
    set_model_directory(&state, &user, directory)
}

#[tauri::command(async)]
pub fn ai_choose_model_directory(state: State<'_, AppState>) -> AppResult<Option<ModelStatus>> {
    let user = state.require(Permission::ModelManage)?;
    let Some(path) = FileDialogBuilder::new()
        .set_title("Choose the folder containing run-config.json and the ONNX model")
        .pick_folder()
    else {
        return Ok(None);
    };
    set_model_directory(&state, &user, Some(path.display().to_string())).map(Some)
}

#[tauri::command(async)]
pub fn analysis_start(
    state: State<'_, AppState>,
    exam_id: String,
    image_ids: Option<Vec<String>>,
) -> AppResult<JobProgress> {
    let user = state.require(Permission::AnalysisRun)?;
    if !state.ai.is_ready() {
        let status = state.ai.status();
        return Err(AppError::ModelUnavailable(status.message));
    }
    let ids = state.db.with(|conn| {
        exams::ensure_editable_id(conn, &exam_id)?;
        let all = imaging::exam_image_ids(conn, &exam_id)?;
        Ok(match image_ids {
            Some(requested) => requested
                .into_iter()
                .filter(|id| all.contains(id))
                .collect(),
            None => all,
        })
    })?;
    state.queue.enqueue(&exam_id, ids, &user)
}

#[tauri::command(async)]
pub fn analysis_cancel(state: State<'_, AppState>, job_id: String) -> AppResult<JobProgress> {
    state.require(Permission::AnalysisRun)?;
    state.queue.cancel(&job_id)
}

#[tauri::command(async)]
pub fn analysis_jobs(state: State<'_, AppState>) -> AppResult<Vec<JobProgress>> {
    state.require(Permission::ExamRead)?;
    Ok(state.queue.jobs())
}

// ---------------------------------------------------------------------------
// Clinician review
// ---------------------------------------------------------------------------

#[tauri::command(async)]
pub fn review_save_draft(
    state: State<'_, AppState>,
    exam_id: String,
    input: ReviewInput,
) -> AppResult<Review> {
    let user = state.require(Permission::ReviewSign)?;
    state.db.transaction(|tx| {
        let review = reviews::save_draft(tx, &exam_id, &input, &user)?;
        audit::record(
            tx,
            Actor::User(&user),
            "review_draft_saved",
            Some(("examination", &exam_id)),
            json!({ "version": review.version }),
        )?;
        Ok(review)
    })
}

#[tauri::command(async)]
pub fn review_sign(
    state: State<'_, AppState>,
    exam_id: String,
    input: ReviewInput,
    password: String,
) -> AppResult<Review> {
    let user = state.require(Permission::ReviewSign)?;
    if state.queue.active_for_exam(&exam_id).is_some() {
        return Err(AppError::InvalidState(
            "AI analysis is still running for this examination. Wait for it to finish before signing.".into(),
        ));
    }
    // Signing is re-authenticated, under the same lockout rules as sign-in.
    match state
        .db
        .with(|conn| auth::login(conn, &user.username, &password))?
    {
        LoginOutcome::Success(_) => {}
        LoginOutcome::Failed {
            reason, message, ..
        } => {
            state.db.with(|conn| {
                audit::record(
                    conn,
                    Actor::User(&user),
                    "signature_failed",
                    Some(("examination", &exam_id)),
                    json!({ "reason": reason }),
                )
            })?;
            return Err(AppError::validation("password", message));
        }
    }
    state.db.transaction(|tx| {
        let review = reviews::sign(tx, &exam_id, &input, &user)?;
        audit::record(
            tx,
            Actor::User(&user),
            "report_signed",
            Some(("examination", &exam_id)),
            json!({
                "version": review.version,
                "impression": review.impression,
                "aiAgreement": review.ai_agreement,
            }),
        )?;
        Ok(review)
    })
}

#[tauri::command(async)]
pub fn review_amend(
    state: State<'_, AppState>,
    exam_id: String,
    reason: String,
) -> AppResult<Review> {
    let user = state.require(Permission::ReviewSign)?;
    state.db.transaction(|tx| {
        let review = reviews::amend(tx, &exam_id, &reason, &user)?;
        audit::record(
            tx,
            Actor::User(&user),
            "report_reopened",
            Some(("examination", &exam_id)),
            json!({ "version": review.version, "reason": reason.trim() }),
        )?;
        Ok(review)
    })
}

// ---------------------------------------------------------------------------
// Audit and export
// ---------------------------------------------------------------------------

#[tauri::command(async)]
pub fn audit_list(state: State<'_, AppState>, query: AuditQuery) -> AppResult<AuditPage> {
    state.require(Permission::AuditRead)?;
    state.db.with(|conn| audit::list(conn, &query))
}

#[tauri::command(async)]
pub fn audit_verify(state: State<'_, AppState>) -> AppResult<AuditVerification> {
    let user = state.require(Permission::AuditRead)?;
    state.db.with(|conn| {
        let result = audit::verify(conn)?;
        audit::record(
            conn,
            Actor::User(&user),
            "audit_verified",
            None,
            json!({ "valid": result.valid, "checked": result.checked, "firstInvalidSeq": result.first_invalid_seq }),
        )?;
        Ok(result)
    })
}

/// Save an export through a native dialog. Returns the saved path, or `None`
/// when the user cancelled.
#[tauri::command(async)]
pub fn export_save(
    state: State<'_, AppState>,
    request: ExportRequest,
) -> AppResult<Option<String>> {
    let user = state.require(Permission::ReportExport)?;
    let bytes = request.bytes()?;
    let Some(path) = export::choose_destination(request.kind, &request.file_name) else {
        return Ok(None);
    };
    export::write_atomically(&path, &bytes)?;
    let entity = request
        .exam_id
        .as_deref()
        .map(|id| ("examination", id))
        .or_else(|| request.patient_id.as_deref().map(|id| ("patient", id)));
    state.db.with(|conn| {
        audit::record(
            conn,
            Actor::User(&user),
            "export_saved",
            entity,
            json!({
                "kind": format!("{:?}", request.kind).to_lowercase(),
                "description": request.description,
                "file": path.file_name().map(|name| name.to_string_lossy().to_string()),
                "bytes": bytes.len(),
            }),
        )
    })?;
    Ok(Some(path.display().to_string()))
}

/// Record that a report was sent to the print dialog (printing itself is
/// handled by the webview).
#[tauri::command(async)]
pub fn report_printed(state: State<'_, AppState>, exam_id: String) -> AppResult<()> {
    let user = state.require(Permission::ReportExport)?;
    state.db.with(|conn| {
        audit::record(
            conn,
            Actor::User(&user),
            "report_printed",
            Some(("examination", &exam_id)),
            json!({}),
        )
    })
}
