//! Small shared helpers: identifiers, timestamps, hashing, input cleanup.

use chrono::{DateTime, Local, NaiveDate, SecondsFormat, Utc};
use sha2::{Digest, Sha256};

use crate::error::{AppError, AppResult};

/// A new random identifier for any record.
pub fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

/// Current instant as an RFC 3339 UTC string with millisecond precision.
/// Stored timestamps are always UTC; the frontend renders local time.
pub fn now_rfc3339() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

pub fn to_rfc3339(time: DateTime<Utc>) -> String {
    time.to_rfc3339_opts(SecondsFormat::Millis, true)
}

pub fn parse_rfc3339(value: &str) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(value)
        .ok()
        .map(|time| time.with_timezone(&Utc))
}

/// Today's date on the workstation's clock, `YYYY-MM-DD`.
pub fn local_today() -> NaiveDate {
    Local::now().date_naive()
}

/// Strict `YYYY-MM-DD` parsing.
pub fn parse_date(value: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(value, "%Y-%m-%d").ok()
}

pub fn sha256_hex(bytes: &[u8]) -> String {
    hex(&Sha256::digest(bytes))
}

pub fn hex(bytes: &[u8]) -> String {
    const DIGITS: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push(DIGITS[(byte >> 4) as usize] as char);
        out.push(DIGITS[(byte & 0x0f) as usize] as char);
    }
    out
}

/// Trim a free-text field and collapse it to `None` when empty.
pub fn clean_optional(value: Option<String>) -> Option<String> {
    value
        .map(|text| text.trim().to_string())
        .filter(|text| !text.is_empty())
}

/// Trim a required text field, rejecting empty values and enforcing a length cap.
pub fn clean_required(field: &str, label: &str, value: &str, max: usize) -> AppResult<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(AppError::validation(field, format!("{label} is required.")));
    }
    if trimmed.chars().count() > max {
        return Err(AppError::validation(
            field,
            format!("{label} must be {max} characters or fewer."),
        ));
    }
    Ok(trimmed.to_string())
}

/// Length cap for optional text.
pub fn check_max(field: &str, label: &str, value: &Option<String>, max: usize) -> AppResult<()> {
    if let Some(text) = value {
        if text.chars().count() > max {
            return Err(AppError::validation(
                field,
                format!("{label} must be {max} characters or fewer."),
            ));
        }
    }
    Ok(())
}

/// Escape a user-supplied search term for a SQL `LIKE … ESCAPE '\'` pattern.
pub fn like_pattern(term: &str) -> String {
    let mut escaped = String::with_capacity(term.len() + 2);
    escaped.push('%');
    for ch in term.chars() {
        if matches!(ch, '%' | '_' | '\\') {
            escaped.push('\\');
        }
        escaped.push(ch);
    }
    escaped.push('%');
    escaped
}

/// Clamp a page size coming from the UI.
pub fn page_limit(limit: Option<u32>, default: u32, max: u32) -> i64 {
    i64::from(limit.unwrap_or(default).clamp(1, max))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hex_encodes_bytes() {
        assert_eq!(hex(&[0x00, 0xab, 0xff]), "00abff");
        assert_eq!(
            sha256_hex(b"abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }

    #[test]
    fn like_pattern_escapes_wildcards() {
        assert_eq!(like_pattern("50%_a\\b"), "%50\\%\\_a\\\\b%");
    }

    #[test]
    fn required_fields_are_trimmed_and_capped() {
        assert_eq!(clean_required("x", "Name", "  Ada ", 10).unwrap(), "Ada");
        assert!(clean_required("x", "Name", "   ", 10).is_err());
        assert!(clean_required("x", "Name", "abcdefghijk", 10).is_err());
    }

    #[test]
    fn dates_are_strict() {
        assert!(parse_date("2026-02-28").is_some());
        assert!(parse_date("2026-02-30").is_none());
        assert!(parse_date("28/02/2026").is_none());
    }
}
