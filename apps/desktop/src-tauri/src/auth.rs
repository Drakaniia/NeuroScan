//! Accounts, roles, password handling and the workstation session.
//!
//! - Passwords are stored as Argon2id PHC strings, never in any other form.
//! - Five consecutive failed sign-ins lock an account for five minutes.
//! - One session is active at a time (a shared clinical workstation). It locks
//!   after the configured period of inactivity; unlocking requires the same
//!   user's password, and every command re-checks the session server-side, so
//!   the role checks in the UI are a convenience, never the enforcement.

use std::sync::Mutex;
use std::time::{Duration, Instant};

use argon2::password_hash::phc::PasswordHash;
use argon2::password_hash::{PasswordHasher, PasswordVerifier};
use argon2::Argon2;
use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};
use crate::util::{new_id, now_rfc3339, parse_rfc3339, to_rfc3339};

pub const MAX_FAILED_ATTEMPTS: i64 = 5;
pub const LOCKOUT_MINUTES: i64 = 5;
pub const MIN_PASSWORD_LENGTH: usize = 10;
pub const DEFAULT_SESSION_TIMEOUT_MINUTES: u32 = 15;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Role {
    Admin,
    Radiologist,
    Technologist,
    Viewer,
}

impl Role {
    pub fn as_str(self) -> &'static str {
        match self {
            Role::Admin => "admin",
            Role::Radiologist => "radiologist",
            Role::Technologist => "technologist",
            Role::Viewer => "viewer",
        }
    }

    pub fn parse(value: &str) -> AppResult<Role> {
        match value {
            "admin" => Ok(Role::Admin),
            "radiologist" => Ok(Role::Radiologist),
            "technologist" => Ok(Role::Technologist),
            "viewer" => Ok(Role::Viewer),
            other => Err(AppError::validation(
                "role",
                format!("Unknown role '{other}'."),
            )),
        }
    }

    /// The access matrix. Kept as data so it can be shown in the UI and tested.
    pub fn permissions(self) -> &'static [Permission] {
        use Permission::*;
        match self {
            Role::Admin => &[
                PatientRead,
                PatientWrite,
                ExamRead,
                ExamWrite,
                AnalysisRun,
                ReviewSign,
                ReportExport,
                AuditRead,
                UserManage,
                SettingsManage,
                ModelManage,
            ],
            Role::Radiologist => &[
                PatientRead,
                PatientWrite,
                ExamRead,
                ExamWrite,
                AnalysisRun,
                ReviewSign,
                ReportExport,
            ],
            Role::Technologist => &[
                PatientRead,
                PatientWrite,
                ExamRead,
                ExamWrite,
                AnalysisRun,
                ReportExport,
            ],
            Role::Viewer => &[PatientRead, ExamRead, ReportExport],
        }
    }

    pub fn allows(self, permission: Permission) -> bool {
        self.permissions().contains(&permission)
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Permission {
    PatientRead,
    PatientWrite,
    ExamRead,
    ExamWrite,
    AnalysisRun,
    ReviewSign,
    ReportExport,
    AuditRead,
    UserManage,
    SettingsManage,
    ModelManage,
}

impl Permission {
    /// Completes "Your role does not permit you to …".
    pub fn describe(self) -> &'static str {
        match self {
            Permission::PatientRead => "view patient records",
            Permission::PatientWrite => "register or edit patients",
            Permission::ExamRead => "view examinations",
            Permission::ExamWrite => "create examinations or import images",
            Permission::AnalysisRun => "run AI analysis",
            Permission::ReviewSign => "record or sign clinical reviews",
            Permission::ReportExport => "export reports",
            Permission::AuditRead => "view the audit log",
            Permission::UserManage => "manage user accounts",
            Permission::SettingsManage => "change system settings",
            Permission::ModelManage => "configure the AI model",
        }
    }
}

