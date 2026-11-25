//! AI analysis records and the background analysis queue.
//!
//! Every inference result is an immutable record: the probabilities, the
//! verdict *and* the identity and checksum of the model that produced it,
//! the operating point it was judged against, the preprocessing applied and
//! the activation map. Re-analysing never overwrites; it adds a record, and
//! the latest one per image is what the workspace shows.
//!
//! Analyses run on one worker thread — one image in flight, matching the
//! memory budget of the target workstations — and report progress through
//! events, so the interface stays responsive and progress is real.

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::{Arc, Mutex};

use rusqlite::{params, Connection, Row};
use serde::Serialize;
use serde_json::{json, Value};

use crate::ai::postprocess::{ActivationMap, ClassProbability};
use crate::ai::{AiService, AnalysisOutput};
use crate::audit::{self, Actor};
use crate::auth::SessionUser;
use crate::db::Db;
use crate::error::{AppError, AppResult};
use crate::exams::{self, ExamStatus};
use crate::util::{new_id, now_rfc3339};

pub const PROGRESS_EVENT: &str = "analysis://progress";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalysisRecord {
    pub id: String,
    pub image_id: String,
    pub exam_id: String,
    pub status: String,
    pub model_id: String,
    pub model_name: String,
    pub model_version: String,
    pub model_sha256: Option<String>,
    pub model_fixture: bool,
    pub probability: Option<f64>,
    pub verdict: Option<String>,
    pub predicted_label: Option<String>,
    pub class_probabilities: Vec<ClassProbability>,
    pub threshold: Option<f64>,
    pub low_confidence_band: Option<f64>,
    pub activation_map: Option<ActivationMap>,
    pub activation_label: Option<String>,
    pub preprocessing: Option<Value>,
    pub latency_ms: Option<i64>,
    pub error: Option<String>,
    pub created_at: String,
    pub created_by_name: Option<String>,
}

const RECORD_COLUMNS: &str = "a.id, a.image_id, a.exam_id, a.status, a.model_id, a.model_name, a.model_version, a.model_sha256,
    a.model_fixture, a.probability, a.verdict, a.predicted_label, a.class_probabilities, a.threshold, a.low_confidence_band,
    a.activation_map, a.activation_label, a.preprocessing, a.latency_ms, a.error, a.created_at, u.full_name";

fn read_record(row: &Row<'_>) -> rusqlite::Result<AnalysisRecord> {
    let classes: Option<String> = row.get(12)?;
    let map: Option<String> = row.get(15)?;
    let preprocessing: Option<String> = row.get(17)?;
    Ok(AnalysisRecord {
        id: row.get(0)?,
        image_id: row.get(1)?,
        exam_id: row.get(2)?,
        status: row.get(3)?,
        model_id: row.get(4)?,
        model_name: row.get(5)?,
        model_version: row.get(6)?,
        model_sha256: row.get(7)?,
        model_fixture: row.get::<_, i64>(8)? != 0,
        probability: row.get(9)?,
        verdict: row.get(10)?,
        predicted_label: row.get(11)?,
        class_probabilities: classes
            .and_then(|text| serde_json::from_str(&text).ok())
            .unwrap_or_default(),
        threshold: row.get(13)?,
        low_confidence_band: row.get(14)?,
        activation_map: map.and_then(|text| serde_json::from_str(&text).ok()),
        activation_label: row.get(16)?,
        preprocessing: preprocessing.and_then(|text| serde_json::from_str(&text).ok()),
        latency_ms: row.get(18)?,
        error: row.get(19)?,
        created_at: row.get(20)?,
        created_by_name: row.get(21)?,
    })
}

/// Latest record per image of an examination.
pub fn latest_for_exam(
    conn: &Connection,
    exam_id: &str,
) -> AppResult<HashMap<String, AnalysisRecord>> {
    let mut statement = conn.prepare(&format!(
        "SELECT {RECORD_COLUMNS} FROM analyses a LEFT JOIN users u ON u.id = a.created_by
         WHERE a.exam_id = ?1
         ORDER BY a.created_at ASC"
    ))?;
    let mut latest = HashMap::new();
    for record in statement.query_map([exam_id], read_record)? {
        let record = record?;
        latest.insert(record.image_id.clone(), record);
    }
    Ok(latest)
}

