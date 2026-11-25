//! The model manifest (`run-config.json`): the single contract between a
//! trained model and this application.
//!
//! Everything model-specific — tensor names, input size and layout,
//! normalisation, class order, which classes count as a positive finding, the
//! decision threshold, whether activation maps are available — is declared
//! here. The application code reads the manifest and never hard-codes any of
//! it, so replacing or upgrading the model means replacing two files.
//!
//! The schema is documented with a full example in
//! `docs/ai/model-integration.md`; `ml/export_onnx.py` writes it.

use serde::{Deserialize, Serialize};

pub const MANIFEST_FILE: &str = "run-config.json";
pub const SUPPORTED_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Manifest {
    pub schema_version: u32,
    pub model: ModelSection,
    pub task: String,
    pub input: InputSection,
    pub output: OutputSection,
    #[serde(default)]
    pub explainability: Option<ExplainabilitySection>,
    pub decision: DecisionSection,
    #[serde(default)]
    pub dicom: DicomSection,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ModelSection {
    pub id: String,
    pub name: String,
    pub version: String,
    #[serde(default = "default_model_file")]
    pub file: String,
    /// Optional SHA-256 of the ONNX file; when present it is enforced.
    #[serde(default)]
    pub sha256: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub created: Option<String>,
    #[serde(default)]
    pub training_data: Option<String>,
    #[serde(default)]
    pub intended_use: Option<String>,
    /// Free-form evaluation metrics, shown verbatim (e.g. held-out accuracy).
    #[serde(default)]
    pub performance: Option<serde_json::Value>,
    #[serde(default)]
    pub limitations: Vec<String>,
    /// Marks an integration-test fixture with untrained weights. Fixtures load
    /// and run like any model, but every result is labelled meaningless.
    #[serde(default)]
    pub fixture: bool,
}

fn default_model_file() -> String {
    "neuroscan.onnx".to_string()
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "UPPERCASE")]
pub enum Layout {
    Nchw,
    Nhwc,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum ResizeFilter {
    #[default]
    Bilinear,
    Nearest,
    Bicubic,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct InputSection {
    pub name: String,
    #[serde(default = "default_layout")]
    pub layout: Layout,
    pub width: u32,
    pub height: u32,
    pub channels: u32,
    #[serde(default)]
    pub resize: ResizeFilter,
    /// Multiplier applied to 0–255 pixel values before normalisation.
    #[serde(default = "default_scale")]
    pub scale: f32,
    pub mean: Vec<f32>,
    pub std: Vec<f32>,
}

fn default_layout() -> Layout {
    Layout::Nchw
}

fn default_scale() -> f32 {
    1.0 / 255.0
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Activation {
    /// Scores are logits over the classes.
    Softmax,
    /// A single logit for the positive class (binary models).
    Sigmoid,
    /// Scores are already probabilities that sum to 1.
    None,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum Finding {
    Positive,
    Negative,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ClassSpec {
    pub label: String,
    #[serde(default)]
    pub display_name: Option<String>,
    pub finding: Finding,
}

impl ClassSpec {
    pub fn display(&self) -> String {
        self.display_name
            .clone()
            .unwrap_or_else(|| self.label.clone())
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct OutputSection {
    pub scores: String,
    pub activation: Activation,
    pub classes: Vec<ClassSpec>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ExplainabilitySection {
    /// Only `cam` (class activation mapping from exported head weights).
    pub method: String,
    pub features: String,
    pub weights: String,
    #[serde(default = "default_layout")]
    pub features_layout: Layout,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DecisionSection {
    /// Operating point τ on the screening probability, chosen on validation data.
    pub threshold: f64,
    /// Results within ±band of τ are reported as indeterminate.
    pub low_confidence_band: f64,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum DicomVoi {
    /// The file's own Window Center/Width, falling back to the value range.
    #[default]
    FileWindowOrMinmax,
    /// Always the frame's full value range.
    Minmax,
}

#[derive(Debug, Clone, Deserialize, Serialize, Default)]
pub struct DicomSection {
    #[serde(default)]
    pub voi: DicomVoi,
}

impl Manifest {
    pub fn parse(text: &str) -> Result<Manifest, String> {
        serde_json::from_str(text).map_err(|error| format!("run-config.json is not valid: {error}"))
    }

    /// Semantic checks beyond the JSON shape. Returns every problem found.
    pub fn validate(&self) -> Vec<String> {
        let mut issues = Vec::new();
        if self.schema_version != SUPPORTED_SCHEMA_VERSION {
            issues.push(format!(
                "schema_version {} is not supported (this application reads version {SUPPORTED_SCHEMA_VERSION}).",
                self.schema_version
            ));
        }
        if self.model.id.trim().is_empty() || self.model.version.trim().is_empty() {
            issues.push("model.id and model.version are required.".into());
        }
        if self.model.file.contains("..")
            || self.model.file.contains('/')
            || self.model.file.contains('\\')
        {
            issues.push("model.file must be a plain file name inside the model folder.".into());
        }
        if let Some(hash) = &self.model.sha256 {
            if hash.len() != 64 || !hash.chars().all(|ch| ch.is_ascii_hexdigit()) {
                issues.push("model.sha256 must be 64 hexadecimal characters.".into());
            }
        }
        if self.task != "classification" {
            issues.push(format!(
                "task '{}' is not supported; this application runs image classification models.",
                self.task
            ));
        }

        let input = &self.input;
        if !(16..=2048).contains(&input.width) || !(16..=2048).contains(&input.height) {
            issues.push("input.width and input.height must be between 16 and 2048.".into());
        }
        if input.channels != 1 && input.channels != 3 {
            issues.push("input.channels must be 1 (grayscale) or 3 (RGB).".into());
        }
        if input.mean.len() != input.channels as usize || input.std.len() != input.channels as usize
        {
            issues.push("input.mean and input.std need one value per input channel.".into());
        }
        if input
            .std
            .iter()
            .any(|value| !value.is_finite() || *value <= 0.0)
        {
            issues.push("input.std values must be positive.".into());
        }
        if !input.scale.is_finite() || input.scale <= 0.0 {
            issues.push("input.scale must be positive.".into());
        }

        let classes = &self.output.classes;
        if classes.len() < 2 {
            issues.push("output.classes must list at least two classes.".into());
        }
        if !classes
            .iter()
            .any(|class| class.finding == Finding::Positive)
            || !classes
                .iter()
                .any(|class| class.finding == Finding::Negative)
        {
            issues.push(
                "output.classes needs at least one positive and one negative finding.".into(),
            );
        }
        if self.output.activation == Activation::Sigmoid && classes.len() != 2 {
            issues.push("A sigmoid output must describe exactly two classes.".into());
        }
        let mut labels: Vec<&str> = classes.iter().map(|class| class.label.as_str()).collect();
        labels.sort_unstable();
        labels.dedup();
        if labels.len() != classes.len() {
            issues.push("output.classes labels must be unique.".into());
        }

        if let Some(explain) = &self.explainability {
            if explain.method != "cam" {
                issues.push(format!(
                    "explainability.method '{}' is not supported (use 'cam').",
                    explain.method
                ));
            }
        }

        let decision = &self.decision;
        if !(decision.threshold > 0.0 && decision.threshold < 1.0) {
            issues.push("decision.threshold must be between 0 and 1.".into());
        }
        if !(0.0..0.5).contains(&decision.low_confidence_band) {
            issues.push("decision.low_confidence_band must be between 0 and 0.5.".into());
        }
        issues
    }

    pub fn positive_class_count(&self) -> usize {
        self.output
            .classes
            .iter()
            .filter(|class| class.finding == Finding::Positive)
            .count()
    }
}

#[cfg(test)]
pub mod tests {
    use super::*;

    pub fn example_json() -> String {
        serde_json::json!({
            "schema_version": 1,
            "model": {
                "id": "neuroscan-resnet18-binary",
                "name": "NeuroScan ResNet-18",
                "version": "1.0.0",
                "file": "neuroscan.onnx"
            },
            "task": "classification",
            "input": {
                "name": "input",
                "layout": "NCHW",
                "width": 224,
                "height": 224,
                "channels": 3,
                "mean": [0.485, 0.456, 0.406],
                "std": [0.229, 0.224, 0.225]
            },
            "output": {
                "scores": "logits",
                "activation": "softmax",
                "classes": [
                    { "label": "no_tumor", "display_name": "No tumor", "finding": "negative" },
                    { "label": "tumor", "display_name": "Tumor", "finding": "positive" }
                ]
            },
            "explainability": { "method": "cam", "features": "features", "weights": "head_w" },
            "decision": { "threshold": 0.45, "low_confidence_band": 0.05 }
        })
        .to_string()
    }

    #[test]
    fn parses_the_documented_example_with_defaults() {
        let manifest = Manifest::parse(&example_json()).unwrap();
        assert!(manifest.validate().is_empty(), "{:?}", manifest.validate());
        assert_eq!(manifest.input.resize, ResizeFilter::Bilinear);
        assert!((manifest.input.scale - 1.0 / 255.0).abs() < 1e-9);
        assert_eq!(manifest.dicom.voi, DicomVoi::FileWindowOrMinmax);
        assert!(!manifest.model.fixture);
        assert_eq!(manifest.positive_class_count(), 1);
    }

    #[test]
    fn reports_every_semantic_problem() {
        let mut manifest = Manifest::parse(&example_json()).unwrap();
        manifest.schema_version = 9;
        manifest.task = "segmentation".into();
        manifest.input.channels = 4;
        manifest.decision.threshold = 1.5;
        manifest.model.file = "../elsewhere.onnx".into();
        manifest.output.classes[1].finding = Finding::Negative;
        let issues = manifest.validate();
        assert!(issues.len() >= 6, "{issues:?}");
    }

    #[test]
    fn rejects_malformed_json() {
        assert!(Manifest::parse("{ \"schema_version\": 1 }").is_err());
        assert!(Manifest::parse("not json").is_err());
    }
}
