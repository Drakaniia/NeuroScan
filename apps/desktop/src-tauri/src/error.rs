//! The one error type every command returns.
//!
//! Errors cross the IPC boundary as `{ code, message, field? }` so the
//! frontend can branch on a stable `code` (re-prompt for a locked session,
//! highlight a form field, explain an unavailable model) and show `message`
//! verbatim. Messages are written for the person at the workstation, never
//! for a developer; internal details stay in the `Internal`/`Database` text.

use serde::ser::SerializeStruct;
use serde::{Serialize, Serializer};

pub type AppResult<T> = Result<T, AppError>;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    /// Input failed validation. `field` names the offending form field.
    #[error("{message}")]
    Validation {
        field: Option<String>,
        message: String,
    },

    #[error("Please sign in to continue.")]
    Unauthenticated,

    #[error("Your session is locked. Enter your password to continue.")]
    SessionLocked,

    #[error("You must change your password before continuing.")]
    PasswordChangeRequired,

    #[error("Your role does not permit you to {0}.")]
    Forbidden(&'static str),

    #[error("{0} was not found.")]
    NotFound(&'static str),

    /// The request clashes with existing data (duplicate MRN, username, …).
    #[error("{0}")]
    Conflict(String),

    /// The record is in a state that does not allow the action
    /// (a finalized examination, an empty examination, …).
    #[error("{0}")]
    InvalidState(String),

    /// A file could not be accepted (unsupported, unreadable, too large).
    #[error("{0}")]
    UnsupportedFile(String),

    /// AI analysis was requested but no validated model is loaded.
    #[error("AI analysis is unavailable: {0}")]
    ModelUnavailable(String),

    /// The model rejected an input or produced output that failed checks.
    #[error("{0}")]
    Inference(String),

    #[error("Authentication failed: {0}")]
    AuthFailed(String),

    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    #[error("File system error: {0}")]
    Io(#[from] std::io::Error),

    #[error("{0}")]
    Internal(String),
}

impl AppError {
    pub fn validation(field: &str, message: impl Into<String>) -> Self {
        AppError::Validation {
            field: Some(field.to_string()),
            message: message.into(),
        }
    }

    pub fn invalid(message: impl Into<String>) -> Self {
        AppError::Validation {
            field: None,
            message: message.into(),
        }
    }

    pub fn internal(message: impl std::fmt::Display) -> Self {
        AppError::Internal(message.to_string())
    }

    /// Stable identifier the frontend switches on.
    pub fn code(&self) -> &'static str {
        match self {
            AppError::Validation { .. } => "validation",
            AppError::Unauthenticated => "unauthenticated",
            AppError::SessionLocked => "session_locked",
            AppError::PasswordChangeRequired => "password_change_required",
            AppError::Forbidden(_) => "forbidden",
            AppError::NotFound(_) => "not_found",
            AppError::Conflict(_) => "conflict",
            AppError::InvalidState(_) => "invalid_state",
            AppError::UnsupportedFile(_) => "unsupported_file",
            AppError::ModelUnavailable(_) => "model_unavailable",
            AppError::Inference(_) => "inference_failed",
            AppError::AuthFailed(_) => "auth_failed",
            AppError::Database(_) => "database",
            AppError::Io(_) => "io",
            AppError::Internal(_) => "internal",
        }
    }

    fn field(&self) -> Option<&str> {
        match self {
            AppError::Validation { field, .. } => field.as_deref(),
            _ => None,
        }
    }
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut state = serializer.serialize_struct("AppError", 3)?;
        state.serialize_field("code", self.code())?;
        state.serialize_field("message", &self.to_string())?;
        state.serialize_field("field", &self.field())?;
        state.end()
    }
}

impl From<serde_json::Error> for AppError {
    fn from(error: serde_json::Error) -> Self {
        AppError::Internal(format!("Malformed stored data: {error}"))
    }
}

impl<T> From<std::sync::PoisonError<T>> for AppError {
    fn from(_: std::sync::PoisonError<T>) -> Self {
        AppError::Internal("An internal lock was poisoned by an earlier failure.".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_code_message_and_field() {
        let json = serde_json::to_value(AppError::validation("mrn", "MRN is required.")).unwrap();
        assert_eq!(json["code"], "validation");
        assert_eq!(json["message"], "MRN is required.");
        assert_eq!(json["field"], "mrn");

        let json = serde_json::to_value(AppError::NotFound("Patient")).unwrap();
        assert_eq!(json["code"], "not_found");
        assert_eq!(json["message"], "Patient was not found.");
        assert!(json["field"].is_null());
    }
}
