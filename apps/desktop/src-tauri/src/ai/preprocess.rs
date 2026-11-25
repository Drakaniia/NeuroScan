//! Manifest-driven preprocessing: 8-bit RGB image → model input tensor.
//!
//! resize (manifest filter) → per-pixel `value × scale` → per-channel
//! `(x − mean) / std` → NCHW or NHWC `f32`. Grayscale models receive the
//! ITU-R BT.601 luminance of the RGB rendering.

use image::imageops::FilterType;
use image::RgbImage;
use serde::Serialize;

use super::manifest::{InputSection, Layout, ResizeFilter};

#[derive(Debug, Clone)]
pub struct PreparedInput {
    pub shape: Vec<i64>,
    pub data: Vec<f32>,
}

/// What preprocessing did, recorded with every result for traceability.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PreprocessingRecord {
    pub source_width: u32,
    pub source_height: u32,
    pub input_width: u32,
    pub input_height: u32,
    pub channels: u32,
    pub layout: String,
    pub resize: String,
    /// The window used to render DICOM to 8-bit (centre, width), if any.
    pub dicom_window: Option<(f64, f64)>,
}

fn filter(resize: ResizeFilter) -> FilterType {
    match resize {
        ResizeFilter::Bilinear => FilterType::Triangle,
        ResizeFilter::Nearest => FilterType::Nearest,
        ResizeFilter::Bicubic => FilterType::CatmullRom,
    }
}

pub fn prepare(image: &RgbImage, input: &InputSection) -> PreparedInput {
    let (width, height) = (input.width, input.height);
    let resized = if image.dimensions() == (width, height) {
        image.clone()
    } else {
        image::imageops::resize(image, width, height, filter(input.resize))
    };

    let channels = input.channels as usize;
    let plane = (width as usize) * (height as usize);
    let mut data = vec![0f32; plane * channels];

    for (index, pixel) in resized.pixels().enumerate() {
        let [r, g, b] = pixel.0;
        let samples: [f32; 3] = if channels == 1 {
            let luma = 0.299 * f32::from(r) + 0.587 * f32::from(g) + 0.114 * f32::from(b);
            [luma, 0.0, 0.0]
        } else {
            [f32::from(r), f32::from(g), f32::from(b)]
        };
        for (channel, sample) in samples.iter().take(channels).enumerate() {
            let value = (sample * input.scale - input.mean[channel]) / input.std[channel];
            let offset = match input.layout {
                Layout::Nchw => channel * plane + index,
                Layout::Nhwc => index * channels + channel,
            };
            data[offset] = value;
        }
    }

    let shape = match input.layout {
        Layout::Nchw => vec![1, channels as i64, height as i64, width as i64],
        Layout::Nhwc => vec![1, height as i64, width as i64, channels as i64],
    };
    PreparedInput { shape, data }
}

/// A neutral mid-gray input, used by the load-time self-test.
pub fn self_test_input(input: &InputSection) -> PreparedInput {
    let gray = RgbImage::from_pixel(input.width, input.height, image::Rgb([128, 128, 128]));
    prepare(&gray, input)
}

pub fn record(
    source: &RgbImage,
    input: &InputSection,
    dicom_window: Option<(f64, f64)>,
) -> PreprocessingRecord {
    PreprocessingRecord {
        source_width: source.width(),
        source_height: source.height(),
        input_width: input.width,
        input_height: input.height,
        channels: input.channels,
        layout: match input.layout {
            Layout::Nchw => "NCHW".into(),
            Layout::Nhwc => "NHWC".into(),
        },
        resize: format!("{:?}", input.resize).to_lowercase(),
        dicom_window,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn section(channels: u32, layout: Layout) -> InputSection {
        InputSection {
            name: "input".into(),
            layout,
            width: 2,
            height: 2,
            channels,
            resize: ResizeFilter::Nearest,
            scale: 1.0 / 255.0,
            mean: vec![0.5; channels as usize],
            std: vec![0.5; channels as usize],
        }
    }

    fn image() -> RgbImage {
        let mut image = RgbImage::new(2, 2);
        image.put_pixel(0, 0, image::Rgb([255, 0, 0]));
        image.put_pixel(1, 0, image::Rgb([0, 255, 0]));
        image.put_pixel(0, 1, image::Rgb([0, 0, 255]));
        image.put_pixel(1, 1, image::Rgb([255, 255, 255]));
        image
    }

    #[test]
    fn nchw_normalises_per_channel() {
        let prepared = prepare(&image(), &section(3, Layout::Nchw));
        assert_eq!(prepared.shape, vec![1, 3, 2, 2]);
        // Red plane: 255 → (1 − 0.5)/0.5 = 1; 0 → −1.
        assert_eq!(&prepared.data[0..4], &[1.0, -1.0, -1.0, 1.0]);
        // Green plane.
        assert_eq!(&prepared.data[4..8], &[-1.0, 1.0, -1.0, 1.0]);
    }

    #[test]
    fn nhwc_interleaves_channels() {
        let prepared = prepare(&image(), &section(3, Layout::Nhwc));
        assert_eq!(prepared.shape, vec![1, 2, 2, 3]);
        assert_eq!(&prepared.data[0..3], &[1.0, -1.0, -1.0]);
    }

    #[test]
    fn grayscale_models_get_luminance() {
        let prepared = prepare(&image(), &section(1, Layout::Nchw));
        assert_eq!(prepared.shape, vec![1, 1, 2, 2]);
        let white = prepared.data[3];
        assert!((white - 1.0).abs() < 1e-5);
    }

    #[test]
    fn resizes_to_the_declared_input() {
        let mut input = section(3, Layout::Nchw);
        input.width = 4;
        input.height = 3;
        input.resize = ResizeFilter::Bilinear;
        let prepared = prepare(&image(), &input);
        assert_eq!(prepared.shape, vec![1, 3, 3, 4]);
        assert_eq!(prepared.data.len(), 36);
    }
}
