//! Decoding PNG, JPEG and DICOM into the three shapes the rest of the app
//! needs:
//!
//! - [`GrayFrame`]: full-precision grayscale values (modality values for
//!   DICOM) that the viewer windows interactively;
//! - [`probe`]: per-frame display defaults, metadata and validation warnings
//!   computed once at import;
//! - [`model_input_rgb`]: the 8-bit RGB rendering the model consumes.
//!
//! One windowing formula ([`window_unit`]) is shared by the viewer, the
//! thumbnails and the model input so that what the clinician sees and what
//! the model saw are the same pixels.

use std::io::Cursor;
use std::path::Path;

use dicom_core::Tag;
use dicom_dictionary_std::tags;
use dicom_object::DefaultDicomObject;
use dicom_pixeldata::{PhotometricInterpretation, PixelDecoder};
use image::{DynamicImage, GrayImage, ImageDecoder, ImageReader, RgbImage};
use serde_json::{json, Map, Value};

use crate::error::{AppError, AppResult};

pub const MIN_DIMENSION: u32 = 32;
pub const MAX_DIMENSION: u32 = 16_384;
pub const THUMBNAIL_EDGE: u32 = 160;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ImageFormat {
    Png,
    Jpeg,
    Dicom,
}

impl ImageFormat {
    pub fn as_str(self) -> &'static str {
        match self {
            ImageFormat::Png => "png",
            ImageFormat::Jpeg => "jpeg",
            ImageFormat::Dicom => "dicom",
        }
    }

    pub fn parse(value: &str) -> Option<ImageFormat> {
        match value {
            "png" => Some(ImageFormat::Png),
            "jpeg" => Some(ImageFormat::Jpeg),
            "dicom" => Some(ImageFormat::Dicom),
            _ => None,
        }
    }

    pub fn extension(self) -> &'static str {
        match self {
            ImageFormat::Png => "png",
            ImageFormat::Jpeg => "jpg",
            ImageFormat::Dicom => "dcm",
        }
    }

    pub fn label(self) -> &'static str {
        match self {
            ImageFormat::Png => "PNG",
            ImageFormat::Jpeg => "JPEG",
            ImageFormat::Dicom => "DICOM",
        }
    }
}

/// Identify a file by content, never by extension.
pub fn sniff(bytes: &[u8]) -> Option<ImageFormat> {
    if bytes.starts_with(&[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A]) {
        Some(ImageFormat::Png)
    } else if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some(ImageFormat::Jpeg)
    } else if bytes.len() > 132 && &bytes[128..132] == b"DICM" {
        Some(ImageFormat::Dicom)
    } else {
        None
    }
}

/// Grayscale pixel values, row-major. 0–255 for 8-bit rasters, 0–65535 for
/// 16-bit rasters, modality values (after rescale) for DICOM.
#[derive(Clone, Debug)]
pub struct GrayFrame {
    pub width: u32,
    pub height: u32,
    pub values: Vec<f32>,
}

impl GrayFrame {
    pub fn range(&self) -> (f32, f32) {
        let mut min = f32::INFINITY;
        let mut max = f32::NEG_INFINITY;
        for &value in &self.values {
            if value.is_finite() {
                min = min.min(value);
                max = max.max(value);
            }
        }
        if min.is_finite() && max.is_finite() {
            (min, max)
        } else {
            (0.0, 0.0)
        }
    }

    /// Little-endian `f32` bytes, the wire format of the viewer's frame endpoint.
    pub fn to_le_bytes(&self) -> Vec<u8> {
        let mut out = Vec::with_capacity(self.values.len() * 4);
        for value in &self.values {
            out.extend_from_slice(&value.to_le_bytes());
        }
        out
    }
}

/// Display defaults and facts about one frame, captured at import.
#[derive(Clone, Debug)]
pub struct FrameProbe {
    pub frame_index: u32,
    pub width: u32,
    pub height: u32,
    pub bits_stored: Option<u16>,
    pub is_color: bool,
    pub window_center: f64,
    pub window_width: f64,
    pub value_min: f64,
    pub value_max: f64,
    pub invert: bool,
    pub thumbnail_png: Vec<u8>,
}

