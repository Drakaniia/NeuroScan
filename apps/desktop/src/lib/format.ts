import type {
  AiAgreement,
  ExamStatus,
  Impression,
  Priority,
  Role,
  Sex,
  Verdict,
} from "@/lib/api/types";

/**
 * Presentation of clinical values. Wording lives here so every screen names
 * the same thing the same way.
 */

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  radiologist: "Radiologist",
  technologist: "Technologist",
  viewer: "Read-only viewer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin:
    "Full access, including users, settings, the AI model and the audit log.",
  radiologist:
    "Registers patients, runs AI analysis, records and signs clinical reviews.",
  technologist:
    "Registers patients, creates examinations, imports images and runs AI analysis.",
  viewer: "Views records and signed reports. Cannot change data.",
};

export const SEX_LABELS: Record<Sex, string> = {
  female: "Female",
  male: "Male",
  other: "Other",
  unknown: "Unknown",
};

export const SEX_SHORT: Record<Sex, string> = {
  female: "F",
  male: "M",
  other: "O",
  unknown: "U",
};

export const STATUS_LABELS: Record<ExamStatus, string> = {
  awaiting_images: "Awaiting images",
  ready: "Ready",
  analyzing: "Analyzing",
  awaiting_review: "Awaiting review",
  finalized: "Finalized",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  routine: "Routine",
  urgent: "Urgent",
  stat: "STAT",
};

/** AI output is a screening signal, worded as such, never as a diagnosis. */
export const VERDICT_LABELS: Record<Verdict, string> = {
  positive: "Tumor suspected",
  negative: "No tumor detected",
  indeterminate: "Indeterminate",
};

export const VERDICT_HINTS: Record<Verdict, string> = {
  positive: "Probability at or above the model's decision threshold.",
  negative: "Probability below the model's decision threshold.",
  indeterminate:
    "Probability inside the low-confidence band around the threshold. Review manually.",
};

export const IMPRESSION_LABELS: Record<Impression, string> = {
  tumor_suspected: "Tumor suspected",
  no_tumor: "No tumor identified",
  indeterminate: "Indeterminate",
  non_diagnostic: "Non-diagnostic study",
};

export const AGREEMENT_LABELS: Record<AiAgreement, string> = {
  agree: "Agrees with AI",
  partial: "Partially agrees",
  disagree: "Disagrees with AI",
  not_applicable: "Not applicable",
};

export function patientName(patient: {
  givenName: string;
  familyName: string;
}): string {
  return `${patient.familyName.toUpperCase()}, ${patient.givenName}`;
}

/** Whole years between a birth date and a reference date (default today). */
export function ageInYears(
  birthDate: string | null,
  at: Date = new Date(),
): number | null {
  if (!birthDate) return null;
  const [year, month, day] = birthDate.split("-").map(Number);
  if (!year || !month || !day) return null;
  let age = at.getFullYear() - year;
  const beforeBirthday =
    at.getMonth() + 1 < month ||
    (at.getMonth() + 1 === month && at.getDate() < day);
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

export function sexAge(patient: {
  sex: Sex;
  birthDate: string | null;
}): string {
  const age = ageInYears(patient.birthDate);
  return age === null
    ? SEX_SHORT[patient.sex]
    : `${SEX_SHORT[patient.sex]} · ${age} y`;
}

const DATE = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
});
const DATE_TIME = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const TIME = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});

/** `YYYY-MM-DD` calendar date (no time zone shift). */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return DATE.format(new Date(year, month - 1, day));
}

/** RFC 3339 instant rendered in local time. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : DATE_TIME.format(date);
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : TIME.format(date);
}

export function relativeTime(
  value: string | null | undefined,
  now = Date.now(),
): string {
  if (!value) return "—";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return value;
  const seconds = Math.round((now - time) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return formatDateTime(value);
}

export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function formatPercent(
  value: number | null | undefined,
  digits = 1,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : value < 10 ? 1 : 0)} ${units[unit]}`;
}

export function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}

/** Audit action ids → readable phrases. Unknown ids fall back to the id. */
export function auditActionLabel(action: string): string {
  const labels: Record<string, string> = {
    system_initialized: "System initialized",
    login_succeeded: "Signed in",
    login_failed: "Sign-in failed",
    logout: "Signed out",
    session_locked: "Session locked",
    session_unlocked: "Session unlocked",
    unlock_failed: "Unlock failed",
    password_changed: "Password changed",
    password_reset: "Password reset by administrator",
    user_created: "User created",
    user_updated: "User updated",
    settings_changed: "Settings changed",
    patient_registered: "Patient registered",
    patient_updated: "Patient updated",
    patient_record_opened: "Patient record opened",
    examination_created: "Examination created",
    examination_updated: "Examination updated",
    images_imported: "Images imported",
    image_removed: "Image removed",
    analysis_started: "AI analysis started",
    analysis_completed: "AI analysis completed",
    analysis_cancelled: "AI analysis cancelled",
    analysis_interrupted: "AI analysis interrupted",
    model_loaded: "AI model loaded",
    model_not_installed: "No AI model installed",
    model_load_failed: "AI model failed validation",
    model_directory_changed: "AI model folder changed",
    review_draft_saved: "Review draft saved",
    report_signed: "Report signed",
    signature_failed: "Signature failed",
    report_reopened: "Report reopened for amendment",
    report_printed: "Report printed",
    export_saved: "Export saved",
    audit_verified: "Audit trail verified",
  };
  return labels[action] ?? action.replace(/_/g, " ");
}
