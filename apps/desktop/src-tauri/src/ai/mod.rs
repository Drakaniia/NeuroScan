//! AI inference service.
//!
//! Responsibilities, in order of a model's life:
//!
//! 1. **Discovery** — find a model folder (`run-config.json` + ONNX file).
//! 2. **Validation** — eight recorded checks, from manifest schema through a
//!    self-test inference. A model that fails any check is never used.
//! 3. **Inference** — decode → preprocess → run → postprocess (+ CAM), all
//!    driven by the manifest.
//!
//! When no model is installed, or the installed one fails validation, the
//! service reports exactly that and refuses to analyse. It never substitutes
//! a placeholder result.

pub mod discovery;
pub mod engine;
pub mod manifest;
pub mod postprocess;
pub mod preprocess;

use std::path::{Path, PathBuf};
use std::sync::{Mutex, RwLock};
use std::time::Instant;

use serde::Serialize;

use crate::error::{AppError, AppResult};
use crate::imaging::decode::{self, ImageFormat};
use crate::imaging::ImageLocation;
use crate::util::{now_rfc3339, sha256_hex};
use discovery::{Candidate, SearchedLocation, SourceKind};
use engine::{InferenceEngine, ModelSignature, OnnxEngine, RawOutputs, TensorSpec};
use manifest::{ClassSpec, DicomVoi, Finding, Layout, Manifest, MANIFEST_FILE};
use postprocess::{ActivationMap, Interpretation};
use preprocess::PreprocessingRecord;

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ModelState {
    /// Discovery has not run yet (first moments after start-up).
    Unchecked,
    Loading,
    NotInstalled,
    Ready,
    Error,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CheckStatus {
    Passed,
    Warning,
    Failed,
    Skipped,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationCheck {
    pub id: &'static str,
    pub label: &'static str,
    pub status: CheckStatus,
    pub detail: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub created: Option<String>,
    pub training_data: Option<String>,
    pub intended_use: Option<String>,
    pub performance: Option<serde_json::Value>,
    pub limitations: Vec<String>,
    pub fixture: bool,
    pub directory: String,
    pub file_name: String,
    pub file_size: u64,
    pub sha256: String,
    pub sha256_declared: bool,
    pub runtime: String,
    pub signature: ModelSignature,
    pub input_width: u32,
    pub input_height: u32,
    pub input_channels: u32,
    pub input_layout: String,
    pub classes: Vec<ClassSpec>,
    pub threshold: f64,
    pub low_confidence_band: f64,
    pub explainability: Option<String>,
    pub loaded_at: String,
    pub load_ms: u64,
    pub self_test_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelSource {
    pub kind: SourceKind,
    pub directory: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelStatus {
    pub state: ModelState,
    pub message: String,
    pub model: Option<ModelInfo>,
    pub checks: Vec<ValidationCheck>,
    pub source: Option<ModelSource>,
    pub searched: Vec<SearchedLocation>,
    pub updated_at: String,
}

impl ModelStatus {
    fn simple(state: ModelState, message: &str) -> Self {
        Self {
            state,
            message: message.to_string(),
            model: None,
            checks: Vec::new(),
            source: None,
            searched: Vec::new(),
            updated_at: now_rfc3339(),
        }
    }
}

/// The identity of the model that produced a result, stored with it.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelIdentity {
    pub id: String,
    pub name: String,
    pub version: String,
    pub sha256: String,
    pub fixture: bool,
}

#[derive(Debug, Clone)]
pub struct AnalysisOutput {
    pub model: ModelIdentity,
    pub interpretation: Interpretation,
    pub threshold: f64,
    pub low_confidence_band: f64,
    pub activation: Option<ActivationMap>,
    pub activation_label: Option<String>,
    pub preprocessing: PreprocessingRecord,
    pub latency_ms: u64,
}

struct LoadedModel {
    manifest: Manifest,
    engine: Box<dyn InferenceEngine>,
    info: ModelInfo,
}

pub struct AiService {
    status: RwLock<ModelStatus>,
    model: Mutex<Option<LoadedModel>>,
}

impl Default for AiService {
    fn default() -> Self {
        Self {
            status: RwLock::new(ModelStatus::simple(
                ModelState::Unchecked,
                "Checking for an AI model…",
            )),
            model: Mutex::new(None),
        }
    }
}

/// Builder for the eight-step validation report.
struct Checks(Vec<ValidationCheck>);

impl Checks {
    fn push(
        &mut self,
        id: &'static str,
        label: &'static str,
        status: CheckStatus,
        detail: Option<String>,
    ) {
        self.0.push(ValidationCheck {
            id,
            label,
            status,
            detail,
        });
    }

    fn pass(&mut self, id: &'static str, label: &'static str, detail: impl Into<String>) {
        self.push(id, label, CheckStatus::Passed, Some(detail.into()));
    }

    fn fail(&mut self, id: &'static str, label: &'static str, detail: impl Into<String>) -> String {
        let detail = detail.into();
        self.push(id, label, CheckStatus::Failed, Some(detail.clone()));
        detail
    }

    /// Mark every check after a failure as not run, so the report is complete.
    fn skip_rest(&mut self) {
        const ORDER: &[(&str, &str)] = &[
            ("manifest", "Manifest found and readable"),
            ("manifest_valid", "Manifest values valid"),
            ("model_file", "Model file present"),
            ("integrity", "File integrity (SHA-256)"),
            ("runtime", "ONNX Runtime session"),
            ("input_signature", "Input tensor matches manifest"),
            ("output_signature", "Output tensors match manifest"),
            ("self_test", "Self-test inference"),
        ];
        for (id, label) in ORDER {
            if !self.0.iter().any(|check| check.id == *id) {
                self.push(
                    id,
                    label,
                    CheckStatus::Skipped,
                    Some("Not run: an earlier check failed.".into()),
                );
            }
        }
    }
}

fn shape_text(shape: &[i64]) -> String {
    let dims: Vec<String> = shape
        .iter()
        .map(|dim| {
            if *dim < 0 {
                "?".to_string()
            } else {
                dim.to_string()
            }
        })
        .collect();
    format!("[{}]", dims.join(", "))
}

fn dims_compatible(actual: &[i64], expected: &[i64]) -> bool {
    actual.len() == expected.len()
        && actual
            .iter()
            .zip(expected)
            .all(|(actual, expected)| *actual < 0 || actual == expected)
}

fn check_input(spec: Option<&TensorSpec>, manifest: &Manifest) -> Result<String, String> {
    let input = &manifest.input;
    let spec = spec.ok_or_else(|| {
        format!(
            "The model has no input named '{}' (declared in the manifest).",
            input.name
        )
    })?;
    if spec.element_type != "float32" {
        return Err(format!(
            "Input '{}' is {}, but NeuroScan supplies float32 tensors.",
            spec.name, spec.element_type
        ));
    }
    let expected = match input.layout {
        Layout::Nchw => vec![
            1,
            input.channels as i64,
            input.height as i64,
            input.width as i64,
        ],
        Layout::Nhwc => vec![
            1,
            input.height as i64,
            input.width as i64,
            input.channels as i64,
        ],
    };
    if !dims_compatible(&spec.shape, &expected) {
        return Err(format!(
            "Input '{}' has shape {}, but the manifest describes {}.",
            spec.name,
            shape_text(&spec.shape),
            shape_text(&expected)
        ));
    }
    Ok(format!("{} float32 {}", spec.name, shape_text(&spec.shape)))
}

fn check_outputs(signature: &ModelSignature, manifest: &Manifest) -> Result<String, String> {
    let mut found = Vec::new();
    let scores = signature.output(&manifest.output.scores).ok_or_else(|| {
        format!(
            "The model has no output named '{}' (declared as scores).",
            manifest.output.scores
        )
    })?;
    found.push(format!("{} {}", scores.name, shape_text(&scores.shape)));
    if let Some(explain) = &manifest.explainability {
        for name in [&explain.features, &explain.weights] {
            let spec = signature.output(name).ok_or_else(|| {
                format!("The model has no output named '{name}' (declared for activation maps).")
            })?;
            found.push(format!("{} {}", spec.name, shape_text(&spec.shape)));
        }
    }
    for spec in signature.outputs.iter().filter(|spec| {
        found
            .iter()
            .any(|entry| entry.starts_with(&format!("{} ", spec.name)))
    }) {
        if spec.element_type != "float32" {
            return Err(format!(
                "Output '{}' is {}; NeuroScan reads float32 outputs.",
                spec.name, spec.element_type
            ));
        }
    }
    Ok(found.join(" · "))
}

fn interpret_outputs(
    manifest: &Manifest,
    outputs: &RawOutputs,
) -> AppResult<(Interpretation, Option<ActivationMap>, Option<String>)> {
    let interpretation = postprocess::interpret(
        &outputs.scores.data,
        &manifest.output,
        manifest.decision.threshold,
        manifest.decision.low_confidence_band,
    )?;
    let (activation, label) = match (
        &manifest.explainability,
        &outputs.features,
        &outputs.weights,
    ) {
        (Some(explain), Some(features), Some(weights)) => {
            let class = &manifest.output.classes[interpretation.predicted_index];
            let map = postprocess::class_activation_map(
                (&features.shape, &features.data),
                (&weights.shape, &weights.data),
                explain.features_layout,
                interpretation.predicted_index,
                class.finding == Finding::Positive,
            )?;
            let label = map.as_ref().map(|_| class.display());
            (map, label)
        }
        _ => (None, None),
    };
    Ok((interpretation, activation, label))
}

fn load_candidate(
    candidate: &Candidate,
) -> Result<(LoadedModel, Vec<ValidationCheck>), (String, Vec<ValidationCheck>)> {
    let started = Instant::now();
    let mut checks = Checks(Vec::new());
    macro_rules! bail {
        ($message:expr) => {{
            let message = $message;
            checks.skip_rest();
            return Err((message, checks.0));
        }};
    }

    // 1. Manifest present and parseable.
    let manifest_path = candidate.directory.join(MANIFEST_FILE);
    let text = match std::fs::read_to_string(&manifest_path) {
        Ok(text) => text,
        Err(error) => bail!(checks.fail(
            "manifest",
            "Manifest found and readable",
            format!("{MANIFEST_FILE} could not be read: {error}")
        )),
    };
    let manifest = match Manifest::parse(&text) {
        Ok(manifest) => manifest,
        Err(error) => bail!(checks.fail("manifest", "Manifest found and readable", error)),
    };
    checks.pass(
        "manifest",
        "Manifest found and readable",
        format!(
            "{} {} ({})",
            manifest.model.name, manifest.model.version, manifest.model.id
        ),
    );

    // 2. Manifest semantics.
    let issues = manifest.validate();
    if !issues.is_empty() {
        bail!(checks.fail("manifest_valid", "Manifest values valid", issues.join(" ")));
    }
    checks.pass(
        "manifest_valid",
        "Manifest values valid",
        format!(
            "{} classes · τ = {:.3} ± {:.3}",
            manifest.output.classes.len(),
            manifest.decision.threshold,
            manifest.decision.low_confidence_band
        ),
    );

    // 3. Model file.
    let model_path = candidate.directory.join(&manifest.model.file);
    let bytes = match std::fs::read(&model_path) {
        Ok(bytes) if !bytes.is_empty() => bytes,
        Ok(_) => bail!(checks.fail(
            "model_file",
            "Model file present",
            format!("{} is empty.", manifest.model.file)
        )),
        Err(error) => bail!(checks.fail(
            "model_file",
            "Model file present",
            format!("{} could not be read: {error}", manifest.model.file)
        )),
    };
    let file_size = bytes.len() as u64;
    checks.pass(
        "model_file",
        "Model file present",
        format!(
            "{} · {:.1} MB",
            manifest.model.file,
            file_size as f64 / 1_048_576.0
        ),
    );

    // 4. Integrity.
    let sha256 = sha256_hex(&bytes);
    drop(bytes);
    match &manifest.model.sha256 {
        Some(expected) if !expected.eq_ignore_ascii_case(&sha256) => bail!(checks.fail(
            "integrity",
            "File integrity (SHA-256)",
            format!("Checksum mismatch: the manifest declares {expected}, the file is {sha256}. The file may be corrupted or replaced.")
        )),
        Some(_) => checks.pass("integrity", "File integrity (SHA-256)", format!("Matches the declared checksum {sha256}")),
        None => checks.push(
            "integrity",
            "File integrity (SHA-256)",
            CheckStatus::Warning,
            Some(format!("No checksum declared in the manifest; computed {sha256}. Add model.sha256 to detect corruption.")),
        ),
    }

    // 5. Runtime session.
    let mut engine = match OnnxEngine::load(&model_path, &manifest) {
        Ok(engine) => engine,
        Err(error) => bail!(checks.fail("runtime", "ONNX Runtime session", error.to_string())),
    };
    checks.pass("runtime", "ONNX Runtime session", engine.runtime());

    // 6–7. Tensor signature.
    match check_input(engine.signature().input(&manifest.input.name), &manifest) {
        Ok(detail) => checks.pass("input_signature", "Input tensor matches manifest", detail),
        Err(error) => bail!(checks.fail("input_signature", "Input tensor matches manifest", error)),
    }
    match check_outputs(engine.signature(), &manifest) {
        Ok(detail) => checks.pass("output_signature", "Output tensors match manifest", detail),
        Err(error) => {
            bail!(checks.fail("output_signature", "Output tensors match manifest", error))
        }
    }

    // 8. Self-test: one real forward pass on a neutral image, through the
    // exact postprocessing used for patient images.
    let test_started = Instant::now();
    let outputs = match engine.run(preprocess::self_test_input(&manifest.input)) {
        Ok(outputs) => outputs,
        Err(error) => bail!(checks.fail("self_test", "Self-test inference", error.to_string())),
    };
    if let Err(error) = interpret_outputs(&manifest, &outputs) {
        bail!(checks.fail("self_test", "Self-test inference", error.to_string()));
    }
    let self_test_ms = test_started.elapsed().as_millis() as u64;
    checks.pass(
        "self_test",
        "Self-test inference",
        format!("Completed in {self_test_ms} ms"),
    );

    let info = ModelInfo {
        id: manifest.model.id.clone(),
        name: manifest.model.name.clone(),
        version: manifest.model.version.clone(),
        description: manifest.model.description.clone(),
        created: manifest.model.created.clone(),
        training_data: manifest.model.training_data.clone(),
        intended_use: manifest.model.intended_use.clone(),
        performance: manifest.model.performance.clone(),
        limitations: manifest.model.limitations.clone(),
        fixture: manifest.model.fixture,
        directory: candidate.directory.display().to_string(),
        file_name: manifest.model.file.clone(),
        file_size,
        sha256,
        sha256_declared: manifest.model.sha256.is_some(),
        runtime: engine.runtime(),
        signature: engine.signature().clone(),
        input_width: manifest.input.width,
        input_height: manifest.input.height,
        input_channels: manifest.input.channels,
        input_layout: match manifest.input.layout {
            Layout::Nchw => "NCHW".into(),
            Layout::Nhwc => "NHWC".into(),
        },
        classes: manifest.output.classes.clone(),
        threshold: manifest.decision.threshold,
        low_confidence_band: manifest.decision.low_confidence_band,
        explainability: manifest
            .explainability
            .as_ref()
            .map(|_| "Class activation map (CAM) from the classification head".to_string()),
        loaded_at: now_rfc3339(),
        load_ms: started.elapsed().as_millis() as u64,
        self_test_ms,
    };
    Ok((
        LoadedModel {
            manifest,
            engine: Box::new(engine),
            info,
        },
        checks.0,
    ))
}

impl AiService {
    pub fn status(&self) -> ModelStatus {
        self.status
            .read()
            .map(|status| status.clone())
            .unwrap_or_else(|_| {
                ModelStatus::simple(ModelState::Error, "Model status is unavailable.")
            })
    }

    pub fn is_ready(&self) -> bool {
        self.status().state == ModelState::Ready
    }

    pub fn info(&self) -> Option<ModelInfo> {
        self.status().model
    }

    fn set_status(&self, status: ModelStatus) {
        if let Ok(mut current) = self.status.write() {
            *current = status;
        }
    }

    pub fn mark_loading(&self) {
        let mut status = self.status();
        status.state = ModelState::Loading;
        status.message = "Loading and validating the AI model…".into();
        status.updated_at = now_rfc3339();
        self.set_status(status);
    }

    /// Discover and validate a model, replacing whatever was loaded.
    /// Blocking: run it off the UI thread.
    pub fn load(&self, candidates: Vec<Candidate>) -> ModelStatus {
        self.mark_loading();
        let searched: Vec<SearchedLocation> = candidates.iter().map(Candidate::searched).collect();

        // Drop the previous session before loading another (frees its memory).
        if let Ok(mut model) = self.model.lock() {
            *model = None;
        }

        let Some(candidate) = candidates.iter().find(|candidate| candidate.has_manifest()) else {
            let explicit = candidates
                .iter()
                .any(|candidate| candidate.kind.is_explicit());
            let status = ModelStatus {
                state: if explicit {
                    ModelState::Error
                } else {
                    ModelState::NotInstalled
                },
                message: if explicit {
                    format!(
                        "The configured model folder does not contain {MANIFEST_FILE}. AI analysis is unavailable until a valid model is installed."
                    )
                } else {
                    "No AI model is installed. Images can be viewed and reviewed, but AI analysis is unavailable.".to_string()
                },
                model: None,
                checks: Vec::new(),
                source: candidates
                    .first()
                    .filter(|c| c.kind.is_explicit())
                    .map(|c| ModelSource {
                        kind: c.kind,
                        directory: c.directory.display().to_string(),
                    }),
                searched,
                updated_at: now_rfc3339(),
            };
            self.set_status(status.clone());
            return status;
        };

        let source = ModelSource {
            kind: candidate.kind,
            directory: candidate.directory.display().to_string(),
        };
        let status = match load_candidate(candidate) {
            Ok((loaded, checks)) => {
                let info = loaded.info.clone();
                let message = if info.fixture {
                    format!(
                        "{} {} loaded. This is an integration-test fixture with untrained weights: its outputs are meaningless and must not be used clinically.",
                        info.name, info.version
                    )
                } else {
                    format!("{} {} is validated and ready.", info.name, info.version)
                };
                if let Ok(mut model) = self.model.lock() {
                    *model = Some(loaded);
                }
                ModelStatus {
                    state: ModelState::Ready,
                    message,
                    model: Some(info),
                    checks,
                    source: Some(source),
                    searched,
                    updated_at: now_rfc3339(),
                }
            }
            Err((message, checks)) => ModelStatus {
                state: ModelState::Error,
                message: format!("The AI model failed validation and was not loaded: {message}"),
                model: None,
                checks,
                source: Some(source),
                searched,
                updated_at: now_rfc3339(),
            },
        };
        self.set_status(status.clone());
        status
    }

    fn unavailable(&self) -> AppError {
        let status = self.status();
        AppError::ModelUnavailable(match status.state {
            ModelState::Loading | ModelState::Unchecked => {
                "the model is still loading. Try again in a moment.".into()
            }
            _ => status.message,
        })
    }

    /// Analyse one stored image with the loaded model.
    pub fn analyze(&self, location: &ImageLocation) -> AppResult<AnalysisOutput> {
        let started = Instant::now();
        let mut guard = self.model.lock()?;
        let Some(model) = guard.as_mut() else {
            return Err(self.unavailable());
        };

        let window = match (location.format, model.manifest.dicom.voi) {
            (ImageFormat::Dicom, DicomVoi::Minmax) => None,
            _ => Some((location.window_center, location.window_width)),
        };
        let (rgb, dicom_window) = decode::model_input_rgb(
            &location.path,
            location.format,
            location.frame_index,
            window,
            location.invert,
        )?;
        let prepared = preprocess::prepare(&rgb, &model.manifest.input);
        let record = preprocess::record(&rgb, &model.manifest.input, dicom_window);
        drop(rgb);

        let outputs = model.engine.run(prepared)?;
        let (interpretation, activation, activation_label) =
            interpret_outputs(&model.manifest, &outputs)?;

        Ok(AnalysisOutput {
            model: ModelIdentity {
                id: model.info.id.clone(),
                name: model.info.name.clone(),
                version: model.info.version.clone(),
                sha256: model.info.sha256.clone(),
                fixture: model.info.fixture,
            },
            interpretation,
            threshold: model.manifest.decision.threshold,
            low_confidence_band: model.manifest.decision.low_confidence_band,
            activation,
            activation_label,
            preprocessing: record,
            latency_ms: started.elapsed().as_millis() as u64,
        })
    }
}

/// Convenience for tests and tools: load a model folder directly.
pub fn load_directory(directory: &Path) -> (AiService, ModelStatus) {
    let service = AiService::default();
    let status = service.load(vec![Candidate::new(
        SourceKind::Configured,
        PathBuf::from(directory),
    )]);
    (service, status)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_model_reports_not_installed() {
        let empty = tempfile::tempdir().unwrap();
        let service = AiService::default();
        let status = service.load(vec![Candidate::new(
            SourceKind::AppData,
            empty.path().to_path_buf(),
        )]);
        assert_eq!(status.state, ModelState::NotInstalled);
        assert_eq!(status.searched.len(), 1);
        assert!(!service.is_ready());
    }

    #[test]
    fn explicit_folder_without_manifest_is_an_error() {
        let empty = tempfile::tempdir().unwrap();
        let (_, status) = load_directory(empty.path());
        assert_eq!(status.state, ModelState::Error);
    }

    #[test]
    fn invalid_manifest_fails_with_a_complete_report() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join(MANIFEST_FILE), "{ not json").unwrap();
        let (service, status) = load_directory(dir.path());
        assert_eq!(status.state, ModelState::Error);
        assert_eq!(status.checks.len(), 8);
        assert_eq!(status.checks[0].status, CheckStatus::Failed);
        assert!(status.checks[1..]
            .iter()
            .all(|check| check.status == CheckStatus::Skipped));
        let location = ImageLocation {
            id: "i".into(),
            exam_id: "e".into(),
            path: dir.path().join("x.png"),
            format: ImageFormat::Png,
            frame_index: 0,
            window_center: 127.5,
            window_width: 255.0,
            invert: false,
            width: 64,
            height: 64,
            original_name: "x.png".into(),
            sha256: String::new(),
        };
        assert!(matches!(
            service.analyze(&location),
            Err(AppError::ModelUnavailable(_))
        ));
    }

    #[test]
    fn missing_model_file_is_reported() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(
            dir.path().join(MANIFEST_FILE),
            manifest::tests::example_json(),
        )
        .unwrap();
        let (_, status) = load_directory(dir.path());
        assert_eq!(status.state, ModelState::Error);
        let file_check = status
            .checks
            .iter()
            .find(|check| check.id == "model_file")
            .unwrap();
        assert_eq!(file_check.status, CheckStatus::Failed);
    }

    #[test]
    fn corrupt_onnx_file_fails_at_the_runtime_check() {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(
            dir.path().join(MANIFEST_FILE),
            manifest::tests::example_json(),
        )
        .unwrap();
        std::fs::write(
            dir.path().join("neuroscan.onnx"),
            b"definitely not a protobuf",
        )
        .unwrap();
        let (_, status) = load_directory(dir.path());
        assert_eq!(status.state, ModelState::Error);
        let runtime = status
            .checks
            .iter()
            .find(|check| check.id == "runtime")
            .unwrap();
        assert_eq!(runtime.status, CheckStatus::Failed, "{:?}", status.checks);
    }

    #[test]
    fn checksum_mismatch_is_rejected_before_loading() {
        let dir = tempfile::tempdir().unwrap();
        let mut value: serde_json::Value =
            serde_json::from_str(&manifest::tests::example_json()).unwrap();
        value["model"]["sha256"] = serde_json::json!("0".repeat(64));
        std::fs::write(dir.path().join(MANIFEST_FILE), value.to_string()).unwrap();
        std::fs::write(dir.path().join("neuroscan.onnx"), b"bytes").unwrap();
        let (_, status) = load_directory(dir.path());
        let integrity = status
            .checks
            .iter()
            .find(|check| check.id == "integrity")
            .unwrap();
        assert_eq!(integrity.status, CheckStatus::Failed);
    }
}
