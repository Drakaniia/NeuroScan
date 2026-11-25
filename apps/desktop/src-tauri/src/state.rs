//! Application state shared by every command, plus the session gate.

use std::path::{Path, PathBuf};
use std::sync::Arc;

use serde_json::json;

use crate::ai::discovery::{self, Candidate, DiscoveryInputs, MODEL_DIR_ENV};
use crate::ai::{AiService, ModelState, ModelStatus};
use crate::analysis::{AnalysisQueue, Emitter};
use crate::audit::{self, Actor};
use crate::auth::{Permission, SessionCheck, SessionManager, SessionUser};
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::settings;

pub const AI_STATUS_EVENT: &str = "ai://status";
pub const SESSION_EVENT: &str = "session://changed";

pub struct AppState {
    pub db: Arc<Db>,
    pub data_dir: PathBuf,
    pub sessions: SessionManager,
    pub ai: Arc<AiService>,
    pub queue: AnalysisQueue,
    pub bundled_models: Option<PathBuf>,
    pub emit: Emitter,
}

impl AppState {
    pub fn new(
        data_dir: PathBuf,
        bundled_models: Option<PathBuf>,
        emit: Emitter,
    ) -> AppResult<Self> {
        std::fs::create_dir_all(&data_dir)?;
        std::fs::create_dir_all(data_dir.join("models"))?;
        let db = Arc::new(Db::open(&data_dir.join("neuroscan.db"))?);
        let recovered = db.with(|conn| crate::exams::recover_interrupted(conn))?;
        let timeout = db
            .with(|conn| settings::load(conn))?
            .session_timeout_minutes;
        if recovered > 0 {
            db.with(|conn| {
                audit::record(
                    conn,
                    Actor::System,
                    "analysis_interrupted",
                    None,
                    json!({ "examinations": recovered, "reason": "application closed during analysis" }),
                )
            })?;
        }

        let ai = Arc::new(AiService::default());
        let queue = AnalysisQueue::start(db.clone(), ai.clone(), data_dir.clone(), emit.clone());
        let sessions = SessionManager::default();
        sessions.set_timeout_minutes(timeout);
        Ok(Self {
            db,
            data_dir,
            sessions,
            ai,
            queue,
            bundled_models,
            emit,
        })
    }

    pub fn data_dir(&self) -> &Path {
        &self.data_dir
    }

    fn checked_user(&self, allow_password_change: bool) -> AppResult<SessionUser> {
        let user = match self.sessions.check(true)? {
            SessionCheck::Active(user) => user,
            SessionCheck::TimedOut(user) => {
                let _ = self.db.with(|conn| {
                    audit::record(
                        conn,
                        Actor::User(&user),
                        "session_locked",
                        None,
                        json!({ "reason": "inactivity" }),
                    )
                });
                (self.emit)(SESSION_EVENT, json!({ "locked": true }));
                return Err(AppError::SessionLocked);
            }
        };
        if user.must_change_password && !allow_password_change {
            return Err(AppError::PasswordChangeRequired);
        }
        Ok(user)
    }

    /// The signed-in user, if allowed `permission`. Every command goes through
    /// here (or `require_user`) before touching data.
    pub fn require(&self, permission: Permission) -> AppResult<SessionUser> {
        let user = self.checked_user(false)?;
        if !user.role.allows(permission) {
            return Err(AppError::Forbidden(permission.describe()));
        }
        Ok(user)
    }

    /// Any signed-in user with an unlocked session.
    pub fn require_user(&self) -> AppResult<SessionUser> {
        self.checked_user(false)
    }

    /// Signed in, even if a password change is pending.
    pub fn require_user_for_password_change(&self) -> AppResult<SessionUser> {
        self.checked_user(true)
    }

    pub fn model_candidates(&self) -> AppResult<Vec<Candidate>> {
        let configured = self
            .db
            .with(|conn| settings::get_value(conn, settings::KEY_MODEL_DIR))?;
        Ok(discovery::candidates(DiscoveryInputs {
            configured: configured.as_deref(),
            environment: std::env::var(MODEL_DIR_ENV).ok(),
            app_data_models: self.data_dir.join("models"),
            bundled_models: self.bundled_models.clone(),
            include_development: cfg!(debug_assertions),
        }))
    }

    /// Discover, validate and load the model; record and broadcast the outcome.
    pub fn reload_model(&self, actor: Option<&SessionUser>) -> AppResult<ModelStatus> {
        let candidates = self.model_candidates()?;
        self.ai.mark_loading();
        (self.emit)(AI_STATUS_EVENT, serde_json::to_value(self.ai.status())?);
        let status = self.ai.load(candidates);
        let action = match status.state {
            ModelState::Ready => "model_loaded",
            ModelState::NotInstalled => "model_not_installed",
            _ => "model_load_failed",
        };
        let details = json!({
            "message": status.message,
            "modelId": status.model.as_ref().map(|m| m.id.clone()),
            "modelVersion": status.model.as_ref().map(|m| m.version.clone()),
            "sha256": status.model.as_ref().map(|m| m.sha256.clone()),
            "fixture": status.model.as_ref().map(|m| m.fixture),
            "directory": status.source.as_ref().map(|s| s.directory.clone()),
        });
        self.db.with(|conn| {
            let actor = actor.map(Actor::User).unwrap_or(Actor::System);
            audit::record(conn, actor, action, None, details)
        })?;
        (self.emit)(AI_STATUS_EVENT, serde_json::to_value(&status)?);
        Ok(status)
    }
}