/// Every record for one image, newest first.
pub fn history_for_image(conn: &Connection, image_id: &str) -> AppResult<Vec<AnalysisRecord>> {
    let mut statement = conn.prepare(&format!(
        "SELECT {RECORD_COLUMNS} FROM analyses a LEFT JOIN users u ON u.id = a.created_by
         WHERE a.image_id = ?1 ORDER BY a.created_at DESC"
    ))?;
    let records = statement
        .query_map([image_id], read_record)?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(records)
}

fn insert_completed(
    conn: &Connection,
    image_id: &str,
    exam_id: &str,
    output: &AnalysisOutput,
    user_id: &str,
) -> AppResult<()> {
    let activation = output
        .activation
        .as_ref()
        .map(serde_json::to_string)
        .transpose()?;
    conn.execute(
        "INSERT INTO analyses (id, image_id, exam_id, status, model_id, model_name, model_version, model_sha256, model_fixture,
                               probability, verdict, predicted_label, class_probabilities, threshold, low_confidence_band,
                               activation_map, activation_label, preprocessing, latency_ms, created_at, created_by)
         VALUES (?1, ?2, ?3, 'completed', ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)",
        params![
            new_id(),
            image_id,
            exam_id,
            output.model.id,
            output.model.name,
            output.model.version,
            output.model.sha256,
            output.model.fixture as i64,
            output.interpretation.probability,
            output.interpretation.verdict.as_str(),
            output.interpretation.predicted_label,
            serde_json::to_string(&output.interpretation.classes)?,
            output.threshold,
            output.low_confidence_band,
            activation,
            output.activation_label,
            serde_json::to_string(&output.preprocessing)?,
            output.latency_ms as i64,
            now_rfc3339(),
            user_id
        ],
    )?;
    Ok(())
}

