//! Import pipeline: files or folders → validated, stored, ordered images.
//!
//! Per file: size cap → content sniffing → SHA-256 → duplicate check →
//! private copy → full decode and validation → thumbnails. A file that fails
//! any step is reported with its reason and the import continues; database
//! rows for the accepted files are written in one transaction.

use std::cmp::Ordering;
use std::collections::HashSet;
use std::path::{Path, PathBuf};

use serde::Serialize;
use serde_json::{json, Map, Value};

use super::decode::{self, FrameProbe, ImageFormat};
use super::{images_dir, thumbnail_path, thumbnails_dir};
use crate::audit::{self, Actor};
use crate::auth::SessionUser;
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::util::{new_id, now_rfc3339, sha256_hex};

pub const MAX_FILES_PER_IMPORT: usize = 2000;
pub const MAX_RASTER_BYTES: u64 = 64 * 1024 * 1024;
pub const MAX_DICOM_BYTES: u64 = 512 * 1024 * 1024;

const SCANNABLE_EXTENSIONS: &[&str] = &["png", "jpg", "jpeg", "dcm", "dicom", "ima"];
const SKIPPED_NAMES: &[&str] = &["dicomdir", "thumbs.db", "desktop.ini", ".ds_store"];
const SKIPPED_DIRS: &[&str] = &["$recycle.bin", "system volume information"];

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ImportStatus {
    Imported,
    Duplicate,
    Rejected,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportOutcome {
    pub file_name: String,
    pub status: ImportStatus,
    pub message: Option<String>,
    pub frames: u32,
    pub warnings: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportSummary {
    pub exam_id: String,
    pub imported_files: usize,
    pub imported_images: usize,
    pub duplicates: usize,
    pub rejected: usize,
    /// Files in scanned folders that were not images (skipped silently).
    pub skipped: usize,
    pub outcomes: Vec<ImportOutcome>,
    pub image_ids: Vec<String>,
}

/// One image row waiting to be inserted.
pub struct PendingImage {
    pub id: String,
    pub original_name: String,
    pub stored_file: String,
    pub format: ImageFormat,
    pub sha256: String,
    pub file_size: u64,
    pub frame: FrameProbe,
    pub metadata: Map<String, Value>,
    pub warnings: Vec<String>,
    series_number: Option<i64>,
    instance_number: Option<i64>,
    slice_location: Option<f64>,
}

fn is_skipped_dir(name: &str) -> bool {
    name.starts_with('.') || SKIPPED_DIRS.contains(&name.to_ascii_lowercase().as_str())
}

fn is_scannable_file(path: &Path) -> bool {
    let name = path
        .file_name()
        .map(|name| name.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    if name.starts_with('.') || SKIPPED_NAMES.contains(&name.as_str()) {
        return false;
    }
    match path.extension() {
        // DICOM files are often extensionless; content sniffing decides.
        None => true,
        Some(extension) => SCANNABLE_EXTENSIONS
            .contains(&extension.to_string_lossy().to_ascii_lowercase().as_str()),
    }
}

/// Expand folders (recursively) into candidate files. Explicitly chosen files
/// are always attempted; files found inside folders are filtered by name.
pub fn collect_candidates(paths: &[PathBuf]) -> AppResult<(Vec<PathBuf>, usize)> {
    fn walk(dir: &Path, out: &mut Vec<PathBuf>, skipped: &mut usize, depth: usize) {
        if depth > 16 {
            return;
        }
        let Ok(entries) = std::fs::read_dir(dir) else {
            return;
        };
        let mut entries: Vec<_> = entries.flatten().map(|entry| entry.path()).collect();
        entries.sort();
        for path in entries {
            let name = path
                .file_name()
                .map(|name| name.to_string_lossy().to_string())
                .unwrap_or_default();
            if path.is_dir() {
                if !is_skipped_dir(&name) {
                    walk(&path, out, skipped, depth + 1);
                }
            } else if is_scannable_file(&path) {
                out.push(path);
            } else {
                *skipped += 1;
            }
        }
    }

    let mut files = Vec::new();
    let mut skipped = 0;
    for path in paths {
        if path.is_dir() {
            walk(path, &mut files, &mut skipped, 0);
        } else {
            files.push(path.clone());
        }
        if files.len() > MAX_FILES_PER_IMPORT {
            return Err(AppError::invalid(format!(
                "Import at most {MAX_FILES_PER_IMPORT} files at a time. Select a smaller folder."
            )));
        }
    }
    Ok((files, skipped))
}

/// Natural ordering: `slice2` before `slice10`.
pub fn natural_cmp(a: &str, b: &str) -> Ordering {
    fn chunks(text: &str) -> Vec<(bool, String)> {
        let mut out: Vec<(bool, String)> = Vec::new();
        for ch in text.chars() {
            let digit = ch.is_ascii_digit();
            match out.last_mut() {
                Some((is_digit, chunk)) if *is_digit == digit => chunk.push(ch),
                _ => out.push((digit, ch.to_string())),
            }
        }
        out
    }
    let (left, right) = (chunks(&a.to_lowercase()), chunks(&b.to_lowercase()));
    for ((left_digit, left_text), (right_digit, right_text)) in left.iter().zip(right.iter()) {
        let ordering = if *left_digit && *right_digit {
            let left_value = left_text.trim_start_matches('0');
            let right_value = right_text.trim_start_matches('0');
            left_value
                .len()
                .cmp(&right_value.len())
                .then_with(|| left_value.cmp(right_value))
        } else {
            left_text.cmp(right_text)
        };
        if ordering != Ordering::Equal {
            return ordering;
        }
    }
    left.len().cmp(&right.len())
}

fn pending_order(a: &PendingImage, b: &PendingImage) -> Ordering {
    let has_position =
        |image: &PendingImage| image.instance_number.is_some() || image.slice_location.is_some();
    match (has_position(a), has_position(b)) {
        (true, false) => return Ordering::Less,
        (false, true) => return Ordering::Greater,
        _ => {}
    }
    a.series_number
        .unwrap_or(i64::MAX)
        .cmp(&b.series_number.unwrap_or(i64::MAX))
        .then_with(|| {
            a.instance_number
                .unwrap_or(i64::MAX)
                .cmp(&b.instance_number.unwrap_or(i64::MAX))
        })
        .then_with(|| {
            a.slice_location
                .unwrap_or(f64::MAX)
                .partial_cmp(&b.slice_location.unwrap_or(f64::MAX))
                .unwrap_or(Ordering::Equal)
        })
        .then_with(|| natural_cmp(&a.original_name, &b.original_name))
        .then_with(|| a.frame.frame_index.cmp(&b.frame.frame_index))
}

struct ProcessedFile {
    outcome: ImportOutcome,
    pending: Vec<PendingImage>,
    stored_path: Option<PathBuf>,
}

fn reject(file_name: String, message: impl Into<String>) -> ProcessedFile {
    ProcessedFile {
        outcome: ImportOutcome {
            file_name,
            status: ImportStatus::Rejected,
            message: Some(message.into()),
            frames: 0,
            warnings: Vec::new(),
        },
        pending: Vec::new(),
        stored_path: None,
    }
}

fn process_file(
    data_dir: &Path,
    exam_id: &str,
    path: &Path,
    expected_mrn: &str,
    known_hashes: &mut HashSet<String>,
) -> ProcessedFile {
    let file_name = path
        .file_name()
        .map(|name| name.to_string_lossy().to_string())
        .unwrap_or_else(|| path.display().to_string());

    let size = match std::fs::metadata(path) {
        Ok(meta) if meta.is_file() => meta.len(),
        Ok(_) => return reject(file_name, "Not a regular file."),
        Err(error) => return reject(file_name, format!("The file could not be opened: {error}")),
    };
    if size == 0 {
        return reject(file_name, "The file is empty (0 bytes).");
    }
    if size > MAX_DICOM_BYTES {
        return reject(file_name, "The file is larger than the 512 MB limit.");
    }
    let bytes = match std::fs::read(path) {
        Ok(bytes) => bytes,
        Err(error) => return reject(file_name, format!("The file could not be read: {error}")),
    };
    let Some(format) = decode::sniff(&bytes) else {
        return reject(
            file_name,
            "Unsupported file type. NeuroScan accepts PNG, JPEG and DICOM (Part 10) images.",
        );
    };
    if format != ImageFormat::Dicom && size > MAX_RASTER_BYTES {
        return reject(file_name, "PNG and JPEG files must be 64 MB or smaller.");
    }

    let sha256 = sha256_hex(&bytes);
    if !known_hashes.insert(sha256.clone()) {
        return ProcessedFile {
            outcome: ImportOutcome {
                file_name,
                status: ImportStatus::Duplicate,
                message: Some("This exact file is already part of the examination.".into()),
                frames: 0,
                warnings: Vec::new(),
            },
            pending: Vec::new(),
            stored_path: None,
        };
    }

    let relative = format!("images/{exam_id}/{}.{}", new_id(), format.extension());
    let stored_path = data_dir.join(&relative);
    if let Some(parent) = stored_path.parent() {
        if let Err(error) = std::fs::create_dir_all(parent) {
            known_hashes.remove(&sha256);
            return reject(file_name, format!("Image storage is not writable: {error}"));
        }
    }
    if let Err(error) = std::fs::write(&stored_path, &bytes) {
        known_hashes.remove(&sha256);
        return reject(file_name, format!("The image could not be stored: {error}"));
    }

    let probed = match decode::probe(&stored_path, &bytes, format, Some(expected_mrn)) {
        Ok(probed) => probed,
        Err(error) => {
            let _ = std::fs::remove_file(&stored_path);
            known_hashes.remove(&sha256);
            return reject(file_name, error.to_string());
        }
    };

    let mut pending = Vec::with_capacity(probed.frames.len());
    let mut thumbnail_failure = None;
    for frame in probed.frames {
        let id = new_id();
        if let Err(error) = std::fs::write(thumbnail_path(data_dir, &id), &frame.thumbnail_png) {
            thumbnail_failure = Some(error.to_string());
        }
        pending.push(PendingImage {
            id,
            original_name: file_name.clone(),
            stored_file: relative.clone(),
            format,
            sha256: sha256.clone(),
            file_size: size,
            frame: FrameProbe {
                thumbnail_png: Vec::new(),
                ..frame
            },
            metadata: probed.metadata.clone(),
            warnings: probed.warnings.clone(),
            series_number: probed.series_number,
            instance_number: probed.instance_number,
            slice_location: probed.slice_location,
        });
    }
    if let Some(error) = thumbnail_failure {
        for image in &pending {
            let _ = std::fs::remove_file(thumbnail_path(data_dir, &image.id));
        }
        let _ = std::fs::remove_file(&stored_path);
        known_hashes.remove(&sha256);
        return reject(
            file_name,
            format!("Thumbnails could not be written: {error}"),
        );
    }

    ProcessedFile {
        outcome: ImportOutcome {
            file_name,
            status: ImportStatus::Imported,
            message: None,
            frames: pending.len() as u32,
            warnings: probed.warnings,
        },
        pending,
        stored_path: Some(stored_path),
    }
}

/// Import files and folders into an examination.
pub fn import(
    db: &Db,
    data_dir: &Path,
    exam_id: &str,
    paths: &[PathBuf],
    user: &SessionUser,
) -> AppResult<ImportSummary> {
    if paths.is_empty() {
        return Err(AppError::invalid(
            "Select at least one file or folder to import.",
        ));
    }
    let (mrn, mut known_hashes) = db.with(|conn| {
        let exam = crate::exams::get(conn, exam_id)?;
        crate::exams::ensure_editable(&exam)?;
        let mut statement =
            conn.prepare("SELECT DISTINCT sha256 FROM images WHERE exam_id = ?1")?;
        let hashes = statement
            .query_map([exam_id], |row| row.get::<_, String>(0))?
            .collect::<Result<HashSet<_>, _>>()?;
        Ok((exam.patient.mrn, hashes))
    })?;

    let (files, skipped) = collect_candidates(paths)?;
    std::fs::create_dir_all(images_dir(data_dir))?;
    std::fs::create_dir_all(thumbnails_dir(data_dir))?;

    let mut outcomes = Vec::with_capacity(files.len());
    let mut pending = Vec::new();
    let mut stored_paths = Vec::new();
    for file in &files {
        let processed = process_file(data_dir, exam_id, file, &mrn, &mut known_hashes);
        outcomes.push(processed.outcome);
        pending.extend(processed.pending);
        stored_paths.extend(processed.stored_path);
    }
    pending.sort_by(pending_order);

    let imported_files = outcomes
        .iter()
        .filter(|outcome| outcome.status == ImportStatus::Imported)
        .count();
    let duplicates = outcomes
        .iter()
        .filter(|outcome| outcome.status == ImportStatus::Duplicate)
        .count();
    let rejected = outcomes
        .iter()
        .filter(|outcome| outcome.status == ImportStatus::Rejected)
        .count();

    let imported_at = now_rfc3339();
    let committed = db.transaction(|tx| {
        // A concurrent finalization would have to win the database lock first.
        crate::exams::ensure_editable_id(tx, exam_id)?;
        let mut seq: i64 = tx.query_row(
            "SELECT COALESCE(MAX(seq), 0) FROM images WHERE exam_id = ?1",
            [exam_id],
            |row| row.get(0),
        )?;
        for image in &pending {
            seq += 1;
            super::insert_row(tx, image, exam_id, seq, &user.id, &imported_at)?;
        }
        crate::exams::refresh_after_image_change(tx, exam_id)?;
        audit::record(
            tx,
            Actor::User(user),
            "images_imported",
            Some(("examination", exam_id)),
            json!({
                "files": files.len(),
                "importedFiles": imported_files,
                "images": pending.len(),
                "duplicates": duplicates,
                "rejected": rejected,
                "sha256": pending.iter().map(|image| image.sha256.as_str()).collect::<HashSet<_>>(),
            }),
        )?;
        Ok(())
    });

    if let Err(error) = committed {
        for image in &pending {
            let _ = std::fs::remove_file(thumbnail_path(data_dir, &image.id));
        }
        for path in stored_paths {
            let _ = std::fs::remove_file(path);
        }
        return Err(error);
    }

    Ok(ImportSummary {
        exam_id: exam_id.to_string(),
        imported_files,
        imported_images: pending.len(),
        duplicates,
        rejected,
        skipped,
        outcomes,
        image_ids: pending.into_iter().map(|image| image.id).collect(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::auth::{Role, SessionUser};
    use crate::exams::{self, ExamInput, Priority};
    use crate::imaging::decode::tests::png_bytes;
    use crate::patients::{self, PatientInput, Sex};

    fn user() -> SessionUser {
        SessionUser {
            id: "user-1".into(),
            username: "tech".into(),
            full_name: "Tech".into(),
            role: Role::Technologist,
            must_change_password: false,
        }
    }

    fn setup(db: &Db) -> String {
        db.with(|conn| {
            conn.execute(
                "INSERT INTO users (id, username, full_name, role, password_hash, created_at, updated_at)
                 VALUES ('user-1', 'tech', 'Tech', 'technologist', 'x', 'now', 'now')",
                [],
            )?;
            let patient = patients::create(
                conn,
                &PatientInput {
                    mrn: "MRN-42".into(),
                    given_name: "Ana".into(),
                    family_name: "Cruz".into(),
                    sex: Sex::Female,
                    birth_date: None,
                    phone: None,
                    notes: None,
                },
                "user-1",
            )?;
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
                "user-1",
            )?;
            Ok(exam.id)
        })
        .unwrap()
    }

    #[test]
    fn imports_folder_with_duplicates_and_bad_files() {
        let db = Db::open_in_memory().unwrap();
        let exam_id = setup(&db);
        let source = tempfile::tempdir().unwrap();
        let data = tempfile::tempdir().unwrap();

        std::fs::write(source.path().join("slice10.png"), png_bytes(64, 64, false)).unwrap();
        std::fs::write(source.path().join("slice2.png"), png_bytes(80, 64, false)).unwrap();
        std::fs::write(
            source.path().join("copy-of-slice2.png"),
            png_bytes(80, 64, false),
        )
        .unwrap();
        std::fs::write(source.path().join("notes.txt"), b"not an image").unwrap();
        std::fs::write(
            source.path().join("broken.png"),
            &png_bytes(64, 64, false)[..40],
        )
        .unwrap();
        std::fs::create_dir(source.path().join(".hidden")).unwrap();
        std::fs::write(
            source.path().join(".hidden/x.png"),
            png_bytes(64, 64, false),
        )
        .unwrap();

        let summary = import(
            &db,
            data.path(),
            &exam_id,
            &[source.path().to_path_buf()],
            &user(),
        )
        .unwrap();
        assert_eq!(summary.imported_files, 2);
        assert_eq!(summary.duplicates, 1);
        assert_eq!(summary.rejected, 1, "{:?}", summary.outcomes);
        assert_eq!(summary.skipped, 1);

        let items = db
            .with(|conn| super::super::list_for_exam(conn, data.path(), &exam_id))
            .unwrap();
        // Natural order: slice2 before slice10, whatever the walk order.
        let names: Vec<_> = items
            .iter()
            .map(|item| item.original_name.as_str())
            .collect();
        assert!(names[0] == "copy-of-slice2.png" || names[0] == "slice2.png");
        assert_eq!(names.last().copied(), Some("slice10.png"));
        assert!(items.iter().all(|item| !item.file_missing));

        let status = db.with(|conn| exams::status_of(conn, &exam_id)).unwrap();
        assert_eq!(status, exams::ExamStatus::Ready);

        // Re-importing the same folder adds nothing.
        let again = import(
            &db,
            data.path(),
            &exam_id,
            &[source.path().to_path_buf()],
            &user(),
        )
        .unwrap();
        assert_eq!(again.imported_files, 0);
        assert_eq!(again.duplicates, 3);
    }

    #[test]
    fn natural_order() {
        let mut names = vec!["img10.png", "img2.png", "IMG1.png", "img02b.png"];
        names.sort_by(|a, b| natural_cmp(a, b));
        assert_eq!(
            names,
            vec!["IMG1.png", "img2.png", "img02b.png", "img10.png"]
        );
    }

    #[test]
    fn imports_dicom_with_identity_check() {
        use dicom_core::{DataElement, PrimitiveValue, VR};
        use dicom_dictionary_std::tags;
        use dicom_object::{FileMetaTableBuilder, InMemDicomObject};

        let db = Db::open_in_memory().unwrap();
        let exam_id = setup(&db);
        let source = tempfile::tempdir().unwrap();
        let data = tempfile::tempdir().unwrap();

        let (rows, cols) = (64u16, 48u16);
        let pixels: Vec<u16> = (0..(rows as usize * cols as usize))
            .map(|i| (i % 1000) as u16)
            .collect();
        let mut object = InMemDicomObject::new_empty();
        object.put(DataElement::new(
            tags::SOP_CLASS_UID,
            VR::UI,
            PrimitiveValue::from("1.2.840.10008.5.1.4.1.1.4"),
        ));
        object.put(DataElement::new(
            tags::SOP_INSTANCE_UID,
            VR::UI,
            PrimitiveValue::from("1.2.826.0.1.3680043.2.1125.1"),
        ));
        object.put(DataElement::new(
            tags::MODALITY,
            VR::CS,
            PrimitiveValue::from("MR"),
        ));
        object.put(DataElement::new(
            tags::PATIENT_ID,
            VR::LO,
            PrimitiveValue::from("OTHER-77"),
        ));
        object.put(DataElement::new(
            tags::INSTANCE_NUMBER,
            VR::IS,
            PrimitiveValue::from("3"),
        ));
        object.put(DataElement::new(
            tags::SAMPLES_PER_PIXEL,
            VR::US,
            PrimitiveValue::from(1u16),
        ));
        object.put(DataElement::new(
            tags::PHOTOMETRIC_INTERPRETATION,
            VR::CS,
            PrimitiveValue::from("MONOCHROME2"),
        ));
        object.put(DataElement::new(
            tags::ROWS,
            VR::US,
            PrimitiveValue::from(rows),
        ));
        object.put(DataElement::new(
            tags::COLUMNS,
            VR::US,
            PrimitiveValue::from(cols),
        ));
        object.put(DataElement::new(
            tags::BITS_ALLOCATED,
            VR::US,
            PrimitiveValue::from(16u16),
        ));
        object.put(DataElement::new(
            tags::BITS_STORED,
            VR::US,
            PrimitiveValue::from(12u16),
        ));
        object.put(DataElement::new(
            tags::HIGH_BIT,
            VR::US,
            PrimitiveValue::from(11u16),
        ));
        object.put(DataElement::new(
            tags::PIXEL_REPRESENTATION,
            VR::US,
            PrimitiveValue::from(0u16),
        ));
        object.put(DataElement::new(
            tags::WINDOW_CENTER,
            VR::DS,
            PrimitiveValue::from("500"),
        ));
        object.put(DataElement::new(
            tags::WINDOW_WIDTH,
            VR::DS,
            PrimitiveValue::from("1000"),
        ));
        object.put(DataElement::new(
            tags::PIXEL_DATA,
            VR::OW,
            PrimitiveValue::U16(pixels.into()),
        ));
        let file = object
            .with_meta(
                FileMetaTableBuilder::new()
                    .transfer_syntax("1.2.840.10008.1.2.1")
                    .media_storage_sop_class_uid("1.2.840.10008.5.1.4.1.1.4")
                    .media_storage_sop_instance_uid("1.2.826.0.1.3680043.2.1125.1"),
            )
            .unwrap();
        let dicom_path = source.path().join("IM0001");
        file.write_to_file(&dicom_path).unwrap();

        let summary = import(&db, data.path(), &exam_id, &[dicom_path], &user()).unwrap();
        assert_eq!(summary.imported_images, 1, "{:?}", summary.outcomes);
        let outcome = &summary.outcomes[0];
        assert!(outcome.warnings.iter().any(|w| w.contains("OTHER-77")));

        let items = db
            .with(|conn| super::super::list_for_exam(conn, data.path(), &exam_id))
            .unwrap();
        let item = &items[0];
        assert_eq!(item.format, "dicom");
        assert_eq!((item.width, item.height), (48, 64));
        assert_eq!(item.window_center, 500.0);
        assert_eq!(item.window_width, 1000.0);
        assert_eq!(item.metadata["modality"], "MR");

        let location = db
            .with(|conn| super::super::locate(conn, data.path(), &item.id))
            .unwrap();
        let frame = decode::load_gray_frame(&location.path, location.format, 0).unwrap();
        assert_eq!(frame.values.len(), 48 * 64);
        assert_eq!(frame.values[999], 999.0);
        let (rgb, window) = decode::model_input_rgb(
            &location.path,
            location.format,
            0,
            Some((500.0, 1000.0)),
            false,
        )
        .unwrap();
        assert_eq!(rgb.dimensions(), (48, 64));
        assert_eq!(window, Some((500.0, 1000.0)));
    }
}