#[derive(Clone, Debug)]
pub struct ProbedFile {
    pub format: ImageFormat,
    pub frames: Vec<FrameProbe>,
    /// Selected attributes (DICOM tags or raster facts) shown in the viewer.
    pub metadata: Map<String, Value>,
    pub warnings: Vec<String>,
    /// Ordering hints from DICOM (series, instance, slice location).
    pub series_number: Option<i64>,
    pub instance_number: Option<i64>,
    pub slice_location: Option<f64>,
}

/// Map a value through a linear window to 0–1. Shared by every renderer.
pub fn window_unit(value: f32, center: f32, width: f32) -> f32 {
    let width = width.max(1.0);
    ((value - (center - width / 2.0)) / width).clamp(0.0, 1.0)
}

pub fn render_u8(frame: &GrayFrame, center: f64, width: f64, invert: bool) -> Vec<u8> {
    let (center, width) = (center as f32, width as f32);
    frame
        .values
        .iter()
        .map(|&value| {
            let unit = window_unit(value, center, width);
            let unit = if invert { 1.0 - unit } else { unit };
            (unit * 255.0).round() as u8
        })
        .collect()
}

pub fn render_gray_image(
    frame: &GrayFrame,
    center: f64,
    width: f64,
    invert: bool,
) -> AppResult<GrayImage> {
    GrayImage::from_raw(
        frame.width,
        frame.height,
        render_u8(frame, center, width, invert),
    )
    .ok_or_else(|| AppError::internal("Frame buffer does not match its dimensions."))
}

pub fn encode_png(image: DynamicImage) -> AppResult<Vec<u8>> {
    let mut out = Vec::new();
    image
        .write_to(&mut Cursor::new(&mut out), image::ImageFormat::Png)
        .map_err(|error| AppError::internal(format!("Could not encode PNG: {error}")))?;
    Ok(out)
}

pub fn thumbnail_png(
    frame: &GrayFrame,
    center: f64,
    width: f64,
    invert: bool,
) -> AppResult<Vec<u8>> {
    let full = render_gray_image(frame, center, width, invert)?;
    let (w, h) = fit_within(frame.width, frame.height, THUMBNAIL_EDGE);
    let small = image::imageops::resize(&full, w, h, image::imageops::FilterType::Triangle);
    encode_png(DynamicImage::ImageLuma8(small))
}

pub fn fit_within(width: u32, height: u32, edge: u32) -> (u32, u32) {
    let longest = width.max(height).max(1);
    if longest <= edge {
        return (width.max(1), height.max(1));
    }
    let scale = edge as f64 / longest as f64;
    (
        ((width as f64 * scale).round() as u32).max(1),
        ((height as f64 * scale).round() as u32).max(1),
    )
}