/// The signed-in user as every command sees it.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionUser {
    pub id: String,
    pub username: String,
    pub full_name: String,
    pub role: Role,
    pub must_change_password: bool,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionInfo {
    pub user: SessionUser,
    pub permissions: Vec<Permission>,
    pub locked: bool,
    pub started_at: String,
    pub timeout_minutes: u32,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserSummary {
    pub id: String,
    pub username: String,
    pub full_name: String,
    pub role: Role,
    pub is_active: bool,
    pub must_change_password: bool,
    pub locked_until: Option<String>,
    pub last_login_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NewUserInput {
    pub username: String,
    pub full_name: String,
    pub role: Role,
    pub password: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserInput {
    pub full_name: String,
    pub role: Role,
    pub is_active: bool,
}

struct UserRecord {
    summary: UserSummary,
    password_hash: String,
    failed_attempts: i64,
}

impl UserRecord {
    fn session_user(&self) -> SessionUser {
        SessionUser {
            id: self.summary.id.clone(),
            username: self.summary.username.clone(),
            full_name: self.summary.full_name.clone(),
            role: self.summary.role,
            must_change_password: self.summary.must_change_password,
        }
    }
}

const USER_COLUMNS: &str = "id, username, full_name, role, is_active, must_change_password, locked_until, last_login_at, created_at, password_hash, failed_attempts";

fn read_user(row: &Row<'_>) -> rusqlite::Result<UserRecord> {
    let role: String = row.get(3)?;
    Ok(UserRecord {
        summary: UserSummary {
            id: row.get(0)?,
            username: row.get(1)?,
            full_name: row.get(2)?,
            role: Role::parse(&role).unwrap_or(Role::Viewer),
            is_active: row.get::<_, i64>(4)? != 0,
            must_change_password: row.get::<_, i64>(5)? != 0,
            locked_until: row.get(6)?,
            last_login_at: row.get(7)?,
            created_at: row.get(8)?,
        },
        password_hash: row.get(9)?,
        failed_attempts: row.get(10)?,
    })
}

// ---------------------------------------------------------------------------
// Passwords
// ---------------------------------------------------------------------------

pub fn hash_password(password: &str) -> AppResult<String> {
    Argon2::default()
        .hash_password(password.as_bytes())
        .map(|hash| hash.to_string())
        .map_err(|error| AppError::internal(format!("Could not hash password: {error}")))
}

pub fn verify_password(password: &str, stored: &str) -> bool {
    match PasswordHash::new(stored) {
        Ok(parsed) => Argon2::default()
            .verify_password(password.as_bytes(), &parsed)
            .is_ok(),
        Err(_) => false,
    }
}

/// Spend the same time on an unknown username as on a wrong password, so the
/// response time does not reveal which accounts exist.
fn equalize_timing(password: &str) {
    static DECOY: std::sync::OnceLock<String> = std::sync::OnceLock::new();
    let decoy = DECOY.get_or_init(|| hash_password("neuroscan-timing-decoy-1").unwrap_or_default());
    let _ = verify_password(password, decoy);
}

pub fn validate_username(username: &str) -> AppResult<String> {
    let trimmed = username.trim();
    let valid_chars = trimmed
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '.' | '_' | '-'));
    if trimmed.len() < 3 || trimmed.len() > 32 || !valid_chars {
        return Err(AppError::validation(
            "username",
            "Username must be 3–32 characters using letters, digits, '.', '_' or '-'.",
        ));
    }
    Ok(trimmed.to_string())
}

pub fn validate_password(username: &str, password: &str) -> AppResult<()> {
    let length = password.chars().count();
    if length < MIN_PASSWORD_LENGTH {
        return Err(AppError::validation(
            "password",
            format!("Password must be at least {MIN_PASSWORD_LENGTH} characters."),
        ));
    }
    if length > 128 {
        return Err(AppError::validation(
            "password",
            "Password must be 128 characters or fewer.",
        ));
    }
    let has_letter = password.chars().any(char::is_alphabetic);
    let has_digit = password.chars().any(|ch| ch.is_ascii_digit());
    if !has_letter || !has_digit {
        return Err(AppError::validation(
            "password",
            "Password must contain at least one letter and one digit.",
        ));
    }
    if password
        .to_lowercase()
        .contains(&username.trim().to_lowercase())
        && !username.is_empty()
    {
        return Err(AppError::validation(
            "password",
            "Password must not contain the username.",
        ));
    }
    Ok(())
}

fn validate_full_name(full_name: &str) -> AppResult<String> {
    crate::util::clean_required("fullName", "Full name", full_name, 120)
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

pub fn user_count(conn: &Connection) -> AppResult<i64> {
    Ok(conn.query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))?)
}

