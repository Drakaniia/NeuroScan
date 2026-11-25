//! Writing exports to a location the user picks.
//!
//! The destination always comes from a native save dialog opened here, never
//! from a path supplied by the webview, so the frontend can produce export
//! content but cannot choose where on disk it lands. Files are written to a
//! temporary sibling and renamed, so a failed write never leaves a truncated
//! report behind.

use std::path::{Path, PathBuf};

use base64::engine::general_purpose::STANDARD;
use base64::Engine as _;
use serde::Deserialize;
use tauri::api::dialog::blocking::FileDialogBuilder;

use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ExportKind {
    Csv,
    Png,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportRequest {
    pub kind: ExportKind,
    pub file_name: String,
    /// UTF-8 content (CSV).
    pub text: Option<String>,
    /// Base64 content (PNG).
    pub base64: Option<String>,
    /// What is being exported, for the audit trail.
    pub description: String,
    pub exam_id: Option<String>,
    pub patient_id: Option<String>,
}

/// Windows-safe file name: reserved characters replaced, device names avoided.
pub fn sanitize_file_name(name: &str) -> String {
    let cleaned: String = name
        .chars()
        .map(|ch| {
            if ch.is_control() || matches!(ch, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*')
            {
                '_'
            } else {
                ch
            }
        })
        .collect();
    let cleaned = cleaned.trim().trim_matches('.').to_string();
    let cleaned = if cleaned.is_empty() {
        "export".to_string()
    } else {
        cleaned
    };
    let stem = cleaned.split('.').next().unwrap_or("").to_ascii_uppercase();
    let reserved = matches!(stem.as_str(), "CON" | "PRN" | "AUX" | "NUL")
        || (stem.len() == 4
            && (stem.starts_with("COM") || stem.starts_with("LPT"))
            && stem.as_bytes()[3].is_ascii_digit());
    if reserved {
        format!("_{cleaned}")
    } else {
        cleaned
    }
}

impl ExportRequest {
    pub fn bytes(&self) -> AppResult<Vec<u8>> {
        match self.kind {
            ExportKind::Csv => {
                let text = self
                    .text
                    .as_ref()
                    .ok_or_else(|| AppError::invalid("The CSV export has no content."))?;
                // UTF-8 with BOM, so spreadsheet applications detect the encoding.
                let mut bytes = Vec::with_capacity(text.len() + 3);
                if !text.starts_with('\u{feff}') {
                    bytes.extend_from_slice("\u{feff}".as_bytes());
                }
                bytes.extend_from_slice(text.as_bytes());
                Ok(bytes)
            }
            ExportKind::Png => {
                let encoded = self
                    .base64
                    .as_ref()
                    .ok_or_else(|| AppError::invalid("The image export has no content."))?;
                let encoded = encoded
                    .split_once(',')
                    .map(|(_, data)| data)
                    .unwrap_or(encoded);
                let bytes = STANDARD
                    .decode(encoded.trim())
                    .map_err(|_| AppError::invalid("The image export is not valid base64 data."))?;
                if !bytes.starts_with(&[0x89, b'P', b'N', b'G']) {
                    return Err(AppError::invalid("The image export is not a PNG file."));
                }
                Ok(bytes)
            }
        }
    }
}

/// Ask where to save; `None` when the user cancels.
pub fn choose_destination(kind: ExportKind, file_name: &str) -> Option<PathBuf> {
    let name = sanitize_file_name(file_name);
    let dialog = FileDialogBuilder::new()
        .set_title("Save export")
        .set_file_name(&name);
    let dialog = match kind {
        ExportKind::Csv => dialog.add_filter("CSV (comma-separated values)", &["csv"]),
        ExportKind::Png => dialog.add_filter("PNG image", &["png"]),
    };
    dialog.save_file()
}

pub fn write_atomically(path: &Path, bytes: &[u8]) -> AppResult<()> {
    let file_name = path
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| "export".into());
    let temporary = path.with_file_name(format!(".{file_name}.partial"));
    std::fs::write(&temporary, bytes)?;
    if let Err(error) = std::fs::rename(&temporary, path) {
        // Windows refuses to rename over an existing file in some cases.
        let _ = std::fs::remove_file(path);
        if std::fs::rename(&temporary, path).is_err() {
            let _ = std::fs::remove_file(&temporary);
            return Err(AppError::Io(error));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sanitizes_windows_names() {
        assert_eq!(sanitize_file_name("a<b>:c?.csv"), "a_b__c_.csv");
        assert_eq!(sanitize_file_name("CON.csv"), "_CON.csv");
        assert_eq!(sanitize_file_name("com1"), "_com1");
        assert_eq!(sanitize_file_name("  "), "export");
        assert_eq!(sanitize_file_name("report.csv"), "report.csv");
    }

    #[test]
    fn csv_gets_a_bom_and_png_is_checked() {
        let request = ExportRequest {
            kind: ExportKind::Csv,
            file_name: "x.csv".into(),
            text: Some("a,b".into()),
            base64: None,
            description: "test".into(),
            exam_id: None,
            patient_id: None,
        };
        assert!(request.bytes().unwrap().starts_with(&[0xEF, 0xBB, 0xBF]));

        let not_png = ExportRequest {
            kind: ExportKind::Png,
            file_name: "x.png".into(),
            text: None,
            base64: Some(STANDARD.encode(b"hello")),
            description: "test".into(),
            exam_id: None,
            patient_id: None,
        };
        assert!(not_png.bytes().is_err());
    }

    #[test]
    fn writes_atomically_over_existing_files() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("report.csv");
        std::fs::write(&path, b"old").unwrap();
        write_atomically(&path, b"new").unwrap();
        assert_eq!(std::fs::read(&path).unwrap(), b"new");
        assert!(!dir.path().join(".report.csv.partial").exists());
    }
}
