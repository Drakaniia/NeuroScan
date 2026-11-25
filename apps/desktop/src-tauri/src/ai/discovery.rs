//! Where the application looks for a model.
//!
//! An explicit choice is authoritative: when an administrator configured a
//! folder, or `NEUROSCAN_MODEL_DIR` is set, only that folder is considered and
//! a problem there is reported as an error — never silently replaced by some
//! other model found elsewhere. Without an explicit choice the first folder
//! containing `run-config.json` wins, in this order:
//!
//! 1. `<app data>/models` — drop-in installation on a workstation;
//! 2. `<install dir>/models` — a model bundled with the installer;
//! 3. development builds only: `src-tauri/models` and the repository's `models/`.

use std::path::{Path, PathBuf};

use serde::Serialize;

use super::manifest::MANIFEST_FILE;

pub const MODEL_DIR_ENV: &str = "NEUROSCAN_MODEL_DIR";

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SourceKind {
    Configured,
    Environment,
    AppData,
    Bundled,
    Development,
}

impl SourceKind {
    pub fn is_explicit(self) -> bool {
        matches!(self, SourceKind::Configured | SourceKind::Environment)
    }
}

#[derive(Debug, Clone)]
pub struct Candidate {
    pub kind: SourceKind,
    pub directory: PathBuf,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchedLocation {
    pub kind: SourceKind,
    pub directory: String,
    pub has_manifest: bool,
}

impl Candidate {
    pub fn new(kind: SourceKind, directory: PathBuf) -> Self {
        Self { kind, directory }
    }

    pub fn has_manifest(&self) -> bool {
        self.directory.join(MANIFEST_FILE).is_file()
    }

    pub fn searched(&self) -> SearchedLocation {
        SearchedLocation {
            kind: self.kind,
            directory: self.directory.display().to_string(),
            has_manifest: self.has_manifest(),
        }
    }
}

pub struct DiscoveryInputs<'a> {
    pub configured: Option<&'a str>,
    pub environment: Option<String>,
    pub app_data_models: PathBuf,
    pub bundled_models: Option<PathBuf>,
    pub include_development: bool,
}

pub fn candidates(inputs: DiscoveryInputs<'_>) -> Vec<Candidate> {
    if let Some(configured) = inputs
        .configured
        .map(str::trim)
        .filter(|path| !path.is_empty())
    {
        return vec![Candidate::new(
            SourceKind::Configured,
            PathBuf::from(configured),
        )];
    }
    if let Some(environment) = inputs.environment.filter(|path| !path.trim().is_empty()) {
        return vec![Candidate::new(
            SourceKind::Environment,
            PathBuf::from(environment.trim()),
        )];
    }

    let mut list = vec![Candidate::new(SourceKind::AppData, inputs.app_data_models)];
    if let Some(bundled) = inputs.bundled_models {
        list.push(Candidate::new(SourceKind::Bundled, bundled));
    }
    if inputs.include_development {
        let manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
        list.push(Candidate::new(
            SourceKind::Development,
            manifest_dir.join("models"),
        ));
        if let Some(repo) = manifest_dir.ancestors().nth(3) {
            list.push(Candidate::new(SourceKind::Development, repo.join("models")));
        }
    }
    // Two sources can resolve to the same folder; search each once.
    let mut seen = Vec::new();
    list.retain(|candidate| {
        let key = candidate.directory.to_string_lossy().to_lowercase();
        if seen.contains(&key) {
            false
        } else {
            seen.push(key);
            true
        }
    });
    list
}

#[cfg(test)]
mod tests {
    use super::*;

    fn inputs<'a>(configured: Option<&'a str>, environment: Option<&str>) -> DiscoveryInputs<'a> {
        DiscoveryInputs {
            configured,
            environment: environment.map(str::to_string),
            app_data_models: PathBuf::from("C:/data/models"),
            bundled_models: Some(PathBuf::from("C:/app/models")),
            include_development: false,
        }
    }

    #[test]
    fn explicit_configuration_is_authoritative() {
        let list = candidates(inputs(Some("D:/models/v2"), Some("E:/other")));
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].kind, SourceKind::Configured);

        let list = candidates(inputs(None, Some("E:/other")));
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].kind, SourceKind::Environment);
    }

    #[test]
    fn default_search_order() {
        let list = candidates(inputs(None, None));
        let kinds: Vec<_> = list.iter().map(|candidate| candidate.kind).collect();
        assert_eq!(kinds, vec![SourceKind::AppData, SourceKind::Bundled]);
    }
}