fn check_dimensions(width: u32, height: u32) -> AppResult<()> {
    if width < MIN_DIMENSION || height < MIN_DIMENSION {
        return Err(AppError::UnsupportedFile(format!(
            "Image is {width}×{height} pixels; at least {MIN_DIMENSION}×{MIN_DIMENSION} is required."
        )));
    }
    if width > MAX_DIMENSION || height > MAX_DIMENSION {
        return Err(AppError::UnsupportedFile(format!(
            "Image is {width}×{height} pixels; the maximum supported size is {MAX_DIMENSION}×{MAX_DIMENSION}."
        )));
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// PNG / JPEG
// ---------------------------------------------------------------------------

fn decode_raster(bytes: &[u8]) -> AppResult<DynamicImage> {
    let mut reader = ImageReader::new(Cursor::new(bytes))
        .with_guessed_format()
        .map_err(|error| AppError::UnsupportedFile(format!("Could not read the image: {error}")))?;
    let mut limits = image::Limits::default();
    limits.max_image_width = Some(MAX_DIMENSION);
    limits.max_image_height = Some(MAX_DIMENSION);
    limits.max_alloc = Some(1 << 30);
    reader.limits(limits);
    let mut decoder = reader.into_decoder().map_err(|error| {
        AppError::UnsupportedFile(format!(
            "The file could not be decoded (it may be truncated or not an image): {error}"
        ))
    })?;
    // EXIF orientation is applied so the stored pixels match what a viewer shows.
    let orientation = decoder.orientation().ok();
    let mut image = DynamicImage::from_decoder(decoder).map_err(|error| {
        AppError::UnsupportedFile(format!(
            "The file could not be decoded (it may be truncated or not an image): {error}"
        ))
    })?;
    if let Some(orientation) = orientation {
        image.apply_orientation(orientation);
    }
    Ok(image)
}

fn is_sixteen_bit(image: &DynamicImage) -> bool {
    matches!(
        image.color(),
        image::ColorType::L16
            | image::ColorType::La16
            | image::ColorType::Rgb16
            | image::ColorType::Rgba16
    )
}

fn has_color_channels(image: &DynamicImage) -> bool {
    image.color().has_color()
}

/// True when the image carries real chroma, not grayscale stored as RGB.
/// JPEG compression adds faint chroma noise to gray images, hence the margin.
fn carries_color(rgb: &RgbImage) -> bool {
    let total = (rgb.width() as usize) * (rgb.height() as usize);
    if total == 0 {
        return false;
    }
    let colored = rgb
        .pixels()
        .filter(|pixel| {
            let [r, g, b] = pixel.0;
            let spread = r.max(g).max(b) - r.min(g).min(b);
            spread > 24
        })
        .count();
    colored * 200 > total
}

fn raster_gray(image: &DynamicImage) -> GrayFrame {
    let (width, height) = (image.width(), image.height());
    let values = if is_sixteen_bit(image) {
        image
            .to_luma16()
            .into_raw()
            .into_iter()
            .map(f32::from)
            .collect()
    } else {
        image
            .to_luma8()
            .into_raw()
            .into_iter()
            .map(f32::from)
            .collect()
    };
    GrayFrame {
        width,
        height,
        values,
    }
}

fn probe_raster(bytes: &[u8], format: ImageFormat) -> AppResult<ProbedFile> {
    let image = decode_raster(bytes)?;
    check_dimensions(image.width(), image.height())?;
    let sixteen = is_sixteen_bit(&image);
    let is_color = has_color_channels(&image) && carries_color(&image.to_rgb8());
    let gray = raster_gray(&image);
    let (min, max) = gray.range();
    let (center, width) = if sixteen {
        (((min + max) / 2.0) as f64, ((max - min).max(1.0)) as f64)
    } else {
        (127.5, 255.0)
    };

    let mut warnings = Vec::new();
    if is_color {
        warnings.push(
            "Color image: MRI is grayscale. Confirm this is a brain MRI slice before relying on AI output."
                .to_string(),
        );
    }
    if (max - min) < 1.0 {
        warnings.push("The image has no contrast (every pixel has the same value).".to_string());
    }

    let mut metadata = Map::new();
    metadata.insert("format".into(), json!(format.label()));
    metadata.insert("colorType".into(), json!(format!("{:?}", image.color())));
    metadata.insert("bitDepth".into(), json!(if sixteen { 16 } else { 8 }));
    metadata.insert("columns".into(), json!(image.width()));
    metadata.insert("rows".into(), json!(image.height()));

    let thumbnail = thumbnail_png(&gray, center, width, false)?;
    Ok(ProbedFile {
        format,
        frames: vec![FrameProbe {
            frame_index: 0,
            width: image.width(),
            height: image.height(),
            bits_stored: Some(if sixteen { 16 } else { 8 }),
            is_color,
            window_center: center,
            window_width: width,
            value_min: min as f64,
            value_max: max as f64,
            invert: false,
            thumbnail_png: thumbnail,
        }],
        metadata,
        warnings,
        series_number: None,
        instance_number: None,
        slice_location: None,
    })
}

// ---------------------------------------------------------------------------
// DICOM
// ---------------------------------------------------------------------------

const DICOM_FIELDS: &[(&str, Tag)] = &[
    ("modality", tags::MODALITY),
    ("bodyPartExamined", tags::BODY_PART_EXAMINED),
    ("studyDescription", tags::STUDY_DESCRIPTION),
    ("seriesDescription", tags::SERIES_DESCRIPTION),
    ("protocolName", tags::PROTOCOL_NAME),
    ("studyDate", tags::STUDY_DATE),
    ("seriesNumber", tags::SERIES_NUMBER),
    ("instanceNumber", tags::INSTANCE_NUMBER),
    ("sliceLocation", tags::SLICE_LOCATION),
    ("sliceThickness", tags::SLICE_THICKNESS),
    ("pixelSpacing", tags::PIXEL_SPACING),
    ("patientName", tags::PATIENT_NAME),
    ("patientId", tags::PATIENT_ID),
    ("patientSex", tags::PATIENT_SEX),
    ("patientBirthDate", tags::PATIENT_BIRTH_DATE),
    ("institutionName", tags::INSTITUTION_NAME),
    ("manufacturer", tags::MANUFACTURER),
    ("manufacturerModelName", tags::MANUFACTURER_MODEL_NAME),
    ("magneticFieldStrength", tags::MAGNETIC_FIELD_STRENGTH),
    ("repetitionTime", tags::REPETITION_TIME),
    ("echoTime", tags::ECHO_TIME),
    (
        "photometricInterpretation",
        tags::PHOTOMETRIC_INTERPRETATION,
    ),
    ("bitsStored", tags::BITS_STORED),
    ("studyInstanceUid", tags::STUDY_INSTANCE_UID),
    ("seriesInstanceUid", tags::SERIES_INSTANCE_UID),
    ("sopInstanceUid", tags::SOP_INSTANCE_UID),
];

fn dicom_text(object: &DefaultDicomObject, tag: Tag) -> Option<String> {
    object
        .element_opt(tag)
        .ok()
        .flatten()
        .and_then(|element| element.to_str().ok().map(|text| text.trim().to_string()))
        .map(|text| text.trim_end_matches('\0').trim().to_string())
        .filter(|text| !text.is_empty())
}

fn open_dicom(path: &Path) -> AppResult<DefaultDicomObject> {
    dicom_object::open_file(path).map_err(|error| {
        AppError::UnsupportedFile(format!("The DICOM file could not be read: {error}"))
    })
}

/// Decode every frame of a DICOM object into grayscale modality values.
fn dicom_frames(object: &DefaultDicomObject) -> AppResult<(Vec<GrayFrame>, DicomDisplay)> {
    let pixel = object.decode_pixel_data().map_err(|error| {
        AppError::UnsupportedFile(format!(
            "The DICOM pixel data could not be decoded (unsupported transfer syntax or no image): {error}"
        ))
    })?;
    let width = pixel.columns();
    let height = pixel.rows();
    check_dimensions(width, height)?;
    let samples = usize::from(pixel.samples_per_pixel().max(1));
    let invert = matches!(
        pixel.photometric_interpretation(),
        PhotometricInterpretation::Monochrome1
    );
    let window = pixel
        .window()
        .ok()
        .flatten()
        .and_then(|windows| windows.first().copied())
        .filter(|window| {
            window.width > 1.0 && window.width.is_finite() && window.center.is_finite()
        })
        .map(|window| (window.center, window.width));

    let mut frames = Vec::new();
    for index in 0..pixel.number_of_frames() {
        let raw: Vec<f32> = pixel.to_vec_frame(index).map_err(|error| {
            AppError::UnsupportedFile(format!("Frame {} could not be decoded: {error}", index + 1))
        })?;
        let pixels = (width as usize) * (height as usize);
        let values = if samples >= 3 && raw.len() >= pixels * samples {
            raw.chunks_exact(samples)
                .take(pixels)
                .map(|px| 0.299 * px[0] + 0.587 * px[1] + 0.114 * px[2])
                .collect()
        } else if raw.len() >= pixels {
            raw.into_iter().take(pixels).collect()
        } else {
            return Err(AppError::UnsupportedFile(format!(
                "Frame {} holds fewer pixels than its declared {width}×{height} size.",
                index + 1
            )));
        };
        frames.push(GrayFrame {
            width,
            height,
            values,
        });
    }
    if frames.is_empty() {
        return Err(AppError::UnsupportedFile(
            "The DICOM file contains no image frames.".into(),
        ));
    }
    Ok((
        frames,
        DicomDisplay {
            window,
            invert,
            is_color: samples >= 3,
            bits_stored: Some(pixel.bits_stored()),
        },
    ))
}

struct DicomDisplay {
    window: Option<(f64, f64)>,
    invert: bool,
    is_color: bool,
    bits_stored: Option<u16>,
}

fn probe_dicom(path: &Path, expected_patient_id: Option<&str>) -> AppResult<ProbedFile> {
    let object = open_dicom(path)?;
    let mut metadata = Map::new();
    metadata.insert("format".into(), json!("DICOM"));
    metadata.insert(
        "transferSyntax".into(),
        json!(object.meta().transfer_syntax()),
    );
    metadata.insert(
        "sopClassUid".into(),
        json!(object.meta().media_storage_sop_class_uid()),
    );
    for (key, tag) in DICOM_FIELDS {
        if let Some(value) = dicom_text(&object, *tag) {
            metadata.insert((*key).to_string(), json!(value));
        }
    }

    let mut warnings = Vec::new();
    if let Some(modality) = dicom_text(&object, tags::MODALITY) {
        if !modality.eq_ignore_ascii_case("MR") {
            warnings.push(format!(
                "DICOM modality is {modality}. The model is intended for brain MRI (MR) only."
            ));
        }
    }
    if let Some(body_part) = dicom_text(&object, tags::BODY_PART_EXAMINED) {
        let upper = body_part.to_ascii_uppercase();
        if !(upper.contains("BRAIN") || upper.contains("HEAD") || upper.contains("SKULL")) {
            warnings.push(format!(
                "Body part examined is {body_part}. The model is intended for brain MRI only."
            ));
        }
    }
    if let (Some(expected), Some(found)) =
        (expected_patient_id, dicom_text(&object, tags::PATIENT_ID))
    {
        if !found.eq_ignore_ascii_case(expected.trim()) {
            warnings.push(format!(
                "Patient identity check: the DICOM Patient ID is {found}, but this examination belongs to MRN {expected}. Confirm the images belong to this patient."
            ));
        }
    }

    let (frames, display) = dicom_frames(&object)?;
    if display.is_color {
        warnings.push(
            "Color DICOM (secondary capture). MRI is grayscale; confirm the image content before relying on AI output."
                .to_string(),
        );
    }

    let mut probes = Vec::with_capacity(frames.len());
    for (index, frame) in frames.iter().enumerate() {
        let (min, max) = frame.range();
        let (center, width) = display
            .window
            .unwrap_or((((min + max) / 2.0) as f64, ((max - min).max(1.0)) as f64));
        probes.push(FrameProbe {
            frame_index: index as u32,
            width: frame.width,
            height: frame.height,
            bits_stored: display.bits_stored,
            is_color: display.is_color,
            window_center: center,
            window_width: width,
            value_min: min as f64,
            value_max: max as f64,
            invert: display.invert,
            thumbnail_png: thumbnail_png(frame, center, width, display.invert)?,
        });
    }

    let number = |tag: Tag| dicom_text(&object, tag).and_then(|text| text.parse::<f64>().ok());
    Ok(ProbedFile {
        format: ImageFormat::Dicom,
        frames: probes,
        metadata,
        warnings,
        series_number: number(tags::SERIES_NUMBER).map(|value| value as i64),
        instance_number: number(tags::INSTANCE_NUMBER).map(|value| value as i64),
        slice_location: number(tags::SLICE_LOCATION),
    })
}

/// Validate and describe a stored file. `bytes` is its content; DICOM is read
/// from `path` because the parser streams from disk.
pub fn probe(
    path: &Path,
    bytes: &[u8],
    format: ImageFormat,
    expected_patient_id: Option<&str>,
) -> AppResult<ProbedFile> {
    match format {
        ImageFormat::Png | ImageFormat::Jpeg => probe_raster(bytes, format),
        ImageFormat::Dicom => probe_dicom(path, expected_patient_id),
    }
}

/// Load one frame for the viewer.
pub fn load_gray_frame(path: &Path, format: ImageFormat, frame_index: u32) -> AppResult<GrayFrame> {
    match format {
        ImageFormat::Png | ImageFormat::Jpeg => {
            let bytes = std::fs::read(path)?;
            Ok(raster_gray(&decode_raster(&bytes)?))
        }
        ImageFormat::Dicom => {
            let object = open_dicom(path)?;
            let (mut frames, _) = dicom_frames(&object)?;
            let index = frame_index as usize;
            if index >= frames.len() {
                return Err(AppError::NotFound("Image frame"));
            }
            Ok(frames.swap_remove(index))
        }
    }
}

/// The 8-bit RGB rendering handed to the model's preprocessing, plus the
/// window used when the source was DICOM.
///
/// Rasters keep their own pixels (grayscale replicated to three channels,
/// alpha dropped). DICOM frames are rendered through `window` — normally the
/// image's default window, the same rendering the viewer opens with — because
/// the model was trained on 8-bit exports, not on raw modality values. `None`
/// renders the frame's full value range.
pub fn model_input_rgb(
    path: &Path,
    format: ImageFormat,
    frame_index: u32,
    window: Option<(f64, f64)>,
    invert: bool,
) -> AppResult<(RgbImage, Option<(f64, f64)>)> {
    match format {
        ImageFormat::Png | ImageFormat::Jpeg => {
            let bytes = std::fs::read(path)?;
            Ok((decode_raster(&bytes)?.to_rgb8(), None))
        }
        ImageFormat::Dicom => {
            let frame = load_gray_frame(path, format, frame_index)?;
            let window = window.unwrap_or_else(|| {
                let (min, max) = frame.range();
                (((min + max) / 2.0) as f64, ((max - min).max(1.0)) as f64)
            });
            let gray = render_gray_image(&frame, window.0, window.1, invert)?;
            Ok((DynamicImage::ImageLuma8(gray).to_rgb8(), Some(window)))
        }
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;

    pub fn png_bytes(width: u32, height: u32, color: bool) -> Vec<u8> {
        let image = if color {
            DynamicImage::ImageRgb8(RgbImage::from_fn(width, height, |x, y| {
                image::Rgb([(x * 7 % 256) as u8, (y * 3 % 256) as u8, 200])
            }))
        } else {
            DynamicImage::ImageLuma8(GrayImage::from_fn(width, height, |x, y| {
                image::Luma([((x + y) % 256) as u8])
            }))
        };
        encode_png(image).unwrap()
    }

    #[test]
    fn sniffs_by_content() {
        assert_eq!(sniff(&png_bytes(40, 40, false)), Some(ImageFormat::Png));
        assert_eq!(sniff(&[0xFF, 0xD8, 0xFF, 0xE0]), Some(ImageFormat::Jpeg));
        let mut dicom = vec![0u8; 140];
        dicom[128..132].copy_from_slice(b"DICM");
        assert_eq!(sniff(&dicom), Some(ImageFormat::Dicom));
        assert_eq!(sniff(b"hello world"), None);
    }

    #[test]
    fn windowing_is_linear_and_clamped() {
        assert_eq!(window_unit(0.0, 127.5, 255.0), 0.0);
        assert_eq!(window_unit(255.0, 127.5, 255.0), 1.0);
        assert!((window_unit(127.5, 127.5, 255.0) - 0.5).abs() < 1e-6);
        assert_eq!(window_unit(-500.0, 40.0, 80.0), 0.0);
        assert_eq!(window_unit(500.0, 40.0, 80.0), 1.0);
    }

    #[test]
    fn probes_grayscale_png_with_identity_window() {
        let bytes = png_bytes(64, 48, false);
        let probe = probe(Path::new("unused.png"), &bytes, ImageFormat::Png, None).unwrap();
        let frame = &probe.frames[0];
        assert_eq!((frame.width, frame.height), (64, 48));
        assert!(!frame.is_color);
        assert_eq!(frame.window_center, 127.5);
        assert!(probe.warnings.is_empty());
        assert_eq!(sniff(&frame.thumbnail_png), Some(ImageFormat::Png));
    }

    #[test]
    fn flags_color_and_rejects_tiny_images() {
        let probe = probe(
            Path::new("unused.png"),
            &png_bytes(64, 64, true),
            ImageFormat::Png,
            None,
        )
        .unwrap();
        assert!(probe.frames[0].is_color);
        assert!(!probe.warnings.is_empty());

        let tiny = super::probe(
            Path::new("unused.png"),
            &png_bytes(16, 16, false),
            ImageFormat::Png,
            None,
        );
        assert!(matches!(tiny, Err(AppError::UnsupportedFile(_))));
    }

    #[test]
    fn rejects_truncated_files() {
        let mut bytes = png_bytes(64, 64, false);
        bytes.truncate(bytes.len() / 2);
        assert!(probe(Path::new("x.png"), &bytes, ImageFormat::Png, None).is_err());
    }

    #[test]
    fn fit_within_preserves_aspect() {
        assert_eq!(fit_within(512, 256, 160), (160, 80));
        assert_eq!(fit_within(100, 50, 160), (100, 50));
    }
}
