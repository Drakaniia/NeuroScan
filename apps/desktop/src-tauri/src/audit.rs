//! Tamper-evident audit trail of clinical and administrative actions.
//!
//! Each entry stores the SHA-256 of its own content chained to the previous
//! entry's hash. Editing, deleting or reordering any row breaks the chain from
//! that point on, which `verify` reports. This makes tampering *evident*; it
//! does not make the file tamper-*proof* — anyone with write access to the
//! database file could rebuild the whole chain — so it complements, and does
//! not replace, operating-system access control and backups.

use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::auth::SessionUser;
use crate::error::AppResult;
use crate::util::{like_pattern, new_id, now_rfc3339, page_limit, sha256_hex};

const GENESIS: &str = "0000000000000000000000000000000000000000000000000000000000000000";

/// Who performed an action. `System` covers startup work and model loading.
pub enum Actor<'a> {
    User(&'a SessionUser),
    /// A sign-in attempt for a username that may or may not exist.
    Attempt {
        user_id: Option<&'a str>,
        username: &'a str,
    },
    System,
}

impl Actor<'_> {
    fn ids(&self) -> (Option<String>, Option<String>) {
        match self {
            Actor::User(user) => (Some(user.id.clone()), Some(user.username.clone())),
            Actor::Attempt { user_id, username } => {
                (user_id.map(str::to_string), Some((*username).to_string()))
            }
            Actor::System => (None, Some("system".to_string())),
        }
    }
}

/// SHA-256 over the entry's fields in a fixed order:
/// prev_hash, id, ts, user_id, username, action, entity_type, entity_id, details.
/// Unit separators keep field boundaries unambiguous; absent values hash as "".
fn entry_hash(fields: [Option<&str>; 9]) -> String {
    let material = fields.map(|field| field.unwrap_or("")).join("\u{1f}");
    sha256_hex(material.as_bytes())
}

