//! Examinations: the unit of clinical work.
//!
//! Lifecycle:
//!
//! ```text
//! awaiting_images ──import──▶ ready ──analyze──▶ analyzing ──▶ awaiting_review ──sign──▶ finalized
//!        ▲                      │                                     ▲                    │
//!        └──remove last image───┘                                     └──────amend─────────┘
//! ```
//!
//! AI analysis is optional on that path: when no model is available a
//! clinician reviews and signs a `ready` examination directly.

use chrono::{Local, TimeZone, Utc};
use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};
use crate::patients::Sex;
use crate::util::{
    check_max, clean_optional, clean_required, like_pattern, local_today, new_id, now_rfc3339,
    page_limit, parse_date, to_rfc3339,
};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExamStatus {
    AwaitingImages,
    Ready,
    Analyzing,
    AwaitingReview,
    Finalized,
}

impl ExamStatus {
    pub fn as_str(self) -> &'static str {
        match self {
            ExamStatus::AwaitingImages => "awaiting_images",
            ExamStatus::Ready => "ready",
            ExamStatus::Analyzing => "analyzing",
            ExamStatus::AwaitingReview => "awaiting_review",
            ExamStatus::Finalized => "finalized",
        }
    }

    pub fn parse(value: &str) -> ExamStatus {
        match value {
            "ready" => ExamStatus::Ready,
            "analyzing" => ExamStatus::Analyzing,
            "awaiting_review" => ExamStatus::AwaitingReview,
            "finalized" => ExamStatus::Finalized,
            _ => ExamStatus::AwaitingImages,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Priority {
    Routine,
    Urgent,
    Stat,
}

impl Priority {
    pub fn as_str(self) -> &'static str {
        match self {
            Priority::Routine => "routine",
            Priority::Urgent => "urgent",
            Priority::Stat => "stat",
        }
    }

    fn parse(value: &str) -> Priority {
        match value {
            "urgent" => Priority::Urgent,
            "stat" => Priority::Stat,
            _ => Priority::Routine,
        }
    }
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PatientBrief {
    pub id: String,
    pub mrn: String,
    pub given_name: String,
    pub family_name: String,
    pub sex: Sex,
    pub birth_date: Option<String>,
}

/// Exam-level roll-up of the latest AI result on every image.
#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiSummary {
    pub analyzed_count: i64,
    pub failed_count: i64,
    pub positive_count: i64,
    pub indeterminate_count: i64,
    pub negative_count: i64,
    pub max_probability: Option<f64>,
    /// The most concerning verdict across images; `None` until something ran.
    pub overall: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewBrief {
    pub status: String,
    pub version: i64,
    pub impression: Option<String>,
    pub signed_at: Option<String>,
    pub signed_by_name: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExamSummary {
    pub id: String,
    pub accession_number: String,
    pub patient: PatientBrief,
    pub modality: String,
    pub body_part: String,
    pub description: String,
    pub clinical_indication: Option<String>,
    pub referring_physician: Option<String>,
    pub priority: Priority,
    pub study_date: String,
    pub status: ExamStatus,
    pub image_count: i64,
    pub ai: AiSummary,
    pub review: Option<ReviewBrief>,
    pub created_at: String,
    pub updated_at: String,
    pub created_by_name: Option<String>,
    pub finalized_at: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExamInput {
    pub description: String,
    pub clinical_indication: Option<String>,
    pub referring_physician: Option<String>,
    pub priority: Priority,
    pub study_date: String,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExamQuery {
    pub search: Option<String>,
    /// A status, or `open` for every non-finalized examination.
    pub status: Option<String>,
    pub patient_id: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    /// `positive`, `indeterminate`, `negative`, `flagged` (positive or
    /// indeterminate) or `none` (never analyzed).
    pub ai_flag: Option<String>,
    pub priority: Option<String>,
    /// `worklist` orders by priority then date; default is newest first.
    pub order: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExamPage {
    pub items: Vec<ExamSummary>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorklistStats {
    pub awaiting_images: i64,
    pub ready: i64,
    pub analyzing: i64,
    pub awaiting_review: i64,
    pub finalized_today: i64,
    pub flagged_open: i64,
    pub total_open: i64,
    pub patient_count: i64,
}

/// Latest analysis per image, aggregated per examination.
const AI_ROLLUP: &str = "
    WITH latest AS (
        SELECT a.exam_id, a.status, a.verdict, a.probability
        FROM analyses a
        JOIN (SELECT image_id, MAX(created_at) AS created_at FROM analyses GROUP BY image_id) m
          ON m.image_id = a.image_id AND m.created_at = a.created_at
        JOIN images i ON i.id = a.image_id
    ),
    rollup AS (
        SELECT exam_id,
               SUM(status = 'completed') AS analyzed,
               SUM(status = 'failed') AS failed,
               SUM(verdict = 'positive') AS positive,
               SUM(verdict = 'indeterminate') AS indeterminate,
               SUM(verdict = 'negative') AS negative,
               MAX(probability) AS max_probability
        FROM latest GROUP BY exam_id
    ),
    current_review AS (
        SELECT r.exam_id, r.status, r.version, r.impression, r.signed_at, u.full_name AS signed_by_name
        FROM reviews r
        JOIN (SELECT exam_id, MAX(version) AS version FROM reviews GROUP BY exam_id) mv
          ON mv.exam_id = r.exam_id AND mv.version = r.version
        LEFT JOIN users u ON u.id = r.signed_by
    )";

const SUMMARY_SELECT: &str = "
    SELECT e.id, e.accession_number, e.modality, e.body_part, e.description, e.clinical_indication,
           e.referring_physician, e.priority, e.study_date, e.status, e.created_at, e.updated_at, e.finalized_at,
           p.id, p.mrn, p.given_name, p.family_name, p.sex, p.birth_date,
           (SELECT COUNT(*) FROM images i WHERE i.exam_id = e.id),
           COALESCE(r.analyzed, 0), COALESCE(r.failed, 0), COALESCE(r.positive, 0),
           COALESCE(r.indeterminate, 0), COALESCE(r.negative, 0), r.max_probability,
           cr.status, cr.version, cr.impression, cr.signed_at, cr.signed_by_name,
           cu.full_name
    FROM examinations e
    JOIN patients p ON p.id = e.patient_id
    LEFT JOIN rollup r ON r.exam_id = e.id
    LEFT JOIN current_review cr ON cr.exam_id = e.id
    LEFT JOIN users cu ON cu.id = e.created_by";

fn overall_verdict(ai: &AiSummary) -> Option<String> {
    if ai.positive_count > 0 {
        Some("positive".into())
    } else if ai.indeterminate_count > 0 {
        Some("indeterminate".into())
    } else if ai.negative_count > 0 {
        Some("negative".into())
    } else {
        None
    }
}

fn read_summary(row: &Row<'_>) -> rusqlite::Result<ExamSummary> {
    let sex: String = row.get(17)?;
    let mut ai = AiSummary {
        analyzed_count: row.get(20)?,
        failed_count: row.get(21)?,
        positive_count: row.get(22)?,
        indeterminate_count: row.get(23)?,
        negative_count: row.get(24)?,
        max_probability: row.get(25)?,
        overall: None,
    };
    ai.overall = overall_verdict(&ai);
    let review_status: Option<String> = row.get(26)?;
    let review = match review_status {
        Some(status) => Some(ReviewBrief {
            status,
            version: row.get(27)?,
            impression: row.get(28)?,
            signed_at: row.get(29)?,
            signed_by_name: row.get(30)?,
        }),
        None => None,
    };
    let priority: String = row.get(7)?;
    let status: String = row.get(9)?;
    Ok(ExamSummary {
        id: row.get(0)?,
        accession_number: row.get(1)?,
        modality: row.get(2)?,
        body_part: row.get(3)?,
        description: row.get(4)?,
        clinical_indication: row.get(5)?,
        referring_physician: row.get(6)?,
        priority: Priority::parse(&priority),
        study_date: row.get(8)?,
        status: ExamStatus::parse(&status),
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
        finalized_at: row.get(12)?,
        patient: PatientBrief {
            id: row.get(13)?,
            mrn: row.get(14)?,
            given_name: row.get(15)?,
            family_name: row.get(16)?,
            sex: match sex.as_str() {
                "female" => Sex::Female,
                "male" => Sex::Male,
                "other" => Sex::Other,
                _ => Sex::Unknown,
            },
            birth_date: row.get(18)?,
        },
        image_count: row.get(19)?,
        ai,
        review,
        created_by_name: row.get(31)?,
    })
}

struct CleanExam {
    description: String,
    clinical_indication: Option<String>,
    referring_physician: Option<String>,
    priority: Priority,
    study_date: String,
}

fn validate(input: &ExamInput) -> AppResult<CleanExam> {
    let description = clean_required("description", "Study description", &input.description, 120)?;
    let clinical_indication = clean_optional(input.clinical_indication.clone());
    check_max(
        "clinicalIndication",
        "Clinical indication",
        &clinical_indication,
        1000,
    )?;
    let referring_physician = clean_optional(input.referring_physician.clone());
    check_max(
        "referringPhysician",
        "Referring physician",
        &referring_physician,
        120,
    )?;
    let study_date = input.study_date.trim().to_string();
    let date = parse_date(&study_date).ok_or_else(|| {
        AppError::validation("studyDate", "Study date must be a valid date (YYYY-MM-DD).")
    })?;
    if date > local_today() {
        return Err(AppError::validation(
            "studyDate",
            "Study date cannot be in the future.",
        ));
    }
    Ok(CleanExam {
        description,
        clinical_indication,
        referring_physician,
        priority: input.priority,
        study_date,
    })
}

/// `NS-YYYYMMDD-NNN`, sequential per calendar day on this workstation.
fn next_accession(conn: &Connection) -> AppResult<String> {
    let day = local_today().format("%Y%m%d").to_string();
    let counter = format!("accession:{day}");
    conn.execute(
        "INSERT INTO counters (name, value) VALUES (?1, 1)
         ON CONFLICT (name) DO UPDATE SET value = value + 1",
        [&counter],
    )?;
    let value: i64 = conn.query_row(
        "SELECT value FROM counters WHERE name = ?1",
        [&counter],
        |row| row.get(0),
    )?;
    Ok(format!("NS-{day}-{value:03}"))
}

pub fn create(
    conn: &Connection,
    patient_id: &str,
    input: &ExamInput,
    user_id: &str,
) -> AppResult<ExamSummary> {
    crate::patients::get(conn, patient_id)?;
    let clean = validate(input)?;
    let id = new_id();
    let accession = next_accession(conn)?;
    let now = now_rfc3339();
    conn.execute(
        "INSERT INTO examinations (id, accession_number, patient_id, description, clinical_indication, referring_physician,
                                   priority, study_date, status, created_at, updated_at, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'awaiting_images', ?9, ?9, ?10)",
        params![
            id,
            accession,
            patient_id,
            clean.description,
            clean.clinical_indication,
            clean.referring_physician,
            clean.priority.as_str(),
            clean.study_date,
            now,
            user_id
        ],
    )?;
    get(conn, &id)
}

pub fn update(conn: &Connection, id: &str, input: &ExamInput) -> AppResult<ExamSummary> {
    let exam = get(conn, id)?;
    ensure_editable(&exam)?;
    let clean = validate(input)?;
    conn.execute(
        "UPDATE examinations SET description = ?2, clinical_indication = ?3, referring_physician = ?4,
                                 priority = ?5, study_date = ?6, updated_at = ?7
         WHERE id = ?1",
        params![
            id,
            clean.description,
            clean.clinical_indication,
            clean.referring_physician,
            clean.priority.as_str(),
            clean.study_date,
            now_rfc3339()
        ],
    )?;
    get(conn, id)
}

pub fn get(conn: &Connection, id: &str) -> AppResult<ExamSummary> {
    conn.query_row(
        &format!("{AI_ROLLUP} {SUMMARY_SELECT} WHERE e.id = ?1"),
        [id],
        read_summary,
    )
    .optional()?
    .ok_or(AppError::NotFound("Examination"))
}

pub fn status_of(conn: &Connection, id: &str) -> AppResult<ExamStatus> {
    let status: Option<String> = conn
        .query_row(
            "SELECT status FROM examinations WHERE id = ?1",
            [id],
            |row| row.get(0),
        )
        .optional()?;
    status
        .map(|value| ExamStatus::parse(&value))
        .ok_or(AppError::NotFound("Examination"))
}

pub fn ensure_editable(exam: &ExamSummary) -> AppResult<()> {
    if exam.status == ExamStatus::Finalized {
        return Err(AppError::InvalidState(
            "This examination is finalized. Reopen it for amendment before making changes.".into(),
        ));
    }
    Ok(())
}

pub fn ensure_editable_id(conn: &Connection, id: &str) -> AppResult<()> {
    if status_of(conn, id)? == ExamStatus::Finalized {
        return Err(AppError::InvalidState(
            "This examination is finalized. Reopen it for amendment before making changes.".into(),
        ));
    }
    Ok(())
}

pub fn set_status(conn: &Connection, id: &str, status: ExamStatus) -> AppResult<()> {
    conn.execute(
        "UPDATE examinations SET status = ?2, updated_at = ?3 WHERE id = ?1",
        params![id, status.as_str(), now_rfc3339()],
    )?;
    Ok(())
}

pub fn image_count(conn: &Connection, id: &str) -> AppResult<i64> {
    Ok(conn.query_row(
        "SELECT COUNT(*) FROM images WHERE exam_id = ?1",
        [id],
        |row| row.get(0),
    )?)
}

/// Bring the status in line after images were added or removed.
pub fn refresh_after_image_change(conn: &Connection, id: &str) -> AppResult<()> {
    let status = status_of(conn, id)?;
    if status == ExamStatus::Finalized || status == ExamStatus::Analyzing {
        return Ok(());
    }
    let images = image_count(conn, id)?;
    let next = if images == 0 {
        ExamStatus::AwaitingImages
    } else if status == ExamStatus::AwaitingImages {
        ExamStatus::Ready
    } else {
        status
    };
    if next != status {
        set_status(conn, id, next)?;
    }
    Ok(())
}

/// Examinations left `analyzing` by a crash or a forced quit go back to a
/// state a person can act on.
pub fn recover_interrupted(conn: &Connection) -> AppResult<usize> {
    Ok(conn.execute(
        "UPDATE examinations
         SET status = CASE WHEN EXISTS (SELECT 1 FROM analyses a WHERE a.exam_id = examinations.id)
                           THEN 'awaiting_review' ELSE 'ready' END,
             updated_at = ?1
         WHERE status = 'analyzing'",
        [now_rfc3339()],
    )?)
}

pub fn list(conn: &Connection, query: &ExamQuery) -> AppResult<ExamPage> {
    let mut clauses: Vec<String> = Vec::new();
    let mut values: Vec<String> = Vec::new();

    if let Some(search) = query.search.as_deref() {
        for term in search.split_whitespace().take(5) {
            let term = term.trim_matches(',');
            if term.is_empty() {
                continue;
            }
            values.push(like_pattern(term));
            let n = values.len();
            clauses.push(format!(
                "(e.accession_number LIKE ?{n} ESCAPE '\\' OR e.description LIKE ?{n} ESCAPE '\\' OR p.mrn LIKE ?{n} ESCAPE '\\'
                  OR p.given_name LIKE ?{n} ESCAPE '\\' OR p.family_name LIKE ?{n} ESCAPE '\\')"
            ));
        }
    }
    match query.status.as_deref() {
        Some("open") => clauses.push("e.status != 'finalized'".into()),
        Some(status) if !status.is_empty() => {
            values.push(ExamStatus::parse(status).as_str().to_string());
            clauses.push(format!("e.status = ?{}", values.len()));
        }
        _ => {}
    }
    if let Some(patient_id) = query.patient_id.as_deref().filter(|s| !s.is_empty()) {
        values.push(patient_id.to_string());
        clauses.push(format!("e.patient_id = ?{}", values.len()));
    }
    if let Some(from) = query.date_from.as_deref().filter(|s| !s.is_empty()) {
        values.push(from.to_string());
        clauses.push(format!("e.study_date >= ?{}", values.len()));
    }
    if let Some(to) = query.date_to.as_deref().filter(|s| !s.is_empty()) {
        values.push(to.to_string());
        clauses.push(format!("e.study_date <= ?{}", values.len()));
    }
    if let Some(priority) = query.priority.as_deref().filter(|s| !s.is_empty()) {
        values.push(Priority::parse(priority).as_str().to_string());
        clauses.push(format!("e.priority = ?{}", values.len()));
    }
    match query.ai_flag.as_deref() {
        Some("positive") => clauses.push("COALESCE(r.positive, 0) > 0".into()),
        Some("flagged") => clauses.push(
            "(COALESCE(r.positive, 0) > 0 OR COALESCE(r.indeterminate, 0) > 0)".into(),
        ),
        Some("indeterminate") => clauses.push(
            "COALESCE(r.positive, 0) = 0 AND COALESCE(r.indeterminate, 0) > 0".into(),
        ),
        Some("negative") => clauses.push(
            "COALESCE(r.positive, 0) = 0 AND COALESCE(r.indeterminate, 0) = 0 AND COALESCE(r.negative, 0) > 0"
                .into(),
        ),
        Some("none") => clauses.push("COALESCE(r.analyzed, 0) = 0".into()),
        _ => {}
    }

    let filter = if clauses.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", clauses.join(" AND "))
    };
    let order = if query.order.as_deref() == Some("worklist") {
        "CASE e.priority WHEN 'stat' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
         CASE e.status WHEN 'awaiting_review' THEN 0 WHEN 'analyzing' THEN 1 WHEN 'ready' THEN 2 WHEN 'awaiting_images' THEN 3 ELSE 4 END,
         e.study_date DESC, e.created_at DESC"
    } else {
        "e.created_at DESC"
    };
    let limit = page_limit(query.limit, 50, 500);
    let offset = i64::from(query.offset.unwrap_or(0));

    let total: i64 = conn.query_row(
        &format!(
            "{AI_ROLLUP} SELECT COUNT(*) FROM examinations e JOIN patients p ON p.id = e.patient_id
             LEFT JOIN rollup r ON r.exam_id = e.id {filter}"
        ),
        rusqlite::params_from_iter(values.iter()),
        |row| row.get(0),
    )?;
    let mut statement = conn.prepare(&format!(
        "{AI_ROLLUP} {SUMMARY_SELECT} {filter} ORDER BY {order} LIMIT {limit} OFFSET {offset}"
    ))?;
    let items = statement
        .query_map(rusqlite::params_from_iter(values.iter()), read_summary)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(ExamPage { items, total })
}

pub fn worklist_stats(conn: &Connection) -> AppResult<WorklistStats> {
    let count = |status: &str| -> AppResult<i64> {
        Ok(conn.query_row(
            "SELECT COUNT(*) FROM examinations WHERE status = ?1",
            [status],
            |row| row.get(0),
        )?)
    };
    let local_midnight = Local
        .from_local_datetime(&local_today().and_hms_opt(0, 0, 0).expect("valid time"))
        .earliest()
        .map(|time| to_rfc3339(time.with_timezone(&Utc)))
        .unwrap_or_else(now_rfc3339);
    let finalized_today: i64 = conn.query_row(
        "SELECT COUNT(*) FROM examinations WHERE status = 'finalized' AND finalized_at >= ?1",
        [local_midnight],
        |row| row.get(0),
    )?;
    let flagged_open: i64 = conn.query_row(
        &format!(
            "{AI_ROLLUP} SELECT COUNT(*) FROM examinations e JOIN rollup r ON r.exam_id = e.id
             WHERE e.status != 'finalized' AND (r.positive > 0 OR r.indeterminate > 0)"
        ),
        [],
        |row| row.get(0),
    )?;
    let total_open: i64 = conn.query_row(
        "SELECT COUNT(*) FROM examinations WHERE status != 'finalized'",
        [],
        |row| row.get(0),
    )?;
    Ok(WorklistStats {
        awaiting_images: count("awaiting_images")?,
        ready: count("ready")?,
        analyzing: count("analyzing")?,
        awaiting_review: count("awaiting_review")?,
        finalized_today,
        flagged_open,
        total_open,
        patient_count: crate::patients::count(conn)?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Db;
    use crate::patients::{self, PatientInput};

    fn patient(conn: &Connection) -> String {
        crate::db::seed_user(conn, "u");
        patients::create(
            conn,
            &PatientInput {
                mrn: "MRN-9".into(),
                given_name: "Jo".into(),
                family_name: "Reyes".into(),
                sex: Sex::Male,
                birth_date: None,
                phone: None,
                notes: None,
            },
            "u",
        )
        .unwrap()
        .id
    }

    fn input() -> ExamInput {
        ExamInput {
            description: "MRI Brain without contrast".into(),
            clinical_indication: Some("Headache, rule out mass".into()),
            referring_physician: None,
            priority: Priority::Urgent,
            study_date: local_today().format("%Y-%m-%d").to_string(),
        }
    }

    #[test]
    fn accession_numbers_are_sequential() {
        let db = Db::open_in_memory().unwrap();
        db.with(|conn| {
            let patient_id = patient(conn);
            let first = create(conn, &patient_id, &input(), "u")?;
            let second = create(conn, &patient_id, &input(), "u")?;
            assert!(first.accession_number.ends_with("-001"));
            assert!(second.accession_number.ends_with("-002"));
            assert_eq!(first.status, ExamStatus::AwaitingImages);
            assert_eq!(first.image_count, 0);
            assert!(first.ai.overall.is_none());
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn rejects_future_study_dates_and_lists_by_filter() {
        let db = Db::open_in_memory().unwrap();
        db.with(|conn| {
            let patient_id = patient(conn);
            let mut future = input();
            future.study_date = "2999-01-01".into();
            assert!(create(conn, &patient_id, &future, "u").is_err());

            create(conn, &patient_id, &input(), "u")?;
            let open = list(
                conn,
                &ExamQuery {
                    status: Some("open".into()),
                    order: Some("worklist".into()),
                    ..Default::default()
                },
            )?;
            assert_eq!(open.total, 1);
            let none = list(
                conn,
                &ExamQuery {
                    ai_flag: Some("positive".into()),
                    ..Default::default()
                },
            )?;
            assert_eq!(none.total, 0);
            let stats = worklist_stats(conn)?;
            assert_eq!(stats.awaiting_images, 1);
            assert_eq!(stats.total_open, 1);
            Ok(())
        })
        .unwrap();
    }
}
