/**
 * Wire types for the Tauri command layer (`src-tauri/src/commands.rs`).
 *
 * These mirror the Rust structs exactly (serde `camelCase` unless noted). The
 * backend is the source of truth; nothing here invents data the backend does
 * not send.
 */

// Accounts and session -------------------------------------------------------

export type Role = "admin" | "radiologist" | "technologist" | "viewer";

export type Permission =
  | "patient_read"
  | "patient_write"
  | "exam_read"
  | "exam_write"
  | "analysis_run"
  | "review_sign"
  | "report_export"
  | "audit_read"
  | "user_manage"
  | "settings_manage"
  | "model_manage";

export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  mustChangePassword: boolean;
}

export interface SessionInfo {
  user: SessionUser;
  permissions: Permission[];
  locked: boolean;
  startedAt: string;
  timeoutMinutes: number;
}

export interface Bootstrap {
  setupRequired: boolean;
  session: SessionInfo | null;
  appVersion: string;
  facilityName: string | null;
}

export interface SetupInput {
  facilityName: string;
  department: string | null;
  username: string;
  fullName: string;
  password: string;
}

export interface UserSummary {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface NewUserInput {
  username: string;
  fullName: string;
  role: Role;
  password: string;
}

export interface UpdateUserInput {
  fullName: string;
  role: Role;
  isActive: boolean;
}

// Patients -------------------------------------------------------------------

export type Sex = "female" | "male" | "other" | "unknown";

export interface Patient {
  id: string;
  mrn: string;
  givenName: string;
  familyName: string;
  sex: Sex;
  birthDate: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientSummary extends Patient {
  examCount: number;
  openExamCount: number;
  lastStudyDate: string | null;
}

export interface PatientPage {
  items: PatientSummary[];
  total: number;
}

export interface PatientQuery {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PatientInput {
  mrn: string;
  givenName: string;
  familyName: string;
  sex: Sex;
  birthDate: string | null;
  phone: string | null;
  notes: string | null;
}

// Examinations ---------------------------------------------------------------

export type ExamStatus =
  | "awaiting_images"
  | "ready"
  | "analyzing"
  | "awaiting_review"
  | "finalized";

export type Priority = "routine" | "urgent" | "stat";

export type Verdict = "positive" | "negative" | "indeterminate";

export interface PatientBrief {
  id: string;
  mrn: string;
  givenName: string;
  familyName: string;
  sex: Sex;
  birthDate: string | null;
}

export interface AiSummary {
  analyzedCount: number;
  failedCount: number;
  positiveCount: number;
  indeterminateCount: number;
  negativeCount: number;
  maxProbability: number | null;
  overall: Verdict | null;
}

export type Impression =
  | "tumor_suspected"
  | "no_tumor"
  | "indeterminate"
  | "non_diagnostic";

export type AiAgreement = "agree" | "disagree" | "partial" | "not_applicable";

export interface ReviewBrief {
  status: "draft" | "signed";
  version: number;
  impression: Impression | null;
  signedAt: string | null;
  signedByName: string | null;
}

export interface ExamSummary {
  id: string;
  accessionNumber: string;
  patient: PatientBrief;
  modality: string;
  bodyPart: string;
  description: string;
  clinicalIndication: string | null;
  referringPhysician: string | null;
  priority: Priority;
  studyDate: string;
  status: ExamStatus;
  imageCount: number;
  ai: AiSummary;
  review: ReviewBrief | null;
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
  finalizedAt: string | null;
}

export interface ExamPage {
  items: ExamSummary[];
  total: number;
}

export type AiFlag =
  | "positive"
  | "indeterminate"
  | "negative"
  | "flagged"
  | "none";

export interface ExamQuery {
  search?: string;
  status?: ExamStatus | "open";
  patientId?: string;
  dateFrom?: string;
  dateTo?: string;
  aiFlag?: AiFlag;
  priority?: Priority;
  order?: "worklist" | "recent";
  limit?: number;
  offset?: number;
}

export interface WorklistStats {
  awaitingImages: number;
  ready: number;
  analyzing: number;
  awaitingReview: number;
  finalizedToday: number;
  flaggedOpen: number;
  totalOpen: number;
  patientCount: number;
}

export interface ExamInput {
  description: string;
  clinicalIndication: string | null;
  referringPhysician: string | null;
  priority: Priority;
  studyDate: string;
}

export interface PatientDetail {
  patient: Patient;
  exams: ExamSummary[];
}

// Images and AI results ------------------------------------------------------

export type Finding = "positive" | "negative";

export interface ClassProbability {
  label: string;
  displayName: string;
  finding: Finding;
  probability: number;
}

export interface ActivationMap {
  width: number;
  height: number;
  values: number[];
}

export interface PreprocessingRecord {
  sourceWidth: number;
  sourceHeight: number;
  inputWidth: number;
  inputHeight: number;
  channels: number;
  layout: string;
  resize: string;
  dicomWindow: [number, number] | null;
}

export interface AnalysisRecord {
  id: string;
  imageId: string;
  examId: string;
  status: "completed" | "failed";
  modelId: string;
  modelName: string;
  modelVersion: string;
  modelSha256: string | null;
  modelFixture: boolean;
  probability: number | null;
  verdict: Verdict | null;
  predictedLabel: string | null;
  classProbabilities: ClassProbability[];
  threshold: number | null;
  lowConfidenceBand: number | null;
  activationMap: ActivationMap | null;
  activationLabel: string | null;
  preprocessing: PreprocessingRecord | null;
  latencyMs: number | null;
  error: string | null;
  createdAt: string;
  createdByName: string | null;
}

export type ImageFormat = "png" | "jpeg" | "dicom";

export interface ImageItem {
  id: string;
  examId: string;
  seq: number;
  originalName: string;
  format: ImageFormat;
  frameIndex: number;
  frameCount: number;
  width: number;
  height: number;
  bitsStored: number | null;
  isColor: boolean;
  windowCenter: number;
  windowWidth: number;
  valueMin: number;
  valueMax: number;
  invert: boolean;
  metadata: Record<string, unknown>;
  warnings: string[];
  sha256: string;
  fileSize: number;
  importedAt: string;
  importedByName: string | null;
  fileMissing: boolean;
  latestAnalysis: AnalysisRecord | null;
}

export interface Review {
  id: string;
  examId: string;
  version: number;
  status: "draft" | "signed";
  impression: Impression | null;
  aiAgreement: AiAgreement | null;
  findings: string;
  recommendation: string;
  amendmentReason: string | null;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
  signedAt: string | null;
  signedByName: string | null;
}

export interface ReviewInput {
  impression: Impression | null;
  aiAgreement: AiAgreement | null;
  findings: string;
  recommendation: string;
}

export type JobState =
  | "queued"
  | "running"
  | "completed"
  | "cancelled"
  | "failed";

export interface JobProgress {
  id: string;
  examId: string;
  state: JobState;
  total: number;
  done: number;
  failed: number;
  currentImageId: string | null;
  lastImageId: string | null;
  cancelRequested: boolean;
  error: string | null;
  queuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface ExamDetail {
  exam: ExamSummary;
  patient: Patient;
  images: ImageItem[];
  review: Review | null;
  reviewHistory: Review[];
  activeJob: JobProgress | null;
}

export type ImportStatus = "imported" | "duplicate" | "rejected";

export interface ImportOutcome {
  fileName: string;
  status: ImportStatus;
  message: string | null;
  frames: number;
  warnings: string[];
}

export interface ImportSummary {
  examId: string;
  importedFiles: number;
  importedImages: number;
  duplicates: number;
  rejected: number;
  skipped: number;
  outcomes: ImportOutcome[];
  imageIds: string[];
}

// AI model -------------------------------------------------------------------

export type ModelState =
  | "unchecked"
  | "loading"
  | "not_installed"
  | "ready"
  | "error";

export type CheckStatus = "passed" | "warning" | "failed" | "skipped";

export interface ValidationCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string | null;
}

export interface TensorSpec {
  name: string;
  elementType: string;
  shape: number[];
}

/** Manifest class entries keep the manifest's own snake_case keys. */
export interface ModelClass {
  label: string;
  display_name?: string | null;
  finding: Finding;
}

export interface ModelInfo {
  id: string;
  name: string;
  version: string;
  description: string | null;
  created: string | null;
  trainingData: string | null;
  intendedUse: string | null;
  performance: unknown;
  limitations: string[];
  fixture: boolean;
  directory: string;
  fileName: string;
  fileSize: number;
  sha256: string;
  sha256Declared: boolean;
  runtime: string;
  signature: { inputs: TensorSpec[]; outputs: TensorSpec[] };
  inputWidth: number;
  inputHeight: number;
  inputChannels: number;
  inputLayout: string;
  classes: ModelClass[];
  threshold: number;
  lowConfidenceBand: number;
  explainability: string | null;
  loadedAt: string;
  loadMs: number;
  selfTestMs: number;
}

export type SourceKind =
  | "configured"
  | "environment"
  | "app_data"
  | "bundled"
  | "development";

export interface ModelStatus {
  state: ModelState;
  message: string;
  model: ModelInfo | null;
  checks: ValidationCheck[];
  source: { kind: SourceKind; directory: string } | null;
  searched: { kind: SourceKind; directory: string; hasManifest: boolean }[];
  updatedAt: string;
}

// Settings, system, audit, export --------------------------------------------

export interface AppSettings {
  facilityName: string;
  department: string | null;
  sessionTimeoutMinutes: number;
  autoAnalyzeOnImport: boolean;
  modelDirectory: string | null;
}

export interface SettingsInput {
  facilityName: string;
  department: string | null;
  sessionTimeoutMinutes: number;
  autoAnalyzeOnImport: boolean;
}

export interface SystemInfo {
  appVersion: string;
  dataDirectory: string;
  databaseBytes: number;
  imageStorageBytes: number;
  patients: number;
  examinations: number;
  images: number;
  analyses: number;
  users: number;
  auditEntries: number;
}

export interface AuditEntry {
  seq: number;
  id: string;
  ts: string;
  userId: string | null;
  username: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown> | null;
}

export interface AuditPage {
  items: AuditEntry[];
  total: number;
  actions: string[];
}

export interface AuditQuery {
  search?: string;
  action?: string;
  username?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface AuditVerification {
  valid: boolean;
  checked: number;
  firstInvalidSeq: number | null;
  verifiedAt: string;
}

export interface ExportRequest {
  kind: "csv" | "png";
  fileName: string;
  text?: string;
  base64?: string;
  description: string;
  examId?: string;
  patientId?: string;
}

export interface AnnotatedExportSummary {
  directory: string;
  written: number;
  skipped: number;
}
