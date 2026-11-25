import { invoke } from "@tauri-apps/api/tauri";
import { isPreviewMode } from "@/lib/preview/mode";
import { phantomSpec, phantomThumbnail } from "@/lib/preview/phantom";
import { isTauriRuntime } from "@/lib/tauri";
import type {
  AppSettings,
  AuditPage,
  AuditQuery,
  AuditVerification,
  Bootstrap,
  ExamDetail,
  ExamInput,
  ExamPage,
  ExamQuery,
  ExamSummary,
  ExportRequest,
  ImportSummary,
  JobProgress,
  AnalysisRecord,
  ModelStatus,
  NewUserInput,
  Patient,
  PatientDetail,
  PatientInput,
  PatientPage,
  PatientQuery,
  Review,
  ReviewInput,
  SessionInfo,
  SettingsInput,
  SetupInput,
  SystemInfo,
  UpdateUserInput,
  UserSummary,
  WorklistStats,
} from "./types";

/**
 * The only way the interface talks to the backend.
 *
 * Every function maps 1:1 to a Tauri command in `src-tauri/src/commands.rs`.
 * Failures arrive as `ApiError` with the backend's stable `code`, so screens
 * can branch on meaning (locked session, validation field, model unavailable)
 * rather than on message text.
 */

export type ErrorCode =
  | "validation"
  | "unauthenticated"
  | "session_locked"
  | "password_change_required"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "invalid_state"
  | "unsupported_file"
  | "model_unavailable"
  | "inference_failed"
  | "auth_failed"
  | "database"
  | "io"
  | "internal"
  | "runtime_unavailable";

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly field: string | null;

  constructor(code: ErrorCode, message: string, field: string | null = null) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.field = field;
  }
}

function toApiError(raw: unknown): ApiError {
  if (raw instanceof ApiError) return raw;
  if (raw && typeof raw === "object" && "code" in raw && "message" in raw) {
    const value = raw as {
      code: string;
      message: string;
      field?: string | null;
    };
    return new ApiError(
      value.code as ErrorCode,
      value.message,
      value.field ?? null,
    );
  }
  if (typeof raw === "string") return new ApiError("internal", raw);
  if (raw instanceof Error) return new ApiError("internal", raw.message);
  return new ApiError("internal", "An unexpected error occurred.");
}

/** Errors that mean "the session, not the request, is the problem". */
export function isSessionError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.code === "unauthenticated" ||
      error.code === "session_locked" ||
      error.code === "password_change_required")
  );
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

type Listener = (error: ApiError) => void;
const sessionListeners = new Set<Listener>();

/** Notified whenever any command fails because of the session state. */
export function onSessionError(listener: Listener): () => void {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

async function call<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!isTauriRuntime()) {
    // Development-only design preview: answered by in-memory fixtures.
    if (import.meta.env.DEV && isPreviewMode()) {
      const { previewCall } = await import("@/lib/preview/backend");
      return (await previewCall(command, args)) as T;
    }
    throw new ApiError(
      "runtime_unavailable",
      "NeuroScan must run as the desktop application; the browser preview has no access to the clinical database or the AI service.",
    );
  }
  try {
    return await invoke<T>(command, args);
  } catch (raw) {
    const error = toApiError(raw);
    if (isSessionError(error)) {
      for (const listener of sessionListeners) listener(error);
    }
    throw error;
  }
}