fn insert_failed(
    conn: &Connection,
    image_id: &str,
    exam_id: &str,
    model: Option<&crate::ai::ModelInfo>,
    error: &str,
    user_id: &str,
) -> AppResult<()> {
    conn.execute(
        "INSERT INTO analyses (id, image_id, exam_id, status, model_id, model_name, model_version, model_sha256, model_fixture,
                               error, created_at, created_by)
         VALUES (?1, ?2, ?3, 'failed', ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            new_id(),
            image_id,
            exam_id,
            model.map(|m| m.id.as_str()).unwrap_or("unavailable"),
            model.map(|m| m.name.as_str()).unwrap_or("—"),
            model.map(|m| m.version.as_str()).unwrap_or("—"),
            model.map(|m| m.sha256.as_str()),
            model.map(|m| m.fixture as i64).unwrap_or(0),
            error,
            now_rfc3339(),
            user_id
        ],
    )?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum JobState {
    Queued,
    Running,
    Completed,
    Cancelled,
    Failed,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JobProgress {
    pub id: String,
    pub exam_id: String,
    pub state: JobState,
    pub total: usize,
    pub done: usize,
    pub failed: usize,
    pub current_image_id: Option<String>,
    pub last_image_id: Option<String>,
    pub cancel_requested: bool,
    pub error: Option<String>,
    pub queued_at: String,
    pub started_at: Option<String>,
    pub finished_at: Option<String>,
}

struct Job {
    id: String,
    exam_id: String,
    image_ids: Vec<String>,
    user: SessionUser,
}

pub type Emitter = Arc<dyn Fn(&str, Value) + Send + Sync>;

pub struct AnalysisQueue {
    sender: Mutex<Sender<Job>>,
    jobs: Arc<Mutex<Vec<JobProgress>>>,
    busy: Arc<AtomicBool>,
}

impl AnalysisQueue {
    /// Start the worker thread.
    pub fn start(db: Arc<Db>, ai: Arc<AiService>, data_dir: PathBuf, emit: Emitter) -> Self {
        let (sender, receiver) = mpsc::channel::<Job>();
        let jobs: Arc<Mutex<Vec<JobProgress>>> = Arc::new(Mutex::new(Vec::new()));
        let busy = Arc::new(AtomicBool::new(false));
        let worker = Worker {
            db,
            ai,
            data_dir,
            emit,
            jobs: jobs.clone(),
            busy: busy.clone(),
        };
        std::thread::Builder::new()
            .name("neuroscan-analysis".into())
            .spawn(move || worker.run(receiver))
            .expect("the analysis worker thread could not start");
        Self {
            sender: Mutex::new(sender),
            jobs,
            busy,
        }
    }

    /// True while any job is queued or running (read by the quit guard).
    pub fn is_busy(&self) -> bool {
        self.busy.load(Ordering::SeqCst)
            || self
                .jobs
                .lock()
                .map(|jobs| {
                    jobs.iter()
                        .any(|job| matches!(job.state, JobState::Queued | JobState::Running))
                })
                .unwrap_or(false)
    }

    pub fn active_for_exam(&self, exam_id: &str) -> Option<JobProgress> {
        self.jobs
            .lock()
            .ok()?
            .iter()
            .rev()
            .find(|job| {
                job.exam_id == exam_id && matches!(job.state, JobState::Queued | JobState::Running)
            })
            .cloned()
    }

    pub fn jobs(&self) -> Vec<JobProgress> {
        self.jobs
            .lock()
            .map(|jobs| jobs.clone())
            .unwrap_or_default()
    }

    pub fn enqueue(
        &self,
        exam_id: &str,
        image_ids: Vec<String>,
        user: &SessionUser,
    ) -> AppResult<JobProgress> {
        if image_ids.is_empty() {
            return Err(AppError::InvalidState(
                "There are no images to analyze.".into(),
            ));
        }
        if let Some(active) = self.active_for_exam(exam_id) {
            return Err(AppError::Conflict(format!(
                "An analysis of this examination is already {} ({} of {} images done).",
                if active.state == JobState::Queued {
                    "queued"
                } else {
                    "running"
                },
                active.done,
                active.total
            )));
        }
        let progress = JobProgress {
            id: new_id(),
            exam_id: exam_id.to_string(),
            state: JobState::Queued,
            total: image_ids.len(),
            done: 0,
            failed: 0,
            current_image_id: None,
            last_image_id: None,
            cancel_requested: false,
            error: None,
            queued_at: now_rfc3339(),
            started_at: None,
            finished_at: None,
        };
        {
            let mut jobs = self.jobs.lock()?;
            // Keep a short history of finished jobs for the UI.
            jobs.retain(|job| {
                matches!(job.state, JobState::Queued | JobState::Running)
                    || job.finished_at.is_some()
            });
            if jobs.len() > 20 {
                let excess = jobs.len() - 20;
                jobs.drain(0..excess);
            }
            jobs.push(progress.clone());
        }
        self.sender
            .lock()?
            .send(Job {
                id: progress.id.clone(),
                exam_id: exam_id.to_string(),
                image_ids,
                user: user.clone(),
            })
            .map_err(|_| {
                AppError::internal("The analysis worker has stopped. Restart NeuroScan.")
            })?;
        Ok(progress)
    }

    pub fn cancel(&self, job_id: &str) -> AppResult<JobProgress> {
        let mut jobs = self.jobs.lock()?;
        let job = jobs
            .iter_mut()
            .find(|job| job.id == job_id)
            .ok_or(AppError::NotFound("Analysis job"))?;
        if matches!(job.state, JobState::Queued | JobState::Running) {
            job.cancel_requested = true;
        }
        Ok(job.clone())
    }
}

struct Worker {
    db: Arc<Db>,
    ai: Arc<AiService>,
    data_dir: PathBuf,
    emit: Emitter,
    jobs: Arc<Mutex<Vec<JobProgress>>>,
    busy: Arc<AtomicBool>,
}

impl Worker {
    fn run(self, receiver: Receiver<Job>) {
        while let Ok(job) = receiver.recv() {
            self.busy.store(true, Ordering::SeqCst);
            self.process(job);
            self.busy.store(false, Ordering::SeqCst);
        }
    }

    fn update(&self, job_id: &str, change: impl FnOnce(&mut JobProgress)) -> Option<JobProgress> {
        let mut jobs = self.jobs.lock().ok()?;
        let job = jobs.iter_mut().find(|job| job.id == job_id)?;
        change(job);
        let snapshot = job.clone();
        drop(jobs);
        (self.emit)(
            PROGRESS_EVENT,
            serde_json::to_value(&snapshot).unwrap_or(Value::Null),
        );
        Some(snapshot)
    }

    fn cancel_requested(&self, job_id: &str) -> bool {
        self.jobs
            .lock()
            .map(|jobs| {
                jobs.iter()
                    .any(|job| job.id == job_id && job.cancel_requested)
            })
            .unwrap_or(false)
    }

    fn process(&self, job: Job) {
        let model = self.ai.info();
        let started = self.db.transaction(|tx| {
            exams::ensure_editable_id(tx, &job.exam_id)?;
            exams::set_status(tx, &job.exam_id, ExamStatus::Analyzing)?;
            audit::record(
                tx,
                Actor::User(&job.user),
                "analysis_started",
                Some(("examination", &job.exam_id)),
                json!({
                    "jobId": job.id,
                    "images": job.image_ids.len(),
                    "modelId": model.as_ref().map(|m| m.id.clone()),
                    "modelVersion": model.as_ref().map(|m| m.version.clone()),
                    "modelSha256": model.as_ref().map(|m| m.sha256.clone()),
                }),
            )
        });
        if let Err(error) = started {
            self.update(&job.id, |progress| {
                progress.state = JobState::Failed;
                progress.error = Some(error.to_string());
                progress.finished_at = Some(now_rfc3339());
            });
            return;
        }
        self.update(&job.id, |progress| {
            progress.state = JobState::Running;
            progress.started_at = Some(now_rfc3339());
        });

        let mut done = 0;
        let mut failed = 0;
        let mut verdicts: HashMap<&'static str, usize> = HashMap::new();
        let mut cancelled = false;

        for image_id in &job.image_ids {
            if self.cancel_requested(&job.id) {
                cancelled = true;
                break;
            }
            self.update(&job.id, |progress| {
                progress.current_image_id = Some(image_id.clone())
            });

            let outcome = self
                .db
                .with(|conn| crate::imaging::locate(conn, &self.data_dir, image_id))
                .and_then(|location| {
                    if location.exam_id != job.exam_id {
                        return Err(AppError::invalid(
                            "The image belongs to another examination.",
                        ));
                    }
                    if !location.path.is_file() {
                        return Err(AppError::InvalidState(
                            "The stored image file is missing; it cannot be analyzed.".into(),
                        ));
                    }
                    self.ai.analyze(&location)
                });

            let persisted = match &outcome {
                Ok(output) => {
                    *verdicts
                        .entry(output.interpretation.verdict.as_str())
                        .or_default() += 1;
                    self.db.with(|conn| {
                        insert_completed(conn, image_id, &job.exam_id, output, &job.user.id)
                    })
                }
                Err(AppError::NotFound(_)) => Ok(()), // removed while queued
                Err(error) => {
                    failed += 1;
                    let message = error.to_string();
                    let model = self.ai.info();
                    self.db.with(|conn| {
                        insert_failed(
                            conn,
                            image_id,
                            &job.exam_id,
                            model.as_ref(),
                            &message,
                            &job.user.id,
                        )
                    })
                }
            };
            if let Err(error) = persisted {
                failed += 1;
                eprintln!("neuroscan: could not store an analysis result: {error}");
            }
            done += 1;
            self.update(&job.id, |progress| {
                progress.done = done;
                progress.failed = failed;
                progress.last_image_id = Some(image_id.clone());
                progress.current_image_id = None;
            });

            // A model that disappeared mid-run fails every remaining image the
            // same way; stop instead of recording identical failures.
            if matches!(outcome, Err(AppError::ModelUnavailable(_))) {
                break;
            }
        }

        let finished = self.db.transaction(|tx| {
            if exams::status_of(tx, &job.exam_id)? == ExamStatus::Analyzing {
                let any_results: i64 = tx.query_row(
                    "SELECT COUNT(*) FROM analyses WHERE exam_id = ?1",
                    [&job.exam_id],
                    |row| row.get(0),
                )?;
                let next = if any_results > 0 {
                    ExamStatus::AwaitingReview
                } else {
                    ExamStatus::Ready
                };
                exams::set_status(tx, &job.exam_id, next)?;
            }
            audit::record(
                tx,
                Actor::User(&job.user),
                if cancelled {
                    "analysis_cancelled"
                } else {
                    "analysis_completed"
                },
                Some(("examination", &job.exam_id)),
                json!({
                    "jobId": job.id,
                    "processed": done,
                    "failed": failed,
                    "verdicts": verdicts,
                }),
            )
        });

        self.update(&job.id, |progress| {
            progress.state = if cancelled {
                JobState::Cancelled
            } else if failed > 0 && failed == done {
                JobState::Failed
            } else {
                JobState::Completed
            };
            if let Err(error) = &finished {
                progress.error = Some(error.to_string());
            } else if failed > 0 && progress.error.is_none() {
                progress.error = Some(format!("{failed} of {done} images could not be analyzed."));
            }
            progress.current_image_id = None;
            progress.finished_at = Some(now_rfc3339());
        });
    }
}

/// Wait (in tests) until the queue has drained.
#[cfg(test)]
pub fn wait_idle(queue: &AnalysisQueue) {
    for _ in 0..600 {
        if !queue.is_busy() {
            return;
        }
        std::thread::sleep(std::time::Duration::from_millis(20));
    }
    panic!("analysis queue did not drain");
}
