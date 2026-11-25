//! Medical images attached to examinations.
//!
//! Imported files are copied into the workstation's data directory, so an
//! examination never depends on a USB stick or a network share staying
//! available. One database row is one viewable 2D image: a multi-frame DICOM
//! file becomes one row per frame, all pointing at the same stored file.

pub mod decode;
pub mod import;

use std::path::{Path, PathBuf};

use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::Serialize;
use serde_json::Value;

use crate::analysis::{self, AnalysisRecord};
use crate::error::{AppError, AppResult};
use decode::ImageFormat;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImageItem {
    pub id: String,
    pub exam_id: String,
    pub seq: i64,
    pub original_name: String,
    pub format: String,
    pub frame_index: i64,
    pub frame_count: i64,
    pub width: i64,
    pub height: i64,
    pub bits_stored: Option<i64>,
    pub is_color: bool,
    pub window_center: f64,
    pub window_width: f64,
    pub value_min: f64,
    pub value_max: f64,
    pub invert: bool,
    pub metadata: Value,
    pub warnings: Vec<String>,
    pub sha256: String,
    pub file_size: i64,
    pub imported_at: String,
    pub imported_by_name: Option<String>,
    /// The stored copy is gone (deleted or moved outside the app).
    pub file_missing: bool,
    pub latest_analysis: Option<AnalysisRecord>,
}

/// Everything needed to read pixels for one image.
#[derive(Clone, Debug)]
pub struct ImageLocation {
    pub id: String,
    pub exam_id: String,
    pub path: PathBuf,
    pub format: ImageFormat,
    pub frame_index: u32,
    pub window_center: f64,
    pub window_width: f64,
    pub invert: bool,
    pub width: u32,
    pub height: u32,
    pub original_name: String,
    pub sha256: String,
}

pub fn images_dir(data_dir: &Path) -> PathBuf {
    data_dir.join("images")
}

pub fn thumbnails_dir(data_dir: &Path) -> PathBuf {
    data_dir.join("thumbnails")
}

pub fn thumbnail_path(data_dir: &Path, image_id: &str) -> PathBuf {
    thumbnails_dir(data_dir).join(format!("{image_id}.png"))
}

const ITEM_COLUMNS: &str = "i.id, i.exam_id, i.seq, i.original_name, i.format, i.frame_index,
    (SELECT COUNT(*) FROM images s WHERE s.exam_id = i.exam_id AND s.stored_file = i.stored_file),
    i.width, i.height, i.bits_stored, i.is_color, i.window_center, i.window_width, i.value_min, i.value_max,
    i.invert, i.metadata, i.warnings, i.sha256, i.file_size, i.imported_at, u.full_name, i.stored_file";

fn read_item(row: &Row<'_>, data_dir: &Path) -> rusqlite::Result<ImageItem> {
    let metadata: String = row.get(16)?;
    let warnings: String = row.get(17)?;
    let stored_file: String = row.get(22)?;
    Ok(ImageItem {
        id: row.get(0)?,
        exam_id: row.get(1)?,
        seq: row.get(2)?,
        original_name: row.get(3)?,
        format: row.get(4)?,
        frame_index: row.get(5)?,
        frame_count: row.get(6)?,
        width: row.get(7)?,
        height: row.get(8)?,
        bits_stored: row.get(9)?,
        is_color: row.get::<_, i64>(10)? != 0,
        window_center: row.get(11)?,
        window_width: row.get(12)?,
        value_min: row.get(13)?,
        value_max: row.get(14)?,
        invert: row.get::<_, i64>(15)? != 0,
        metadata: serde_json::from_str(&metadata).unwrap_or(Value::Null),
        warnings: serde_json::from_str(&warnings).unwrap_or_default(),
        sha256: row.get(18)?,
        file_size: row.get(19)?,
        imported_at: row.get(20)?,
        imported_by_name: row.get(21)?,
        file_missing: !data_dir.join(&stored_file).is_file(),
        latest_analysis: None,
    })
}

pub fn list_for_exam(
    conn: &Connection,
    data_dir: &Path,
    exam_id: &str,
) -> AppResult<Vec<ImageItem>> {
    let mut statement = conn.prepare(&format!(
        "SELECT {ITEM_COLUMNS} FROM images i LEFT JOIN users u ON u.id = i.imported_by
         WHERE i.exam_id = ?1 ORDER BY i.seq"
    ))?;
    let mut items = statement
        .query_map([exam_id], |row| read_item(row, data_dir))?
        .collect::<Result<Vec<_>, _>>()?;
    let mut latest = analysis::latest_for_exam(conn, exam_id)?;
    for item in &mut items {
        item.latest_analysis = latest.remove(&item.id);
    }
    Ok(items)
}

