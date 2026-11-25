//! Patient registry.

use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};
use crate::util::{
    check_max, clean_optional, clean_required, like_pattern, local_today, new_id, now_rfc3339,
    page_limit, parse_date,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Sex {
    Female,
    Male,
    Other,
    Unknown,
}

impl Sex {
    pub fn as_str(self) -> &'static str {
        match self {
            Sex::Female => "female",
            Sex::Male => "male",
            Sex::Other => "other",
            Sex::Unknown => "unknown",
        }
    }

    fn parse(value: &str) -> Sex {
        match value {
            "female" => Sex::Female,
            "male" => Sex::Male,
            "other" => Sex::Other,
            _ => Sex::Unknown,
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Patient {
    pub id: String,
    pub mrn: String,
    pub given_name: String,
    pub family_name: String,
    pub sex: Sex,
    pub birth_date: Option<String>,
    pub phone: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PatientSummary {
    #[serde(flatten)]
    pub patient: Patient,
    pub exam_count: i64,
    pub open_exam_count: i64,
    pub last_study_date: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatientInput {
    pub mrn: String,
    pub given_name: String,
    pub family_name: String,
    pub sex: Sex,
    pub birth_date: Option<String>,
    pub phone: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatientQuery {
    pub search: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PatientPage {
    pub items: Vec<PatientSummary>,
    pub total: i64,
}

const PATIENT_COLUMNS: &str =
    "p.id, p.mrn, p.given_name, p.family_name, p.sex, p.birth_date, p.phone, p.notes, p.created_at, p.updated_at";

fn read_patient(row: &Row<'_>) -> rusqlite::Result<Patient> {
    let sex: String = row.get(4)?;
    Ok(Patient {
        id: row.get(0)?,
        mrn: row.get(1)?,
        given_name: row.get(2)?,
        family_name: row.get(3)?,
        sex: Sex::parse(&sex),
        birth_date: row.get(5)?,
        phone: row.get(6)?,
        notes: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

/// Validated, normalised patient fields.
struct CleanPatient {
    mrn: String,
    given_name: String,
    family_name: String,
    sex: Sex,
    birth_date: Option<String>,
    phone: Option<String>,
    notes: Option<String>,
}

fn validate(input: &PatientInput) -> AppResult<CleanPatient> {
    let mrn = clean_required("mrn", "Medical record number", &input.mrn, 32)?;
    if !mrn
        .chars()
        .all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.' | '/'))
    {
        return Err(AppError::validation(
            "mrn",
            "Medical record number may contain letters, digits, '-', '_', '.' and '/' only.",
        ));
    }
    let given_name = clean_required("givenName", "Given name", &input.given_name, 80)?;
    let family_name = clean_required("familyName", "Family name", &input.family_name, 80)?;

    let birth_date = clean_optional(input.birth_date.clone());
    if let Some(value) = &birth_date {
        let date = parse_date(value).ok_or_else(|| {
            AppError::validation(
                "birthDate",
                "Date of birth must be a valid date (YYYY-MM-DD).",
            )
        })?;
        if date > local_today() {
            return Err(AppError::validation(
                "birthDate",
                "Date of birth cannot be in the future.",
            ));
        }
        if date < chrono::NaiveDate::from_ymd_opt(1900, 1, 1).expect("valid constant date") {
            return Err(AppError::validation(
                "birthDate",
                "Date of birth must be on or after 1900-01-01.",
            ));
        }
    }

    let phone = clean_optional(input.phone.clone());
    if let Some(value) = &phone {
        let valid = value.len() <= 32
            && value
                .chars()
                .all(|ch| ch.is_ascii_digit() || matches!(ch, ' ' | '+' | '-' | '(' | ')' | '.'));
        if !valid {
            return Err(AppError::validation(
                "phone",
                "Phone number may contain digits, spaces and + - ( ) . only (max 32).",
            ));
        }
    }

    let notes = clean_optional(input.notes.clone());
    check_max("notes", "Notes", &notes, 2000)?;

    Ok(CleanPatient {
        mrn,
        given_name,
        family_name,
        sex: input.sex,
        birth_date,
        phone,
        notes,
    })
}

fn ensure_unique_mrn(conn: &Connection, mrn: &str, except_id: Option<&str>) -> AppResult<()> {
    let existing: Option<(String, String, String)> = conn
        .query_row(
            "SELECT id, given_name, family_name FROM patients WHERE mrn = ?1",
            [mrn],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .optional()?;
    if let Some((id, given, family)) = existing {
        if Some(id.as_str()) != except_id {
            return Err(AppError::Validation {
                field: Some("mrn".into()),
                message: format!(
                    "MRN {mrn} is already registered to {family}, {given}. Open the existing record instead of creating a duplicate."
                ),
            });
        }
    }
    Ok(())
}

pub fn create(conn: &Connection, input: &PatientInput, user_id: &str) -> AppResult<Patient> {
    let clean = validate(input)?;
    ensure_unique_mrn(conn, &clean.mrn, None)?;
    let id = new_id();
    let now = now_rfc3339();
    conn.execute(
        "INSERT INTO patients (id, mrn, given_name, family_name, sex, birth_date, phone, notes, created_at, updated_at, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9, ?10)",
        params![
            id,
            clean.mrn,
            clean.given_name,
            clean.family_name,
            clean.sex.as_str(),
            clean.birth_date,
            clean.phone,
            clean.notes,
            now,
            user_id
        ],
    )?;
    get(conn, &id)
}

pub fn update(conn: &Connection, id: &str, input: &PatientInput) -> AppResult<(Patient, Patient)> {
    let before = get(conn, id)?;
    let clean = validate(input)?;
    ensure_unique_mrn(conn, &clean.mrn, Some(id))?;
    conn.execute(
        "UPDATE patients SET mrn = ?2, given_name = ?3, family_name = ?4, sex = ?5, birth_date = ?6, phone = ?7, notes = ?8, updated_at = ?9
         WHERE id = ?1",
        params![
            id,
            clean.mrn,
            clean.given_name,
            clean.family_name,
            clean.sex.as_str(),
            clean.birth_date,
            clean.phone,
            clean.notes,
            now_rfc3339()
        ],
    )?;
    Ok((before, get(conn, id)?))
}

pub fn get(conn: &Connection, id: &str) -> AppResult<Patient> {
    conn.query_row(
        &format!("SELECT {PATIENT_COLUMNS} FROM patients p WHERE p.id = ?1"),
        [id],
        read_patient,
    )
    .optional()?
    .ok_or(AppError::NotFound("Patient"))
}

/// Field-level differences, for the audit trail of an edit.
pub fn changed_fields(before: &Patient, after: &Patient) -> Vec<&'static str> {
    let mut changed = Vec::new();
    if before.mrn != after.mrn {
        changed.push("mrn");
    }
    if before.given_name != after.given_name {
        changed.push("givenName");
    }
    if before.family_name != after.family_name {
        changed.push("familyName");
    }
    if before.sex != after.sex {
        changed.push("sex");
    }
    if before.birth_date != after.birth_date {
        changed.push("birthDate");
    }
    if before.phone != after.phone {
        changed.push("phone");
    }
    if before.notes != after.notes {
        changed.push("notes");
    }
    changed
}

pub fn list(conn: &Connection, query: &PatientQuery) -> AppResult<PatientPage> {
    let mut clauses: Vec<String> = Vec::new();
    let mut values: Vec<String> = Vec::new();
    if let Some(search) = query.search.as_deref() {
        // Every term must match somewhere: "smith 1042" finds Smith with MRN …1042….
        for term in search.split_whitespace().take(5) {
            let term = term.trim_matches(',');
            if term.is_empty() {
                continue;
            }
            values.push(like_pattern(term));
            let n = values.len();
            clauses.push(format!(
                "(p.mrn LIKE ?{n} ESCAPE '\\' OR p.given_name LIKE ?{n} ESCAPE '\\' OR p.family_name LIKE ?{n} ESCAPE '\\')"
            ));
        }
    }
    let filter = if clauses.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", clauses.join(" AND "))
    };
    let limit = page_limit(query.limit, 50, 200);
    let offset = i64::from(query.offset.unwrap_or(0));

    let total: i64 = conn.query_row(
        &format!("SELECT COUNT(*) FROM patients p {filter}"),
        rusqlite::params_from_iter(values.iter()),
        |row| row.get(0),
    )?;

    let mut statement = conn.prepare(&format!(
        "SELECT {PATIENT_COLUMNS},
                (SELECT COUNT(*) FROM examinations e WHERE e.patient_id = p.id),
                (SELECT COUNT(*) FROM examinations e WHERE e.patient_id = p.id AND e.status != 'finalized'),
                (SELECT MAX(e.study_date) FROM examinations e WHERE e.patient_id = p.id)
         FROM patients p {filter}
         ORDER BY p.updated_at DESC
         LIMIT {limit} OFFSET {offset}"
    ))?;
    let items = statement
        .query_map(rusqlite::params_from_iter(values.iter()), |row| {
            Ok(PatientSummary {
                patient: read_patient(row)?,
                exam_count: row.get(10)?,
                open_exam_count: row.get(11)?,
                last_study_date: row.get(12)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(PatientPage { items, total })
}

pub fn count(conn: &Connection) -> AppResult<i64> {
    Ok(conn.query_row("SELECT COUNT(*) FROM patients", [], |row| row.get(0))?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Db;

    fn input(mrn: &str) -> PatientInput {
        PatientInput {
            mrn: mrn.into(),
            given_name: "Maria".into(),
            family_name: "Santos".into(),
            sex: Sex::Female,
            birth_date: Some("1984-03-09".into()),
            phone: Some("+63 917 555 0101".into()),
            notes: None,
        }
    }

    #[test]
    fn creates_searches_and_rejects_duplicates() {
        let db = Db::open_in_memory().unwrap();
        db.with(|conn| {
            crate::db::seed_user(conn, "u");
            let patient = create(conn, &input("MRN-0001"), "u")?;
            assert_eq!(patient.family_name, "Santos");
            assert!(create(conn, &input("mrn-0001"), "u").is_err());

            let page = list(
                conn,
                &PatientQuery {
                    search: Some("santos 0001".into()),
                    ..Default::default()
                },
            )?;
            assert_eq!(page.total, 1);
            let page = list(
                conn,
                &PatientQuery {
                    search: Some("nobody".into()),
                    ..Default::default()
                },
            )?;
            assert_eq!(page.total, 0);
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn validates_fields() {
        let mut bad = input("MRN 1");
        assert!(validate(&bad).is_err());
        bad.mrn = "MRN-1".into();
        bad.birth_date = Some("2999-01-01".into());
        assert!(validate(&bad).is_err());
        bad.birth_date = Some("1990-02-31".into());
        assert!(validate(&bad).is_err());
        bad.birth_date = None;
        bad.phone = Some("call me".into());
        assert!(validate(&bad).is_err());
        bad.phone = None;
        assert!(validate(&bad).is_ok());
    }

    #[test]
    fn update_reports_changed_fields() {
        let db = Db::open_in_memory().unwrap();
        db.with(|conn| {
            crate::db::seed_user(conn, "u");
            let patient = create(conn, &input("MRN-0002"), "u")?;
            let mut edit = input("MRN-0002");
            edit.phone = None;
            let (before, after) = update(conn, &patient.id, &edit)?;
            assert_eq!(changed_fields(&before, &after), vec!["phone"]);
            Ok(())
        })
        .unwrap();
    }
}