/// Append one entry. Call it inside the same transaction as the change it
/// describes, so a change is never recorded without its audit entry.
pub fn record(
    conn: &Connection,
    actor: Actor<'_>,
    action: &str,
    entity: Option<(&str, &str)>,
    details: Value,
) -> AppResult<()> {
    let prev_hash: String = conn
        .query_row(
            "SELECT hash FROM audit_log ORDER BY seq DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .optional()?
        .unwrap_or_else(|| GENESIS.to_string());

    let id = new_id();
    let ts = now_rfc3339();
    let (user_id, username) = actor.ids();
    let (entity_type, entity_id) = match entity {
        Some((kind, id)) => (Some(kind), Some(id)),
        None => (None, None),
    };
    let details = serde_json::to_string(&details)?;
    let hash = entry_hash([
        Some(&prev_hash),
        Some(&id),
        Some(&ts),
        user_id.as_deref(),
        username.as_deref(),
        Some(action),
        entity_type,
        entity_id,
        Some(&details),
    ]);

    conn.execute(
        "INSERT INTO audit_log (id, ts, user_id, username, action, entity_type, entity_id, details, prev_hash, hash)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            id,
            ts,
            user_id,
            username,
            action,
            entity_type,
            entity_id,
            details,
            prev_hash,
            hash
        ],
    )?;
    Ok(())
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditEntry {
    pub seq: i64,
    pub id: String,
    pub ts: String,
    pub user_id: Option<String>,
    pub username: Option<String>,
    pub action: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<String>,
    pub details: Value,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditQuery {
    pub search: Option<String>,
    pub action: Option<String>,
    pub username: Option<String>,
    pub from: Option<String>,
    pub to: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditPage {
    pub items: Vec<AuditEntry>,
    pub total: i64,
    pub actions: Vec<String>,
}

fn read_entry(row: &Row<'_>) -> rusqlite::Result<AuditEntry> {
    let details: String = row.get(8)?;
    Ok(AuditEntry {
        seq: row.get(0)?,
        id: row.get(1)?,
        ts: row.get(2)?,
        user_id: row.get(3)?,
        username: row.get(4)?,
        action: row.get(5)?,
        entity_type: row.get(6)?,
        entity_id: row.get(7)?,
        details: serde_json::from_str(&details).unwrap_or(Value::Null),
    })
}

pub fn list(conn: &Connection, query: &AuditQuery) -> AppResult<AuditPage> {
    let mut clauses: Vec<String> = Vec::new();
    let mut values: Vec<String> = Vec::new();

    if let Some(search) = query
        .search
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
    {
        values.push(like_pattern(search));
        let n = values.len();
        clauses.push(format!(
            "(action LIKE ?{n} ESCAPE '\\' OR username LIKE ?{n} ESCAPE '\\' OR entity_id LIKE ?{n} ESCAPE '\\' OR details LIKE ?{n} ESCAPE '\\')"
        ));
    }
    if let Some(action) = query.action.as_deref().filter(|s| !s.is_empty()) {
        values.push(action.to_string());
        clauses.push(format!("action = ?{}", values.len()));
    }
    if let Some(username) = query.username.as_deref().filter(|s| !s.is_empty()) {
        values.push(username.to_string());
        clauses.push(format!("username = ?{} COLLATE NOCASE", values.len()));
    }
    if let Some(from) = query.from.as_deref().filter(|s| !s.is_empty()) {
        values.push(from.to_string());
        clauses.push(format!("ts >= ?{}", values.len()));
    }
    if let Some(to) = query.to.as_deref().filter(|s| !s.is_empty()) {
        values.push(to.to_string());
        clauses.push(format!("ts < ?{}", values.len()));
    }

    let filter = if clauses.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", clauses.join(" AND "))
    };
    let limit = page_limit(query.limit, 100, 500);
    let offset = i64::from(query.offset.unwrap_or(0));

    let total: i64 = conn.query_row(
        &format!("SELECT COUNT(*) FROM audit_log {filter}"),
        rusqlite::params_from_iter(values.iter()),
        |row| row.get(0),
    )?;

    let mut statement = conn.prepare(&format!(
        "SELECT seq, id, ts, user_id, username, action, entity_type, entity_id, details
         FROM audit_log {filter} ORDER BY seq DESC LIMIT {limit} OFFSET {offset}"
    ))?;
    let items = statement
        .query_map(rusqlite::params_from_iter(values.iter()), read_entry)?
        .collect::<Result<Vec<_>, _>>()?;

    let mut actions_statement =
        conn.prepare("SELECT DISTINCT action FROM audit_log ORDER BY action")?;
    let actions = actions_statement
        .query_map([], |row| row.get::<_, String>(0))?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(AuditPage {
        items,
        total,
        actions,
    })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditVerification {
    pub valid: bool,
    pub checked: i64,
    /// Sequence number of the first entry whose hash does not match.
    pub first_invalid_seq: Option<i64>,
    pub verified_at: String,
}

/// Recompute the whole chain.
pub fn verify(conn: &Connection) -> AppResult<AuditVerification> {
    let mut statement = conn.prepare(
        "SELECT seq, id, ts, user_id, username, action, entity_type, entity_id, details, prev_hash, hash
         FROM audit_log ORDER BY seq ASC",
    )?;
    let mut rows = statement.query([])?;
    let mut expected_prev = GENESIS.to_string();
    let mut checked = 0;

    while let Some(row) = rows.next()? {
        let seq: i64 = row.get(0)?;
        let id: String = row.get(1)?;
        let ts: String = row.get(2)?;
        let user_id: Option<String> = row.get(3)?;
        let username: Option<String> = row.get(4)?;
        let action: String = row.get(5)?;
        let entity_type: Option<String> = row.get(6)?;
        let entity_id: Option<String> = row.get(7)?;
        let details: String = row.get(8)?;
        let prev_hash: String = row.get(9)?;
        let hash: String = row.get(10)?;

        let recomputed = entry_hash([
            Some(&prev_hash),
            Some(&id),
            Some(&ts),
            user_id.as_deref(),
            username.as_deref(),
            Some(&action),
            entity_type.as_deref(),
            entity_id.as_deref(),
            Some(&details),
        ]);
        if prev_hash != expected_prev || recomputed != hash {
            return Ok(AuditVerification {
                valid: false,
                checked,
                first_invalid_seq: Some(seq),
                verified_at: now_rfc3339(),
            });
        }
        expected_prev = hash;
        checked += 1;
    }

    Ok(AuditVerification {
        valid: true,
        checked,
        first_invalid_seq: None,
        verified_at: now_rfc3339(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Db;
    use serde_json::json;

    #[test]
    fn chain_verifies_and_detects_tampering() {
        let db = Db::open_in_memory().unwrap();
        db.with(|conn| {
            record(conn, Actor::System, "app_started", None, json!({}))?;
            record(
                conn,
                Actor::Attempt {
                    user_id: None,
                    username: "ghost",
                },
                "login_failed",
                None,
                json!({ "reason": "unknown_user" }),
            )?;
            record(
                conn,
                Actor::System,
                "patient_created",
                Some(("patient", "p-1")),
                json!({ "mrn": "MRN-1" }),
            )?;
            let report = verify(conn)?;
            assert!(report.valid);
            assert_eq!(report.checked, 3);

            conn.execute(
                "UPDATE audit_log SET details = '{\"mrn\":\"MRN-2\"}' WHERE action = 'patient_created'",
                [],
            )?;
            let report = verify(conn)?;
            assert!(!report.valid);
            assert_eq!(report.first_invalid_seq, Some(3));

            let page = list(
                conn,
                &AuditQuery {
                    search: Some("ghost".into()),
                    ..Default::default()
                },
            )?;
            assert_eq!(page.total, 1);
            assert_eq!(page.items[0].action, "login_failed");
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn deleting_an_entry_breaks_the_chain() {
        let db = Db::open_in_memory().unwrap();
        db.with(|conn| {
            for action in ["a", "b", "c"] {
                record(conn, Actor::System, action, None, json!({}))?;
            }
            conn.execute("DELETE FROM audit_log WHERE action = 'b'", [])?;
            assert!(!verify(conn)?.valid);
            Ok(())
        })
        .unwrap();
    }
}