pub fn create_user(
    conn: &Connection,
    input: &NewUserInput,
    must_change_password: bool,
) -> AppResult<UserSummary> {
    let username = validate_username(&input.username)?;
    let full_name = validate_full_name(&input.full_name)?;
    validate_password(&username, &input.password)?;

    let exists: Option<String> = conn
        .query_row(
            "SELECT id FROM users WHERE username = ?1",
            [&username],
            |row| row.get(0),
        )
        .optional()?;
    if exists.is_some() {
        return Err(AppError::Conflict(format!(
            "The username '{username}' is already in use."
        )));
    }

    let id = new_id();
    let now = now_rfc3339();
    let hash = hash_password(&input.password)?;
    conn.execute(
        "INSERT INTO users (id, username, full_name, role, password_hash, is_active, must_change_password, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?7, ?7)",
        params![
            id,
            username,
            full_name,
            input.role.as_str(),
            hash,
            must_change_password as i64,
            now
        ],
    )?;
    get_user(conn, &id)
}

fn find_user(conn: &Connection, id: &str) -> AppResult<UserRecord> {
    conn.query_row(
        &format!("SELECT {USER_COLUMNS} FROM users WHERE id = ?1"),
        [id],
        read_user,
    )
    .optional()?
    .ok_or(AppError::NotFound("User"))
}

pub fn get_user(conn: &Connection, id: &str) -> AppResult<UserSummary> {
    Ok(find_user(conn, id)?.summary)
}

pub fn session_user(conn: &Connection, id: &str) -> AppResult<SessionUser> {
    Ok(find_user(conn, id)?.session_user())
}

pub fn list_users(conn: &Connection) -> AppResult<Vec<UserSummary>> {
    let mut statement = conn.prepare(&format!(
        "SELECT {USER_COLUMNS} FROM users ORDER BY is_active DESC, full_name COLLATE NOCASE"
    ))?;
    let users = statement
        .query_map([], read_user)?
        .map(|row| row.map(|record| record.summary))
        .collect::<Result<Vec<_>, _>>()?;
    Ok(users)
}

fn active_admin_count(conn: &Connection) -> AppResult<i64> {
    Ok(conn.query_row(
        "SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = 1",
        [],
        |row| row.get(0),
    )?)
}

pub fn update_user(
    conn: &Connection,
    actor_id: &str,
    id: &str,
    input: &UpdateUserInput,
) -> AppResult<UserSummary> {
    let full_name = validate_full_name(&input.full_name)?;
    let existing = find_user(conn, id)?;

    if id == actor_id && !input.is_active {
        return Err(AppError::InvalidState(
            "You cannot deactivate your own account.".into(),
        ));
    }
    let loses_admin = existing.summary.role == Role::Admin
        && existing.summary.is_active
        && (input.role != Role::Admin || !input.is_active);
    if loses_admin && active_admin_count(conn)? <= 1 {
        return Err(AppError::InvalidState(
            "At least one active administrator account is required.".into(),
        ));
    }

    conn.execute(
        "UPDATE users SET full_name = ?2, role = ?3, is_active = ?4, updated_at = ?5 WHERE id = ?1",
        params![
            id,
            full_name,
            input.role.as_str(),
            input.is_active as i64,
            now_rfc3339()
        ],
    )?;
    get_user(conn, id)
}

pub fn set_password(
    conn: &Connection,
    id: &str,
    new_password: &str,
    must_change_password: bool,
) -> AppResult<()> {
    let user = find_user(conn, id)?;
    validate_password(&user.summary.username, new_password)?;
    if verify_password(new_password, &user.password_hash) {
        return Err(AppError::validation(
            "newPassword",
            "The new password must be different from the current one.",
        ));
    }
    conn.execute(
        "UPDATE users SET password_hash = ?2, must_change_password = ?3, failed_attempts = 0, locked_until = NULL, updated_at = ?4 WHERE id = ?1",
        params![
            id,
            hash_password(new_password)?,
            must_change_password as i64,
            now_rfc3339()
        ],
    )?;
    Ok(())
}

