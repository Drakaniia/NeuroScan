//! Clinician review: the human conclusion, kept apart from AI output.
//!
//! A review is versioned. Saving edits the current draft; signing freezes it
//! (re-authenticated with the reviewer's password) and finalizes the
//! examination; an amendment reopens the examination with a mandatory reason
//! and starts a new draft version, leaving every signed version intact.

use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};

use crate::auth::SessionUser;
use crate::error::{AppError, AppResult};
use crate::exams::{self, ExamStatus};
use crate::util::{new_id, now_rfc3339};

const IMPRESSIONS: &[&str] = &[
    "tumor_suspected",
    "no_tumor",
    "indeterminate",
    "non_diagnostic",
];
const AGREEMENTS: &[&str] = &["agree", "disagree", "partial", "not_applicable"];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Review {
    pub id: String,
    pub exam_id: String,
    pub version: i64,
    pub status: String,
    pub impression: Option<String>,
    pub ai_agreement: Option<String>,
    pub findings: String,
    pub recommendation: String,
    pub amendment_reason: Option<String>,
    pub author_name: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub signed_at: Option<String>,
    pub signed_by_name: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewInput {
    pub impression: Option<String>,
    pub ai_agreement: Option<String>,
    pub findings: String,
    pub recommendation: String,
}

const REVIEW_COLUMNS: &str = "r.id, r.exam_id, r.version, r.status, r.impression, r.ai_agreement, r.findings, r.recommendation,
    r.amendment_reason, a.full_name, r.created_at, r.updated_at, r.signed_at, s.full_name";

fn read_review(row: &Row<'_>) -> rusqlite::Result<Review> {
    Ok(Review {
        id: row.get(0)?,
        exam_id: row.get(1)?,
        version: row.get(2)?,
        status: row.get(3)?,
        impression: row.get(4)?,
        ai_agreement: row.get(5)?,
        findings: row.get(6)?,
        recommendation: row.get(7)?,
        amendment_reason: row.get(8)?,
        author_name: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
        signed_at: row.get(12)?,
        signed_by_name: row.get(13)?,
    })
}

const REVIEW_FROM: &str =
    "FROM reviews r LEFT JOIN users a ON a.id = r.author_id LEFT JOIN users s ON s.id = r.signed_by";

pub fn current(conn: &Connection, exam_id: &str) -> AppResult<Option<Review>> {
    Ok(conn
        .query_row(
            &format!("SELECT {REVIEW_COLUMNS} {REVIEW_FROM} WHERE r.exam_id = ?1 ORDER BY r.version DESC LIMIT 1"),
            [exam_id],
            read_review,
        )
        .optional()?)
}

pub fn history(conn: &Connection, exam_id: &str) -> AppResult<Vec<Review>> {
    let mut statement = conn.prepare(&format!(
        "SELECT {REVIEW_COLUMNS} {REVIEW_FROM} WHERE r.exam_id = ?1 ORDER BY r.version DESC"
    ))?;
    let reviews = statement
        .query_map([exam_id], read_review)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(reviews)
}

struct CleanReview {
    impression: Option<String>,
    ai_agreement: Option<String>,
    findings: String,
    recommendation: String,
}

fn clean(input: &ReviewInput) -> AppResult<CleanReview> {
    let impression = input
        .impression
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string);
    if let Some(value) = &impression {
        if !IMPRESSIONS.contains(&value.as_str()) {
            return Err(AppError::validation(
                "impression",
                "Choose a valid impression.",
            ));
        }
    }
    let ai_agreement = input
        .ai_agreement
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string);
    if let Some(value) = &ai_agreement {
        if !AGREEMENTS.contains(&value.as_str()) {
            return Err(AppError::validation(
                "aiAgreement",
                "Choose a valid AI concordance option.",
            ));
        }
    }
    let findings = input.findings.trim().to_string();
    if findings.chars().count() > 5000 {
        return Err(AppError::validation(
            "findings",
            "Findings must be 5,000 characters or fewer.",
        ));
    }
    let recommendation = input.recommendation.trim().to_string();
    if recommendation.chars().count() > 2000 {
        return Err(AppError::validation(
            "recommendation",
            "Recommendation must be 2,000 characters or fewer.",
        ));
    }
    Ok(CleanReview {
        impression,
        ai_agreement,
        findings,
        recommendation,
    })
}

fn completed_ai_results(conn: &Connection, exam_id: &str) -> AppResult<i64> {
    Ok(conn.query_row(
        "SELECT COUNT(*) FROM analyses WHERE exam_id = ?1 AND status = 'completed'",
        [exam_id],
        |row| row.get(0),
    )?)
}

