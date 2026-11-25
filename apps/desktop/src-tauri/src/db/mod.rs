//! SQLite connection, pragmas and schema migrations.
//!
//! One connection behind a mutex: a desktop workstation has one writer, and
//! serialising access keeps every multi-statement change (an import, a
//! signature) atomic without a pool. Heavy work — decoding images, running the
//! model — happens outside the lock; only the short reads and writes hold it.

use std::path::Path;
use std::sync::{Mutex, MutexGuard};

use rusqlite::Connection;

use crate::error::{AppError, AppResult};

/// Ordered migrations. Each runs once, inside a transaction, and bumps
/// `PRAGMA user_version` to its position. Never edit a shipped migration —
/// append a new one.
const MIGRATIONS: &[&str] = &[include_str!("migrations/0001_init.sql")];

pub struct Db {
    conn: Mutex<Connection>,
}

impl Db {
    pub fn open(path: &Path) -> AppResult<Self> {
        let conn = Connection::open(path)?;
        Self::init(conn)
    }

    /// A private, throwaway database — used by tests.
    pub fn open_in_memory() -> AppResult<Self> {
        Self::init(Connection::open_in_memory()?)
    }

    fn init(mut conn: Connection) -> AppResult<Self> {
        conn.busy_timeout(std::time::Duration::from_secs(5))?;
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;",
        )?;
        migrate(&mut conn)?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    /// Exclusive access to the connection for the duration of `f`.
    pub fn with<T>(&self, f: impl FnOnce(&mut Connection) -> AppResult<T>) -> AppResult<T> {
        let mut guard = self.lock()?;
        f(&mut guard)
    }

    /// Run `f` inside a transaction that commits only if `f` succeeds.
    pub fn transaction<T>(
        &self,
        f: impl FnOnce(&rusqlite::Transaction<'_>) -> AppResult<T>,
    ) -> AppResult<T> {
        let mut guard = self.lock()?;
        let tx = guard.transaction()?;
        let value = f(&tx)?;
        tx.commit()?;
        Ok(value)
    }

    fn lock(&self) -> AppResult<MutexGuard<'_, Connection>> {
        self.conn.lock().map_err(AppError::from)
    }
}

fn migrate(conn: &mut Connection) -> AppResult<()> {
    let current: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    let target = MIGRATIONS.len() as i64;
    if current > target {
        return Err(AppError::Internal(format!(
            "This database was created by a newer version of NeuroScan (schema {current}, this build supports {target}). Update the application before opening it."
        )));
    }
    for (index, sql) in MIGRATIONS.iter().enumerate().skip(current as usize) {
        let tx = conn.transaction()?;
        tx.execute_batch(sql)?;
        tx.execute_batch(&format!("PRAGMA user_version = {}", index + 1))?;
        tx.commit()?;
    }
    Ok(())
}

/// Insert a bare user row so records can reference it (tests only).
#[cfg(test)]
pub fn seed_user(conn: &Connection, id: &str) {
    conn.execute(
        "INSERT OR IGNORE INTO users (id, username, full_name, role, password_hash, created_at, updated_at)
         VALUES (?1, ?1, ?1, 'admin', 'x', 'now', 'now')",
        [id],
    )
    .expect("seed user");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrations_apply_and_are_idempotent() {
        let db = Db::open_in_memory().unwrap();
        db.with(|conn| {
            let version: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
            assert_eq!(version, MIGRATIONS.len() as i64);
            migrate(conn)?;
            let tables: i64 = conn.query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name IN ('users','patients','examinations','images','analyses','reviews','audit_log','settings','counters')",
                [],
                |row| row.get(0),
            )?;
            assert_eq!(tables, 9);
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn foreign_keys_are_enforced() {
        let db = Db::open_in_memory().unwrap();
        let result = db.with(|conn| {
            conn.execute(
                "INSERT INTO examinations (id, accession_number, patient_id, description, study_date, status, created_at, updated_at)
                 VALUES ('e', 'A1', 'missing-patient', 'MRI Brain', '2026-01-01', 'awaiting_images', 'x', 'x')",
                [],
            )?;
            Ok(())
        });
        assert!(result.is_err());
    }
}