export const api = {
  // Session
  bootstrap: () => call<Bootstrap>("app_bootstrap"),
  setup: (input: SetupInput) =>
    call<SessionInfo>("setup_initialize", { input }),
  login: (username: string, password: string) =>
    call<SessionInfo>("auth_login", { username, password }),
  logout: () => call<void>("auth_logout"),
  lock: () => call<void>("auth_lock"),
  unlock: (password: string) => call<SessionInfo>("auth_unlock", { password }),
  heartbeat: () => call<SessionInfo>("auth_heartbeat"),
  changePassword: (currentPassword: string, newPassword: string) =>
    call<SessionInfo>("auth_change_password", { currentPassword, newPassword }),

  // Users
  listUsers: () => call<UserSummary[]>("users_list"),
  createUser: (input: NewUserInput) =>
    call<UserSummary>("users_create", { input }),
  updateUser: (id: string, input: UpdateUserInput) =>
    call<UserSummary>("users_update", { id, input }),
  resetPassword: (id: string, temporaryPassword: string) =>
    call<void>("users_reset_password", { id, temporaryPassword }),

  // Settings and system
  getSettings: () => call<AppSettings>("settings_get"),
  updateSettings: (input: SettingsInput) =>
    call<AppSettings>("settings_update", { input }),
  systemInfo: () => call<SystemInfo>("system_info"),

  // Patients
  listPatients: (query: PatientQuery) =>
    call<PatientPage>("patients_list", { query }),
  getPatient: (id: string) => call<PatientDetail>("patients_get", { id }),
  createPatient: (input: PatientInput) =>
    call<Patient>("patients_create", { input }),
  updatePatient: (id: string, input: PatientInput) =>
    call<Patient>("patients_update", { id, input }),

  // Examinations
  listExams: (query: ExamQuery) => call<ExamPage>("exams_list", { query }),
  examStats: () => call<WorklistStats>("exams_stats"),
  createExam: (patientId: string, input: ExamInput) =>
    call<ExamSummary>("exams_create", { patientId, input }),
  updateExam: (id: string, input: ExamInput) =>
    call<ExamSummary>("exams_update", { id, input }),
  getExam: (id: string) => call<ExamDetail>("exams_get", { id }),

  // Images
  importPaths: (examId: string, paths: string[]) =>
    call<ImportSummary>("images_import", { examId, paths }),
  importDialog: (examId: string, folder: boolean) =>
    call<ImportSummary | null>("images_import_dialog", { examId, folder }),
  removeImage: (imageId: string) => call<void>("images_remove", { imageId }),
  analysisHistory: (imageId: string) =>
    call<AnalysisRecord[]>("images_analysis_history", { imageId }),

  // AI
  aiStatus: () => call<ModelStatus>("ai_status"),
  aiReload: () => call<ModelStatus>("ai_reload"),
  aiSetModelDirectory: (directory: string | null) =>
    call<ModelStatus>("ai_set_model_directory", { directory }),
  aiChooseModelDirectory: () =>
    call<ModelStatus | null>("ai_choose_model_directory"),
  startAnalysis: (examId: string, imageIds?: string[]) =>
    call<JobProgress>("analysis_start", { examId, imageIds: imageIds ?? null }),
  cancelAnalysis: (jobId: string) =>
    call<JobProgress>("analysis_cancel", { jobId }),
  analysisJobs: () => call<JobProgress[]>("analysis_jobs"),

  // Review
  saveReviewDraft: (examId: string, input: ReviewInput) =>
    call<Review>("review_save_draft", { examId, input }),
  signReview: (examId: string, input: ReviewInput, password: string) =>
    call<Review>("review_sign", { examId, input, password }),
  amendReview: (examId: string, reason: string) =>
    call<Review>("review_amend", { examId, reason }),

  // Audit and export
  listAudit: (query: AuditQuery) => call<AuditPage>("audit_list", { query }),
  verifyAudit: () => call<AuditVerification>("audit_verify"),
  saveExport: (request: ExportRequest) =>
    call<string | null>("export_save", { request }),
  reportPrinted: (examId: string) => call<void>("report_printed", { examId }),
};

// ---------------------------------------------------------------------------
// Image protocol
// ---------------------------------------------------------------------------

/**
 * Base URL of the `neuroscan://` protocol. WebView2 (Windows) exposes custom
 * schemes as `https://<scheme>.localhost`; WebKit uses the scheme directly.
 */
export function imageProtocolBase(): string {
  const windows =
    typeof navigator !== "undefined" && /Windows/i.test(navigator.userAgent);
  return windows ? "https://neuroscan.localhost" : "neuroscan://localhost";
}

export const imageUrls = {
  thumbnail: (imageId: string) =>
    import.meta.env.DEV && isPreviewMode()
      ? phantomThumbnail(imageId, phantomSpec(imageId))
      : `${imageProtocolBase()}/thumb/${imageId}`,
  frame: (imageId: string) => `${imageProtocolBase()}/frame/${imageId}`,
  render: (imageId: string, center: number, width: number, invert: boolean) =>
    import.meta.env.DEV && isPreviewMode()
      ? phantomThumbnail(imageId, phantomSpec(imageId))
      : `${imageProtocolBase()}/render/${imageId}?c=${encodeURIComponent(center.toFixed(3))}&w=${encodeURIComponent(width.toFixed(3))}&invert=${invert ? 1 : 0}`,
};