/// Write the draft (creating version 1, or the next version after a signed one).
fn upsert_draft(
    conn: &Connection,
    exam_id: &str,
    review: &CleanReview,
    user: &SessionUser,
) -> AppResult<String> {
    let now = now_rfc3339();
    match current(conn, exam_id)? {
        Some(existing) if existing.status == "draft" => {
            conn.execute(
                "UPDATE reviews SET impression = ?2, ai_agreement = ?3, findings = ?4, recommendation = ?5, updated_at = ?6
                 WHERE id = ?1",
                params![
                    existing.id,
                    review.impression,
                    review.ai_agreement,
                    review.findings,
                    review.recommendation,
                    now
                ],
            )?;
            Ok(existing.id)
        }
        existing => {
            let version = existing.map(|review| review.version + 1).unwrap_or(1);
            let id = new_id();
            conn.execute(
                "INSERT INTO reviews (id, exam_id, version, status, impression, ai_agreement, findings, recommendation,
                                      author_id, created_at, updated_at)
                 VALUES (?1, ?2, ?3, 'draft', ?4, ?5, ?6, ?7, ?8, ?9, ?9)",
                params![
                    id,
                    exam_id,
                    version,
                    review.impression,
                    review.ai_agreement,
                    review.findings,
                    review.recommendation,
                    user.id,
                    now
                ],
            )?;
            Ok(id)
        }
    }
}

pub fn save_draft(
    conn: &Connection,
    exam_id: &str,
    input: &ReviewInput,
    user: &SessionUser,
) -> AppResult<Review> {
    exams::ensure_editable_id(conn, exam_id)?;
    let review = clean(input)?;
    upsert_draft(conn, exam_id, &review, user)?;
    current(conn, exam_id)?.ok_or(AppError::NotFound("Review"))
}

/// Sign the review and finalize the examination. The caller has already
/// re-verified the reviewer's password.
pub fn sign(
    conn: &Connection,
    exam_id: &str,
    input: &ReviewInput,
    user: &SessionUser,
) -> AppResult<Review> {
    exams::ensure_editable_id(conn, exam_id)?;
    if exams::image_count(conn, exam_id)? == 0 {
        return Err(AppError::InvalidState(
            "An examination without images cannot be signed.".into(),
        ));
    }
    if exams::status_of(conn, exam_id)? == ExamStatus::Analyzing {
        return Err(AppError::InvalidState(
            "AI analysis is still running for this examination. Wait for it to finish or cancel it before signing."
                .into(),
        ));
    }
    let mut review = clean(input)?;
    if review.impression.is_none() {
        return Err(AppError::validation(
            "impression",
            "Select an impression before signing.",
        ));
    }
    if review.findings.is_empty() {
        return Err(AppError::validation(
            "findings",
            "Document your findings before signing.",
        ));
    }
    let has_ai = completed_ai_results(conn, exam_id)? > 0;
    match (&review.ai_agreement, has_ai) {
        (None, true) => {
            return Err(AppError::validation(
                "aiAgreement",
                "Record whether you agree with the AI result before signing.",
            ))
        }
        (Some(value), true) if value == "not_applicable" => {
            return Err(AppError::validation(
                "aiAgreement",
                "AI results exist for this examination; record agreement, partial agreement or disagreement.",
            ))
        }
        (_, false) => review.ai_agreement = Some("not_applicable".into()),
        _ => {}
    }

    let id = upsert_draft(conn, exam_id, &review, user)?;
    let now = now_rfc3339();
    conn.execute(
        "UPDATE reviews SET status = 'signed', signed_at = ?2, signed_by = ?3, updated_at = ?2 WHERE id = ?1",
        params![id, now, user.id],
    )?;
    conn.execute(
        "UPDATE examinations SET status = 'finalized', finalized_at = ?2, finalized_by = ?3, updated_at = ?2 WHERE id = ?1",
        params![exam_id, now, user.id],
    )?;
    current(conn, exam_id)?.ok_or(AppError::NotFound("Review"))
}