pub fn locate(conn: &Connection, data_dir: &Path, image_id: &str) -> AppResult<ImageLocation> {
    let row = conn
        .query_row(
            "SELECT id, exam_id, stored_file, format, frame_index, window_center, window_width, invert, width, height,
                    original_name, sha256
             FROM images WHERE id = ?1",
            [image_id],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, i64>(4)?,
                    row.get::<_, f64>(5)?,
                    row.get::<_, f64>(6)?,
                    row.get::<_, i64>(7)?,
                    row.get::<_, i64>(8)?,
                    row.get::<_, i64>(9)?,
                    row.get::<_, String>(10)?,
                    row.get::<_, String>(11)?,
                ))
            },
        )
        .optional()?
        .ok_or(AppError::NotFound("Image"))?;
    let format = ImageFormat::parse(&row.3)
        .ok_or_else(|| AppError::internal(format!("Unknown stored format '{}'.", row.3)))?;
    Ok(ImageLocation {
        id: row.0,
        exam_id: row.1,
        path: data_dir.join(row.2),
        format,
        frame_index: row.4.max(0) as u32,
        window_center: row.5,
        window_width: row.6,
        invert: row.7 != 0,
        width: row.8.max(0) as u32,
        height: row.9.max(0) as u32,
        original_name: row.10,
        sha256: row.11,
    })
}

pub fn exam_image_ids(conn: &Connection, exam_id: &str) -> AppResult<Vec<String>> {
    let mut statement = conn.prepare("SELECT id FROM images WHERE exam_id = ?1 ORDER BY seq")?;
    let ids = statement
        .query_map([exam_id], |row| row.get::<_, String>(0))?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(ids)
}

/// What a removal took away, for the audit trail.
#[derive(Debug)]
pub struct RemovedImage {
    pub exam_id: String,
    pub original_name: String,
    pub sha256: String,
    pub frame_index: i64,
    pub analyses_removed: i64,
}

/// Remove one image (and its AI results) from a non-finalized examination.
/// The stored file is deleted once no other row references it.
pub fn remove(conn: &Connection, data_dir: &Path, image_id: &str) -> AppResult<RemovedImage> {
    let (exam_id, stored_file, original_name, sha256, frame_index): (String, String, String, String, i64) = conn
        .query_row(
            "SELECT exam_id, stored_file, original_name, sha256, frame_index FROM images WHERE id = ?1",
            [image_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)),
        )
        .optional()?
        .ok_or(AppError::NotFound("Image"))?;
    crate::exams::ensure_editable_id(conn, &exam_id)?;

    let analyses_removed =
        conn.execute("DELETE FROM analyses WHERE image_id = ?1", [image_id])? as i64;
    conn.execute("DELETE FROM images WHERE id = ?1", [image_id])?;
    let still_referenced: i64 = conn.query_row(
        "SELECT COUNT(*) FROM images WHERE stored_file = ?1",
        [&stored_file],
        |row| row.get(0),
    )?;
    if still_referenced == 0 {
        let _ = std::fs::remove_file(data_dir.join(&stored_file));
    }
    let _ = std::fs::remove_file(thumbnail_path(data_dir, image_id));
    crate::exams::refresh_after_image_change(conn, &exam_id)?;
    Ok(RemovedImage {
        exam_id,
        original_name,
        sha256,
        frame_index,
        analyses_removed,
    })
}

/// Total bytes held in managed image storage.
pub fn storage_bytes(data_dir: &Path) -> u64 {
    fn walk(path: &Path) -> u64 {
        let Ok(entries) = std::fs::read_dir(path) else {
            return 0;
        };
        entries
            .flatten()
            .map(|entry| {
                let path = entry.path();
                if path.is_dir() {
                    walk(&path)
                } else {
                    entry.metadata().map(|meta| meta.len()).unwrap_or(0)
                }
            })
            .sum()
    }
    walk(&images_dir(data_dir)) + walk(&thumbnails_dir(data_dir))
}

pub(crate) fn insert_row(
    conn: &Connection,
    row: &import::PendingImage,
    exam_id: &str,
    seq: i64,
    user_id: &str,
    imported_at: &str,
) -> AppResult<()> {
    conn.execute(
        "INSERT INTO images (id, exam_id, seq, original_name, stored_file, frame_index, format, sha256, file_size, width, height,
                             bits_stored, is_color, window_center, window_width, value_min, value_max, invert, metadata,
                             warnings, imported_at, imported_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22)",
        params![
            row.id,
            exam_id,
            seq,
            row.original_name,
            row.stored_file,
            row.frame.frame_index,
            row.format.as_str(),
            row.sha256,
            row.file_size as i64,
            row.frame.width,
            row.frame.height,
            row.frame.bits_stored.map(i64::from),
            row.frame.is_color as i64,
            row.frame.window_center,
            row.frame.window_width,
            row.frame.value_min,
            row.frame.value_max,
            row.frame.invert as i64,
            serde_json::to_string(&row.metadata)?,
            serde_json::to_string(&row.warnings)?,
            imported_at,
            user_id
        ],
    )?;
    Ok(())
}
