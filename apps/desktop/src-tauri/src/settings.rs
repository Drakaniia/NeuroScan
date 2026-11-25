//! Workstation settings stored in the database.
//!
//! Only operational settings live here. The decision threshold and the
//! low-confidence band deliberately do not: they belong to the model they were
//! validated with and travel in its manifest.

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

use crate::auth::DEFAULT_SESSION_TIMEOUT_MINUTES;
use crate::error::{AppError, AppResult};
use crate::util::{check_max, clean_optional, now_rfc3339};

pub const KEY_FACILITY_NAME: &str = "facility_name";
pub const KEY_DEPARTMENT: &str = "department";
pub const KEY_SESSION_TIMEOUT: &str = "session_timeout_minutes";
pub const KEY_MODEL_DIR: &str = "ai_model_directory";
pub const KEY_AUTO_ANALYZE: &str = "auto_analyze_on_import";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub facility_name: String,
    pub department: Option<String>,
    pub session_timeout_minutes: u32,
    pub auto_analyze_on_import: bool,
    /// Explicit model folder chosen by an administrator, if any.
    pub model_directory: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsInput {
    pub facility_name: String,
    pub department: Option<String>,
    pub session_timeout_minutes: u32,
    pub auto_analyze_on_import: bool,
}

pub fn get_value(conn: &Connection, key: &str) -> AppResult<Option<String>> {
    Ok(conn
        .query_row("SELECT value FROM settings WHERE key = ?1", [key], |row| {
            row.get(0)
        })
        .optional()?)
}

pub fn set_value(
    conn: &Connection,
    key: &str,
    value: &str,
    user_id: Option<&str>,
) -> AppResult<()> {
    conn.execute(
        "INSERT INTO settings (key, value, updated_at, updated_by) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by",
        params![key, value, now_rfc3339(), user_id],
    )?;
    Ok(())
}

pub fn delete_value(conn: &Connection, key: &str) -> AppResult<()> {
    conn.execute("DELETE FROM settings WHERE key = ?1", [key])?;
    Ok(())
}

pub fn load(conn: &Connection) -> AppResult<AppSettings> {
    let facility_name = get_value(conn, KEY_FACILITY_NAME)?.unwrap_or_default();
    let department = get_value(conn, KEY_DEPARTMENT)?;
    let session_timeout_minutes = get_value(conn, KEY_SESSION_TIMEOUT)?
        .and_then(|value| value.parse::<u32>().ok())
        .unwrap_or(DEFAULT_SESSION_TIMEOUT_MINUTES);
    let auto_analyze_on_import = get_value(conn, KEY_AUTO_ANALYZE)?.as_deref() == Some("true");
    let model_directory = get_value(conn, KEY_MODEL_DIR)?;
    Ok(AppSettings {
        facility_name,
        department,
        session_timeout_minutes,
        auto_analyze_on_import,
        model_directory,
    })
}

pub fn validate(input: &SettingsInput) -> AppResult<()> {
    crate::util::clean_required("facilityName", "Facility name", &input.facility_name, 120)?;
    check_max("department", "Department", &input.department, 120)?;
    if !(1..=240).contains(&input.session_timeout_minutes) {
        return Err(AppError::validation(
            "sessionTimeoutMinutes",
            "Automatic lock must be between 1 and 240 minutes.",
        ));
    }
    Ok(())
}

pub fn save(conn: &Connection, input: &SettingsInput, user_id: &str) -> AppResult<AppSettings> {
    validate(input)?;
    set_value(
        conn,
        KEY_FACILITY_NAME,
        input.facility_name.trim(),
        Some(user_id),
    )?;
    match clean_optional(input.department.clone()) {
        Some(department) => set_value(conn, KEY_DEPARTMENT, &department, Some(user_id))?,
        None => delete_value(conn, KEY_DEPARTMENT)?,
    }
    set_value(
        conn,
        KEY_SESSION_TIMEOUT,
        &input.session_timeout_minutes.to_string(),
        Some(user_id),
    )?;
    set_value(
        conn,
        KEY_AUTO_ANALYZE,
        if input.auto_analyze_on_import {
            "true"
        } else {
            "false"
        },
        Some(user_id),
    )?;
    load(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Db;

    #[test]
    fn settings_round_trip_with_defaults() {
        let db = Db::open_in_memory().unwrap();
        db.with(|conn| {
            let defaults = load(conn)?;
            assert_eq!(
                defaults.session_timeout_minutes,
                DEFAULT_SESSION_TIMEOUT_MINUTES
            );
            assert!(!defaults.auto_analyze_on_import);

            let saved = save(
                conn,
                &SettingsInput {
                    facility_name: "  St. Example Hospital ".into(),
                    department: Some("  ".into()),
                    session_timeout_minutes: 30,
                    auto_analyze_on_import: true,
                },
                "user",
            )?;
            assert_eq!(saved.facility_name, "St. Example Hospital");
            assert_eq!(saved.department, None);
            assert_eq!(saved.session_timeout_minutes, 30);
            assert!(saved.auto_analyze_on_import);

            assert!(save(
                conn,
                &SettingsInput {
                    facility_name: "X".into(),
                    department: None,
                    session_timeout_minutes: 0,
                    auto_analyze_on_import: false,
                },
                "user",
            )
            .is_err());
            Ok(())
        })
        .unwrap();
    }
}