/// Reopen a finalized examination for amendment.
pub fn amend(
    conn: &Connection,
    exam_id: &str,
    reason: &str,
    user: &SessionUser,
) -> AppResult<Review> {
    if exams::status_of(conn, exam_id)? != ExamStatus::Finalized {
        return Err(AppError::InvalidState(
            "Only a finalized examination can be amended.".into(),
        ));
    }
    let reason = reason.trim();
    if reason.chars().count() < 5 {
        return Err(AppError::validation(
            "reason",
            "Describe why the signed report is being amended (at least 5 characters).",
        ));
    }
    if reason.chars().count() > 500 {
        return Err(AppError::validation(
            "reason",
            "The reason must be 500 characters or fewer.",
        ));
    }
    let signed = current(conn, exam_id)?.ok_or(AppError::NotFound("Signed review"))?;
    let now = now_rfc3339();
    conn.execute(
        "INSERT INTO reviews (id, exam_id, version, status, impression, ai_agreement, findings, recommendation,
                              amendment_reason, author_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, 'draft', ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10)",
        params![
            new_id(),
            exam_id,
            signed.version + 1,
            signed.impression,
            signed.ai_agreement,
            signed.findings,
            signed.recommendation,
            reason,
            user.id,
            now
        ],
    )?;
    conn.execute(
        "UPDATE examinations SET status = 'awaiting_review', finalized_at = NULL, finalized_by = NULL, updated_at = ?2
         WHERE id = ?1",
        params![exam_id, now],
    )?;
    current(conn, exam_id)?.ok_or(AppError::NotFound("Review"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::Role;
    use crate::db::Db;
    use crate::exams::{ExamInput, Priority};
    use crate::patients::{PatientInput, Sex};

    fn radiologist() -> SessionUser {
        SessionUser {
            id: "rad-1".into(),
            username: "rad".into(),
            full_name: "Dr. Rad".into(),
            role: Role::Radiologist,
            must_change_password: false,
        }
    }

    fn exam_with_image(conn: &Connection) -> String {
        conn.execute(
            "INSERT INTO users (id, username, full_name, role, password_hash, created_at, updated_at)
             VALUES ('rad-1', 'rad', 'Dr. Rad', 'radiologist', 'x', 'now', 'now')",
            [],
        )
        .unwrap();
        let patient = crate::patients::create(
            conn,
            &PatientInput {
                mrn: "R-1".into(),
                given_name: "Lea".into(),
                family_name: "Tan".into(),
                sex: Sex::Female,
                birth_date: None,
                phone: None,
                notes: None,
            },
            "rad-1",
        )
        .unwrap();
        let exam = exams::create(
            conn,
            &patient.id,
            &ExamInput {
                description: "MRI Brain".into(),
                clinical_indication: None,
                referring_physician: None,
                priority: Priority::Routine,
                study_date: crate::util::local_today().format("%Y-%m-%d").to_string(),
            },
            "rad-1",
        )
        .unwrap();
        conn.execute(
            "INSERT INTO images (id, exam_id, seq, original_name, stored_file, format, sha256, file_size, width, height,
                                 window_center, window_width, value_min, value_max, imported_at)
             VALUES ('img', ?1, 1, 'a.png', 'images/a.png', 'png', 'h', 1, 64, 64, 127.5, 255, 0, 255, 'now')",
            [&exam.id],
        )
        .unwrap();
        exams::refresh_after_image_change(conn, &exam.id).unwrap();
        exam.id
    }

    fn input(impression: Option<&str>, findings: &str) -> ReviewInput {
        ReviewInput {
            impression: impression.map(str::to_string),
            ai_agreement: None,
            findings: findings.into(),
            recommendation: String::new(),
        }
    }

    #[test]
    fn draft_sign_amend_cycle() {
        let db = Db::open_in_memory().unwrap();
        db.with(|conn| {
            let exam_id = exam_with_image(conn);
            let user = radiologist();

            let draft = save_draft(conn, &exam_id, &input(None, "Partial notes"), &user)?;
            assert_eq!((draft.version, draft.status.as_str()), (1, "draft"));

            assert!(sign(conn, &exam_id, &input(None, "x"), &user).is_err());
            assert!(sign(conn, &exam_id, &input(Some("no_tumor"), "  "), &user).is_err());

            let signed = sign(
                conn,
                &exam_id,
                &input(Some("no_tumor"), "No intracranial mass identified."),
                &user,
            )?;
            assert_eq!(signed.status, "signed");
            // Without AI results, concordance is recorded as not applicable.
            assert_eq!(signed.ai_agreement.as_deref(), Some("not_applicable"));
            assert_eq!(exams::status_of(conn, &exam_id)?, ExamStatus::Finalized);

            assert!(save_draft(conn, &exam_id, &input(None, "late edit"), &user).is_err());
            assert!(amend(conn, &exam_id, "no", &user).is_err());

            let amended = amend(conn, &exam_id, "Corrected laterality in findings", &user)?;
            assert_eq!((amended.version, amended.status.as_str()), (2, "draft"));
            assert_eq!(amended.findings, "No intracranial mass identified.");
            assert_eq!(
                exams::status_of(conn, &exam_id)?,
                ExamStatus::AwaitingReview
            );
            assert_eq!(history(conn, &exam_id)?.len(), 2);
            Ok(())
        })
        .unwrap();
    }

    #[test]
    fn signing_requires_concordance_when_ai_ran() {
        let db = Db::open_in_memory().unwrap();
        db.with(|conn| {
            let exam_id = exam_with_image(conn);
            conn.execute(
                "INSERT INTO analyses (id, image_id, exam_id, status, model_id, model_name, model_version, probability, verdict, created_at)
                 VALUES ('a1', 'img', ?1, 'completed', 'm', 'M', '1', 0.9, 'positive', 'now')",
                [&exam_id],
            )?;
            let user = radiologist();
            let mut review = input(Some("tumor_suspected"), "Enhancing lesion, left frontal lobe.");
            assert!(sign(conn, &exam_id, &review, &user).is_err());
            review.ai_agreement = Some("not_applicable".into());
            assert!(sign(conn, &exam_id, &review, &user).is_err());
            review.ai_agreement = Some("agree".into());
            assert!(sign(conn, &exam_id, &review, &user).is_ok());
            Ok(())
        })
        .unwrap();
    }
}