/// Re-authentication for unlocking and for signing a report.
pub fn verify_user_password(conn: &Connection, id: &str, password: &str) -> AppResult<bool> {
    let user = find_user(conn, id)?;
    Ok(user.summary.is_active && verify_password(password, &user.password_hash))
}

/// Outcome of a sign-in attempt, for the audit trail.
pub enum LoginOutcome {
    Success(SessionUser),
    Failed {
        user_id: Option<String>,
        reason: &'static str,
        message: String,
    },
}

pub fn login(conn: &Connection, username: &str, password: &str) -> AppResult<LoginOutcome> {
    const GENERIC: &str = "The username or password is incorrect.";
    let record = conn
        .query_row(
            &format!("SELECT {USER_COLUMNS} FROM users WHERE username = ?1"),
            [username.trim()],
            read_user,
        )
        .optional()?;

    let Some(user) = record else {
        equalize_timing(password);
        return Ok(LoginOutcome::Failed {
            user_id: None,
            reason: "unknown_user",
            message: GENERIC.into(),
        });
    };

    if !user.summary.is_active {
        equalize_timing(password);
        return Ok(LoginOutcome::Failed {
            user_id: Some(user.summary.id),
            reason: "inactive_account",
            message: "This account has been deactivated. Contact your administrator.".into(),
        });
    }

    let now = Utc::now();
    if let Some(until) = user.summary.locked_until.as_deref().and_then(parse_rfc3339) {
        if until > now {
            let minutes = ((until - now).num_seconds() as f64 / 60.0).ceil().max(1.0) as i64;
            return Ok(LoginOutcome::Failed {
                user_id: Some(user.summary.id),
                reason: "account_locked",
                message: format!(
                    "This account is temporarily locked after repeated failed sign-ins. Try again in {minutes} minute{}.",
                    if minutes == 1 { "" } else { "s" }
                ),
            });
        }
    }

    if !verify_password(password, &user.password_hash) {
        let attempts = user.failed_attempts + 1;
        if attempts >= MAX_FAILED_ATTEMPTS {
            let until = now + chrono::Duration::minutes(LOCKOUT_MINUTES);
            conn.execute(
                "UPDATE users SET failed_attempts = 0, locked_until = ?2 WHERE id = ?1",
                params![user.summary.id, to_rfc3339(until)],
            )?;
            return Ok(LoginOutcome::Failed {
                user_id: Some(user.summary.id),
                reason: "lockout_triggered",
                message: format!(
                    "Too many failed sign-ins. The account is locked for {LOCKOUT_MINUTES} minutes."
                ),
            });
        }
        conn.execute(
            "UPDATE users SET failed_attempts = ?2 WHERE id = ?1",
            params![user.summary.id, attempts],
        )?;
        return Ok(LoginOutcome::Failed {
            user_id: Some(user.summary.id),
            reason: "wrong_password",
            message: GENERIC.into(),
        });
    }

    conn.execute(
        "UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = ?2 WHERE id = ?1",
        params![user.summary.id, now_rfc3339()],
    )?;
    Ok(LoginOutcome::Success(user.session_user()))
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

struct ActiveSession {
    user: SessionUser,
    started_at: String,
    last_activity: Instant,
    locked: bool,
}

/// Result of checking the session for a command.
pub enum SessionCheck {
    Active(SessionUser),
    /// The inactivity timeout just elapsed; the session is now locked.
    TimedOut(SessionUser),
}

pub struct SessionManager {
    inner: Mutex<Option<ActiveSession>>,
    timeout: Mutex<Duration>,
}

impl Default for SessionManager {
    fn default() -> Self {
        Self {
            inner: Mutex::new(None),
            timeout: Mutex::new(Duration::from_secs(
                u64::from(DEFAULT_SESSION_TIMEOUT_MINUTES) * 60,
            )),
        }
    }
}

impl SessionManager {
    pub fn set_timeout_minutes(&self, minutes: u32) {
        if let Ok(mut timeout) = self.timeout.lock() {
            *timeout = Duration::from_secs(u64::from(minutes.max(1)) * 60);
        }
    }

    fn timeout(&self) -> Duration {
        self.timeout
            .lock()
            .map(|timeout| *timeout)
            .unwrap_or(Duration::from_secs(15 * 60))
    }

    pub fn timeout_minutes(&self) -> u32 {
        (self.timeout().as_secs() / 60) as u32
    }

    pub fn begin(&self, user: SessionUser) -> AppResult<SessionInfo> {
        let mut inner = self.inner.lock()?;
        *inner = Some(ActiveSession {
            user,
            started_at: now_rfc3339(),
            last_activity: Instant::now(),
            locked: false,
        });
        Ok(self.info_of(inner.as_ref().expect("session was just set")))
    }

    pub fn end(&self) -> AppResult<Option<SessionUser>> {
        let mut inner = self.inner.lock()?;
        Ok(inner.take().map(|session| session.user))
    }

    fn info_of(&self, session: &ActiveSession) -> SessionInfo {
        SessionInfo {
            user: session.user.clone(),
            permissions: session.user.role.permissions().to_vec(),
            locked: session.locked,
            started_at: session.started_at.clone(),
            timeout_minutes: self.timeout_minutes(),
        }
    }

    /// Current session, applying the inactivity rule. `None` when signed out.
    pub fn info(&self) -> AppResult<Option<(SessionInfo, bool)>> {
        let mut inner = self.inner.lock()?;
        let timeout = self.timeout();
        Ok(inner.as_mut().map(|session| {
            let timed_out = !session.locked && session.last_activity.elapsed() > timeout;
            if timed_out {
                session.locked = true;
            }
            (self.info_of(session), timed_out)
        }))
    }

    /// The signed-in, unlocked user, refreshing the activity clock.
    pub fn check(&self, touch: bool) -> AppResult<SessionCheck> {
        let mut inner = self.inner.lock()?;
        let timeout = self.timeout();
        let session = inner.as_mut().ok_or(AppError::Unauthenticated)?;
        if session.locked {
            return Err(AppError::SessionLocked);
        }
        if session.last_activity.elapsed() > timeout {
            session.locked = true;
            return Ok(SessionCheck::TimedOut(session.user.clone()));
        }
        if touch {
            session.last_activity = Instant::now();
        }
        Ok(SessionCheck::Active(session.user.clone()))
    }

    /// Like `check`, but never touches the clock and never locks — for reads
    /// that happen without user intent (image tiles for an open viewer).
    pub fn peek(&self) -> Option<SessionUser> {
        let inner = self.inner.lock().ok()?;
        let session = inner.as_ref()?;
        if session.locked || session.last_activity.elapsed() > self.timeout() {
            return None;
        }
        Some(session.user.clone())
    }

    pub fn lock(&self) -> AppResult<Option<SessionUser>> {
        let mut inner = self.inner.lock()?;
        Ok(inner.as_mut().map(|session| {
            session.locked = true;
            session.user.clone()
        }))
    }

    /// The user the session belongs to, whether or not it is locked.
    pub fn owner(&self) -> AppResult<Option<SessionUser>> {
        Ok(self
            .inner
            .lock()?
            .as_ref()
            .map(|session| session.user.clone()))
    }

    pub fn unlock(&self) -> AppResult<SessionInfo> {
        let mut inner = self.inner.lock()?;
        let session = inner.as_mut().ok_or(AppError::Unauthenticated)?;
        session.locked = false;
        session.last_activity = Instant::now();
        Ok(self.info_of(session))
    }

    /// Replace the cached user (after a password change or profile edit).
    pub fn refresh_user(&self, user: SessionUser) -> AppResult<()> {
        let mut inner = self.inner.lock()?;
        if let Some(session) = inner.as_mut() {
            if session.user.id == user.id {
                session.user = user;
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Db;

    fn new_user(username: &str, role: Role) -> NewUserInput {
        NewUserInput {
            username: username.into(),
            full_name: "Test User".into(),
            role,
            password: "correct horse 42".into(),
        }
    }

    #[test]
    fn password_hash_round_trip() {
        let hash = hash_password("s3cure-passphrase").unwrap();
        assert!(hash.starts_with("$argon2id$"));
        assert!(verify_password("s3cure-passphrase", &hash));
        assert!(!verify_password("wrong", &hash));
        assert!(!verify_password("anything", "not-a-hash"));
    }

    #[test]
    fn password_policy() {
        assert!(validate_password("dr.ada", "short1").is_err());
        assert!(validate_password("dr.ada", "onlyletterswithoutdigits").is_err());
        assert!(validate_password("dr.ada", "1234567890123").is_err());
        assert!(validate_password("dr.ada", "dr.ada-2026-pass").is_err());
        assert!(validate_password("dr.ada", "MRI-review-2026").is_ok());
    }

    #[test]
    fn role_matrix_separates_signing_and_administration() {
        assert!(Role::Radiologist.allows(Permission::ReviewSign));
        assert!(!Role::Technologist.allows(Permission::ReviewSign));
        assert!(!Role::Viewer.allows(Permission::PatientWrite));
        assert!(!Role::Radiologist.allows(Permission::UserManage));
        assert!(Role::Admin.allows(Permission::AuditRead));
    }

    #[test]
    fn login_locks_after_repeated_failures() {
        let db = Db::open_in_memory().unwrap();
        db.with(|conn| {
            create_user(conn, &new_user("tech.one", Role::Technologist), false)?;
            for _ in 0..MAX_FAILED_ATTEMPTS - 1 {
                assert!(matches!(
                    login(conn, "tech.one", "nope")?,
                    LoginOutcome::Failed {
                        reason: "wrong_password",
                        ..
                    }
                ));
            }
            assert!(matches!(
                login(conn, "tech.one", "nope")?,
                LoginOutcome::Failed {
                    reason: "lockout_triggered",
                    ..
                }
            ));
            // Even the right password is refused while the lock holds.
            assert!(matches!(
                login(conn, "tech.one", "correct horse 42")?,
                LoginOutcome::Failed {
                    reason: "account_locked",
                    ..
                }
            ));
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn login_is_case_insensitive_on_username() {
        let db = Db::open_in_memory().unwrap();
        db.with(|conn| {
            create_user(conn, &new_user("Dr.Lee", Role::Radiologist), false)?;
            assert!(matches!(
                login(conn, "dr.lee", "correct horse 42")?,
                LoginOutcome::Success(_)
            ));
            assert!(matches!(
                login(conn, "ghost", "correct horse 42")?,
                LoginOutcome::Failed {
                    reason: "unknown_user",
                    ..
                }
            ));
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn last_admin_cannot_be_removed() {
        let db = Db::open_in_memory().unwrap();
        db.with(|conn| {
            let admin = create_user(conn, &new_user("admin.a", Role::Admin), false)?;
            let other = create_user(conn, &new_user("admin.b", Role::Radiologist), false)?;
            let demote = UpdateUserInput {
                full_name: "Admin A".into(),
                role: Role::Viewer,
                is_active: true,
            };
            assert!(update_user(conn, &other.id, &admin.id, &demote).is_err());
            assert!(update_user(
                conn,
                &admin.id,
                &admin.id,
                &UpdateUserInput {
                    full_name: "Admin A".into(),
                    role: Role::Admin,
                    is_active: false,
                }
            )
            .is_err());
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn session_locks_after_timeout() {
        let sessions = SessionManager::default();
        sessions
            .begin(SessionUser {
                id: "u".into(),
                username: "u".into(),
                full_name: "U".into(),
                role: Role::Viewer,
                must_change_password: false,
            })
            .unwrap();
        assert!(matches!(sessions.check(true), Ok(SessionCheck::Active(_))));
        {
            let mut inner = sessions.inner.lock().unwrap();
            inner.as_mut().unwrap().last_activity = Instant::now() - Duration::from_secs(16 * 60);
        }
        assert!(matches!(
            sessions.check(true),
            Ok(SessionCheck::TimedOut(_))
        ));
        assert!(matches!(sessions.check(true), Err(AppError::SessionLocked)));
        sessions.unlock().unwrap();
        assert!(matches!(sessions.check(true), Ok(SessionCheck::Active(_))));
    }
}
