//! The model adapter boundary.
//!
//! [`InferenceEngine`] is the only interface the rest of the application uses
//! to run a model: tensors in, named tensors out. [`OnnxEngine`] implements it
//! with ONNX Runtime on the CPU. Another runtime (DirectML, OpenVINO, a remote
//! service) would be a second implementation of the same trait; nothing above
//! this module would change.

use std::path::Path;
use std::sync::OnceLock;

use ort::environment::Environment;
use ort::session::builder::GraphOptimizationLevel;
use ort::session::Session;
use ort::value::Tensor;
use serde::Serialize;

use super::manifest::Manifest;
use super::preprocess::PreparedInput;
use crate::error::{AppError, AppResult};

/// A named tensor as the model reports it. `-1` marks a dynamic dimension.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TensorSpec {
    pub name: String,
    pub element_type: String,
    pub shape: Vec<i64>,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelSignature {
    pub inputs: Vec<TensorSpec>,
    pub outputs: Vec<TensorSpec>,
}

impl ModelSignature {
    pub fn input(&self, name: &str) -> Option<&TensorSpec> {
        self.inputs.iter().find(|spec| spec.name == name)
    }

    pub fn output(&self, name: &str) -> Option<&TensorSpec> {
        self.outputs.iter().find(|spec| spec.name == name)
    }
}

/// An output tensor copied out of the runtime: shape and row-major data.
#[derive(Debug, Clone)]
pub struct OutputTensor {
    pub shape: Vec<i64>,
    pub data: Vec<f32>,
}

#[derive(Debug, Clone)]
pub struct RawOutputs {
    pub scores: OutputTensor,
    pub features: Option<OutputTensor>,
    pub weights: Option<OutputTensor>,
}

pub trait InferenceEngine: Send {
    fn signature(&self) -> &ModelSignature;
    fn runtime(&self) -> String;
    fn run(&mut self, input: PreparedInput) -> AppResult<RawOutputs>;
}

fn runtime_error(context: &str, error: impl std::fmt::Display) -> AppError {
    AppError::ModelUnavailable(format!("{context}: {error}"))
}

/// The process-wide ONNX Runtime environment. ONNX Runtime allows exactly one
/// per process, so it is created once and shared by every model (re)load.
fn environment() -> AppResult<&'static Environment> {
    static ENVIRONMENT: OnceLock<Result<Environment, String>> = OnceLock::new();
    ENVIRONMENT
        .get_or_init(|| {
            ort::init()
                .with_name("neuroscan")
                .build()
                .map_err(|error| error.to_string())
        })
        .as_ref()
        .map_err(|error| {
            AppError::ModelUnavailable(format!("ONNX Runtime could not start: {error}"))
        })
}

pub struct OnnxEngine {
    session: Session,
    input_name: String,
    scores_name: String,
    features_name: Option<String>,
    weights_name: Option<String>,
    signature: ModelSignature,
}

fn spec_of(name: &str, dtype: &ort::value::ValueType) -> TensorSpec {
    TensorSpec {
        name: name.to_string(),
        element_type: dtype
            .tensor_type()
            .map(|ty| format!("{ty:?}").to_lowercase())
            .unwrap_or_else(|| format!("{dtype}")),
        shape: dtype
            .tensor_shape()
            .map(|shape| shape.iter().copied().collect())
            .unwrap_or_default(),
    }
}

impl OnnxEngine {
    pub fn load(model_path: &Path, manifest: &Manifest) -> AppResult<Self> {
        let environment = environment()?;
        let threads = std::thread::available_parallelism()
            .map(|n| n.get().clamp(1, 4))
            .unwrap_or(2);
        let session = Session::builder(environment)
            .map_err(|e| runtime_error("Could not create an inference session", e))?
            .with_optimization_level(GraphOptimizationLevel::Level3)
            .map_err(|e| runtime_error("Could not configure graph optimisation", e))?
            .with_intra_threads(threads)
            .map_err(|e| runtime_error("Could not configure inference threads", e))?
            .commit_from_file(model_path)
            .map_err(|e| runtime_error("ONNX Runtime could not load the model file", e))?;

        let signature = ModelSignature {
            inputs: session
                .inputs()
                .iter()
                .map(|outlet| spec_of(outlet.name(), outlet.dtype()))
                .collect(),
            outputs: session
                .outputs()
                .iter()
                .map(|outlet| spec_of(outlet.name(), outlet.dtype()))
                .collect(),
        };

        let explain = manifest.explainability.as_ref();
        Ok(Self {
            session,
            input_name: manifest.input.name.clone(),
            scores_name: manifest.output.scores.clone(),
            features_name: explain.map(|e| e.features.clone()),
            weights_name: explain.map(|e| e.weights.clone()),
            signature,
        })
    }

    fn extract(outputs: &ort::session::SessionOutputs<'_>, name: &str) -> AppResult<OutputTensor> {
        let value = outputs.get(name).ok_or_else(|| {
            AppError::Inference(format!("The model did not produce the output '{name}'."))
        })?;
        let (shape, data) = value.try_extract_tensor::<f32>().map_err(|error| {
            AppError::Inference(format!("Output '{name}' is not a float32 tensor: {error}"))
        })?;
        Ok(OutputTensor {
            shape: shape.iter().copied().collect(),
            data: data.to_vec(),
        })
    }
}

impl InferenceEngine for OnnxEngine {
    fn signature(&self) -> &ModelSignature {
        &self.signature
    }

    fn runtime(&self) -> String {
        "ONNX Runtime (CPU)".to_string()
    }

    fn run(&mut self, input: PreparedInput) -> AppResult<RawOutputs> {
        let tensor = Tensor::from_array((input.shape, input.data)).map_err(|error| {
            AppError::Inference(format!("Could not build the input tensor: {error}"))
        })?;
        let outputs = self
            .session
            .run(ort::inputs![self.input_name.as_str() => tensor])
            .map_err(|error| AppError::Inference(format!("Inference failed: {error}")))?;

        let scores = Self::extract(&outputs, &self.scores_name)?;
        let features = match &self.features_name {
            Some(name) => Some(Self::extract(&outputs, name)?),
            None => None,
        };
        let weights = match &self.weights_name {
            Some(name) => Some(Self::extract(&outputs, name)?),
            None => None,
        };
        Ok(RawOutputs {
            scores,
            features,
            weights,
        })
    }
}
