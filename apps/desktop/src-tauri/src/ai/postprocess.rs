//! Manifest-driven postprocessing: raw scores → probabilities → screening
//! verdict, plus the class activation map (CAM).
//!
//! The screening probability is the summed probability of every class the
//! manifest marks as a positive finding, so a binary model and a future
//! multi-class tumour-typing model are read the same way. The verdict applies
//! the manifest's validated operating point: inside ±band of τ the result is
//! *indeterminate* and is never presented as a decision.

use serde::{Deserialize, Serialize};

use super::manifest::{Activation, Finding, Layout, OutputSection};
use crate::error::{AppError, AppResult};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Verdict {
    Positive,
    Negative,
    Indeterminate,
}

impl Verdict {
    pub fn as_str(self) -> &'static str {
        match self {
            Verdict::Positive => "positive",
            Verdict::Negative => "negative",
            Verdict::Indeterminate => "indeterminate",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClassProbability {
    pub label: String,
    pub display_name: String,
    pub finding: Finding,
    pub probability: f64,
}

#[derive(Debug, Clone)]
pub struct Interpretation {
    pub probability: f64,
    pub verdict: Verdict,
    pub predicted_index: usize,
    pub predicted_label: String,
    pub classes: Vec<ClassProbability>,
}

/// Normalised activation map, row-major, values in 0–1.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivationMap {
    pub width: usize,
    pub height: usize,
    pub values: Vec<f32>,
}

pub fn softmax(scores: &[f32]) -> Vec<f64> {
    let max = scores.iter().copied().fold(f32::NEG_INFINITY, f32::max) as f64;
    let exps: Vec<f64> = scores.iter().map(|&s| ((s as f64) - max).exp()).collect();
    let sum: f64 = exps.iter().sum();
    exps.into_iter().map(|value| value / sum).collect()
}

pub fn sigmoid(score: f32) -> f64 {
    1.0 / (1.0 + (-(score as f64)).exp())
}

pub fn verdict_for(probability: f64, threshold: f64, band: f64) -> Verdict {
    if (probability - threshold).abs() <= band {
        Verdict::Indeterminate
    } else if probability >= threshold {
        Verdict::Positive
    } else {
        Verdict::Negative
    }
}

pub fn interpret(
    scores: &[f32],
    output: &OutputSection,
    threshold: f64,
    band: f64,
) -> AppResult<Interpretation> {
    if scores.iter().any(|score| !score.is_finite()) {
        return Err(AppError::Inference(
            "The model returned non-finite scores (NaN or infinity); the result was discarded."
                .into(),
        ));
    }
    let classes = &output.classes;
    let probabilities: Vec<f64> = match output.activation {
        Activation::Sigmoid => {
            if scores.len() != 1 {
                return Err(AppError::Inference(format!(
                    "A sigmoid model must output one score; this one produced {}.",
                    scores.len()
                )));
            }
            let positive = sigmoid(scores[0]);
            classes
                .iter()
                .map(|class| match class.finding {
                    Finding::Positive => positive,
                    Finding::Negative => 1.0 - positive,
                })
                .collect()
        }
        Activation::Softmax | Activation::None => {
            if scores.len() != classes.len() {
                return Err(AppError::Inference(format!(
                    "The model produced {} scores but its manifest lists {} classes.",
                    scores.len(),
                    classes.len()
                )));
            }
            if output.activation == Activation::Softmax {
                softmax(scores)
            } else {
                let values: Vec<f64> = scores.iter().map(|&s| s as f64).collect();
                let sum: f64 = values.iter().sum();
                if values.iter().any(|value| *value < -1e-6) || (sum - 1.0).abs() > 1e-3 {
                    return Err(AppError::Inference(
                        "The manifest declares probability outputs, but the scores do not sum to 1."
                            .into(),
                    ));
                }
                values
            }
        }
    };

    let probability: f64 = classes
        .iter()
        .zip(&probabilities)
        .filter(|(class, _)| class.finding == Finding::Positive)
        .map(|(_, p)| *p)
        .sum::<f64>()
        .clamp(0.0, 1.0);

    let predicted_index = probabilities
        .iter()
        .enumerate()
        .max_by(|a, b| a.1.partial_cmp(b.1).unwrap_or(std::cmp::Ordering::Equal))
        .map(|(index, _)| index)
        .unwrap_or(0);

    Ok(Interpretation {
        probability,
        verdict: verdict_for(probability, threshold, band),
        predicted_index,
        predicted_label: classes[predicted_index].display(),
        classes: classes
            .iter()
            .zip(&probabilities)
            .map(|(class, p)| ClassProbability {
                label: class.label.clone(),
                display_name: class.display(),
                finding: class.finding,
                probability: *p,
            })
            .collect(),
    })
}

/// Classical, gradient-free CAM (Zhou et al., 2016):
/// `M = ReLU(Σ_k w[c][k] · f_k)`, min–max normalised.
///
/// `features` is `[1, C, h, w]` (or `[1, h, w, C]`), `weights` is `[K, C]`.
/// For a single-logit sigmoid head (`K == 1`) the negative class uses the
/// negated weights. Returns `None` when the map carries no information
/// (uniform, or no positive evidence anywhere) — the caller then shows the
/// plain image rather than a misleading overlay.
pub fn class_activation_map(
    features: (&[i64], &[f32]),
    weights: (&[i64], &[f32]),
    features_layout: Layout,
    class_index: usize,
    class_is_positive: bool,
) -> AppResult<Option<ActivationMap>> {
    let (feature_shape, feature_data) = features;
    let (weight_shape, weight_data) = weights;
    if feature_shape.len() != 4 || feature_shape[0] != 1 {
        return Err(AppError::Inference(format!(
            "Feature map must have shape [1, C, h, w]; got {feature_shape:?}."
        )));
    }
    let (channels, height, width) = match features_layout {
        Layout::Nchw => (feature_shape[1], feature_shape[2], feature_shape[3]),
        Layout::Nhwc => (feature_shape[3], feature_shape[1], feature_shape[2]),
    };
    let (channels, height, width) = (channels as usize, height as usize, width as usize);
    if weight_shape.len() != 2 || weight_shape[1] as usize != channels {
        return Err(AppError::Inference(format!(
            "Head weights must have shape [classes, {channels}]; got {weight_shape:?}."
        )));
    }
    if feature_data.len() != channels * height * width
        || weight_data.len() != (weight_shape[0] as usize) * channels
    {
        return Err(AppError::Inference(
            "Feature map or head weights do not match their declared shapes.".into(),
        ));
    }

    let rows = weight_shape[0] as usize;
    let (row, sign) = if rows == 1 {
        (0, if class_is_positive { 1.0 } else { -1.0 })
    } else if class_index < rows {
        (class_index, 1.0)
    } else {
        return Err(AppError::Inference(format!(
            "Head weights have {rows} rows; no row for class {class_index}."
        )));
    };
    let class_weights = &weight_data[row * channels..(row + 1) * channels];

    let plane = height * width;
    let mut map = vec![0f32; plane];
    for (k, &weight) in class_weights.iter().enumerate() {
        let weight = weight * sign;
        for (position, value) in map.iter_mut().enumerate() {
            let feature = match features_layout {
                Layout::Nchw => feature_data[k * plane + position],
                Layout::Nhwc => feature_data[position * channels + k],
            };
            *value += weight * feature;
        }
    }
    for value in &mut map {
        *value = value.max(0.0);
    }
    let (min, max) = map
        .iter()
        .fold((f32::INFINITY, f32::NEG_INFINITY), |(lo, hi), &v| {
            (lo.min(v), hi.max(v))
        });
    if !min.is_finite() || !max.is_finite() || max - min <= 1e-6 || max <= 0.0 {
        return Ok(None);
    }
    let span = max - min;
    for value in &mut map {
        *value = (*value - min) / span;
    }
    Ok(Some(ActivationMap {
        width,
        height,
        values: map,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ai::manifest::ClassSpec;

    fn binary(activation: Activation) -> OutputSection {
        OutputSection {
            scores: "logits".into(),
            activation,
            classes: vec![
                ClassSpec {
                    label: "no_tumor".into(),
                    display_name: Some("No tumor".into()),
                    finding: Finding::Negative,
                },
                ClassSpec {
                    label: "tumor".into(),
                    display_name: Some("Tumor".into()),
                    finding: Finding::Positive,
                },
            ],
        }
    }

    #[test]
    fn softmax_is_stable_and_normalised() {
        let p = softmax(&[1000.0, 1001.0]);
        assert!((p.iter().sum::<f64>() - 1.0).abs() < 1e-12);
        assert!(p[1] > p[0]);
    }

    #[test]
    fn verdict_respects_the_low_confidence_band() {
        assert_eq!(verdict_for(0.47, 0.45, 0.05), Verdict::Indeterminate);
        assert_eq!(verdict_for(0.40, 0.45, 0.05), Verdict::Indeterminate);
        assert_eq!(verdict_for(0.51, 0.45, 0.05), Verdict::Positive);
        assert_eq!(verdict_for(0.39, 0.45, 0.05), Verdict::Negative);
    }

    #[test]
    fn interprets_softmax_and_sigmoid_models() {
        let softmax_result =
            interpret(&[0.0, 2.0], &binary(Activation::Softmax), 0.45, 0.05).unwrap();
        assert!((softmax_result.probability - 0.880797).abs() < 1e-5);
        assert_eq!(softmax_result.verdict, Verdict::Positive);
        assert_eq!(softmax_result.predicted_label, "Tumor");

        let sigmoid_result = interpret(&[-3.0], &binary(Activation::Sigmoid), 0.45, 0.05).unwrap();
        assert!(sigmoid_result.probability < 0.05);
        assert_eq!(sigmoid_result.verdict, Verdict::Negative);
        assert_eq!(sigmoid_result.predicted_label, "No tumor");
    }

    #[test]
    fn multiclass_screening_sums_positive_classes() {
        let output = OutputSection {
            scores: "logits".into(),
            activation: Activation::None,
            classes: ["glioma", "meningioma", "no_tumor", "pituitary"]
                .iter()
                .map(|label| ClassSpec {
                    label: (*label).into(),
                    display_name: None,
                    finding: if *label == "no_tumor" {
                        Finding::Negative
                    } else {
                        Finding::Positive
                    },
                })
                .collect(),
        };
        let result = interpret(&[0.1, 0.2, 0.6, 0.1], &output, 0.45, 0.05).unwrap();
        assert!((result.probability - 0.4).abs() < 1e-6);
        assert_eq!(result.verdict, Verdict::Indeterminate);
        assert_eq!(result.predicted_label, "no_tumor");
    }

    #[test]
    fn rejects_mismatched_or_invalid_scores() {
        assert!(interpret(&[0.1, 0.2, 0.3], &binary(Activation::Softmax), 0.5, 0.0).is_err());
        assert!(interpret(&[f32::NAN, 0.2], &binary(Activation::Softmax), 0.5, 0.0).is_err());
        assert!(interpret(&[0.7, 0.7], &binary(Activation::None), 0.5, 0.0).is_err());
    }

    #[test]
    fn cam_weights_features_and_normalises() {
        // C = 2, 2×2 map. Class 1 weights pick channel 0 positively, channel 1 negatively.
        let features: Vec<f32> = vec![1.0, 2.0, 3.0, 4.0, /* ch1 */ 4.0, 0.0, 0.0, 0.0];
        let weights: Vec<f32> = vec![0.0, 0.0, /* class 1 */ 1.0, -1.0];
        let map = class_activation_map(
            (&[1, 2, 2, 2], &features),
            (&[2, 2], &weights),
            Layout::Nchw,
            1,
            true,
        )
        .unwrap()
        .unwrap();
        // Raw: [-3, 2, 3, 4] → ReLU [0, 2, 3, 4] → normalised.
        assert_eq!(map.values, vec![0.0, 0.5, 0.75, 1.0]);
    }

    #[test]
    fn cam_without_positive_evidence_is_absent() {
        let features = vec![1.0f32; 4];
        let weights = vec![-1.0f32, -1.0];
        let map = class_activation_map(
            (&[1, 1, 2, 2], &features),
            (&[2, 1], &weights),
            Layout::Nchw,
            0,
            false,
        )
        .unwrap();
        assert!(map.is_none());
    }

    #[test]
    fn cam_rejects_shape_mismatches() {
        let result = class_activation_map(
            (&[1, 3, 2, 2], &[0.0; 12]),
            (&[2, 2], &[0.0; 4]),
            Layout::Nchw,
            0,
            true,
        );
        assert!(result.is_err());
    }
}
