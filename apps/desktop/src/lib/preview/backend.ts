/**
 * In-memory stand-in for the Tauri command layer, for design preview only
 * (see `mode.ts`). Records are synthetic fixtures — no real patient data —
 * shaped exactly like the wire types so every screen renders as it would
 * against the real backend.
 */
import type {
  AnalysisRecord,
  AuditEntry,
  ExamDetail,
  ExamQuery,
  ExamSummary,
  ImageItem,
  ModelStatus,
  Patient,
  PatientQuery,
  PatientSummary,
  Review,
  SessionInfo,
  UserSummary,
  Verdict,
} from "@/lib/api/types";
import { ApiError } from "@/lib/api/client";
import {
  type PhantomSpec,
  PHANTOM_SIZE,
  phantomActivation,
  registerPhantom,
} from "./phantom";
import { previewPhase } from "./mode";

const NOW = new Date();
const iso = (offsetHours = 0) =>
  new Date(NOW.getTime() - offsetHours * 3_600_000).toISOString();
const day = (offsetDays = 0) => iso(offsetDays * 24).slice(0, 10);

const session: SessionInfo = {
  user: {
    id: "u-1",
    username: "a.okafor",
    fullName: "Amara Okafor",
    role: "radiologist",
    mustChangePassword: false,
  },
  permissions: [
    "patient_read",
    "patient_write",
    "exam_read",
    "exam_write",
    "analysis_run",
    "review_sign",
    "report_export",
    "audit_read",
    "user_manage",
    "settings_manage",
    "model_manage",
  ],
  locked: false,
  startedAt: iso(1),
  timeoutMinutes: 15,
};

const PATIENTS: Patient[] = [
  ["P-100231", "Lindqvist", "Hanna", "female", "1968-03-14"],
  ["P-100245", "Mensah", "Kwame", "male", "1979-11-02"],
  ["P-100262", "Takahashi", "Yuki", "female", "1991-06-27"],
  ["P-100270", "Ferreira", "Tomás", "male", "1955-01-19"],
  ["P-100288", "Novak", "Eliška", "female", "1984-09-08"],
  ["P-100301", "Haddad", "Omar", "male", "2002-04-30"],
  ["P-100317", "O'Connell", "Siobhan", "female", "1972-12-11"],
  ["P-100322", "Reyes", "Mateo", "male", "1963-07-05"],
].map(([mrn, familyName, givenName, sex, birthDate], index) => ({
  id: `p-${index + 1}`,
  mrn,
  familyName,
  givenName,
  sex: sex as Patient["sex"],
  birthDate,
  phone: index % 3 === 0 ? "+1 555 0100" : null,
  notes: index === 0 ? "Claustrophobic — offer open-bore scanner." : null,
  createdAt: iso(24 * (40 - index)),
  updatedAt: iso(24 * (10 - index)),
}));

interface ExamSeed {
  patient: number;
  description: string;
  priority: ExamSummary["priority"];
  status: ExamSummary["status"];
  verdicts: (Verdict | null)[];
  hoursAgo: number;
  signed?: boolean;
}

const SEEDS: ExamSeed[] = [
  { patient: 0, description: "MRI Brain w/ contrast", priority: "stat", status: "awaiting_review", verdicts: ["positive", "positive", "indeterminate", "negative", "positive", "negative"], hoursAgo: 1 },
  { patient: 1, description: "MRI Brain w/o contrast", priority: "urgent", status: "awaiting_review", verdicts: ["indeterminate", "negative", "negative", "negative"], hoursAgo: 3 },
  { patient: 2, description: "MRI Brain — headache protocol", priority: "routine", status: "analyzing", verdicts: ["negative", null, null, null, null], hoursAgo: 4 },
  { patient: 3, description: "MRI Brain w/ contrast", priority: "routine", status: "ready", verdicts: [null, null, null], hoursAgo: 6 },
  { patient: 4, description: "MRI Brain — seizure protocol", priority: "urgent", status: "awaiting_images", verdicts: [], hoursAgo: 7 },
  { patient: 5, description: "MRI Brain w/o contrast", priority: "routine", status: "awaiting_review", verdicts: ["negative", "negative", "negative", "negative"], hoursAgo: 20 },
  { patient: 6, description: "MRI Brain follow-up", priority: "routine", status: "finalized", verdicts: ["positive", "positive", "negative"], hoursAgo: 30, signed: true },
  { patient: 7, description: "MRI Brain w/ contrast", priority: "routine", status: "finalized", verdicts: ["negative", "negative", "negative"], hoursAgo: 52, signed: true },
  { patient: 0, description: "MRI Brain baseline", priority: "routine", status: "finalized", verdicts: ["indeterminate", "negative"], hoursAgo: 24 * 90, signed: true },
];

const PROBABILITY: Record<Verdict, number[]> = {
  positive: [0.94, 0.88, 0.81, 0.97],
  indeterminate: [0.52, 0.47, 0.56],
  negative: [0.04, 0.09, 0.12, 0.02, 0.07],
};


function analysis(
  image: Omit<ImageItem, "latestAnalysis">,
  verdict: Verdict,
  index: number,
  spec: PhantomSpec,
): AnalysisRecord {
  const probability =
    PROBABILITY[verdict][index % PROBABILITY[verdict].length];
  return {
    id: `a-${image.id}`,
    imageId: image.id,
    examId: image.examId,
    status: "completed",
    modelId: "neuroscan-cnn",
    modelName: "NeuroScan CNN",
    modelVersion: "1.3.0",
    modelSha256: "9f2c4b1e0d7a63c58e14f0b2a9d3c7e6f1a2b3c4d5e6f708192a3b4c5d6e7f80",
    modelFixture: false,
    probability,
    verdict,
    predictedLabel: verdict === "negative" ? "no_tumor" : "tumor",
    classProbabilities: [
      { label: "glioma", displayName: "Glioma", finding: "positive", probability: probability * 0.62 },
      { label: "meningioma", displayName: "Meningioma", finding: "positive", probability: probability * 0.28 },
      { label: "pituitary", displayName: "Pituitary", finding: "positive", probability: probability * 0.1 },
      { label: "no_tumor", displayName: "No tumor", finding: "negative", probability: 1 - probability },
    ],
    threshold: 0.5,
    lowConfidenceBand: 0.1,
    activationMap: phantomActivation(spec),
    activationLabel: "Grad-CAM · tumor",
    preprocessing: {
      sourceWidth: PHANTOM_SIZE,
      sourceHeight: PHANTOM_SIZE,
      inputWidth: 224,
      inputHeight: 224,
      channels: 3,
      layout: "NCHW",
      resize: "bilinear",
      dicomWindow: null,
    },
    latencyMs: 180 + index * 7,
    error: null,
    createdAt: iso(1),
    createdByName: session.user.fullName,
  };
}

const EXAMS: ExamDetail[] = SEEDS.map((seed, examIndex) => {
  const patient = PATIENTS[seed.patient];
  const id = `e-${examIndex + 1}`;
  const images: ImageItem[] = Array.from(
    { length: seed.verdicts.length },
    (_, index) => {
      const verdict = seed.verdicts[index] ?? null;
      const imageId = `${id}-i${index + 1}`;
      const spec: PhantomSpec = {
        seed: examIndex * 31 + index * 7 + 3,
        slice: (index + 1) / (seed.verdicts.length + 1),
        lesion:
          verdict === "positive" || verdict === "indeterminate"
            ? {
                x: 150 + (examIndex % 3) * 8,
                y: 100 + index * 5,
                r: verdict === "positive" ? 15 : 9,
              }
            : null,
      };
      registerPhantom(imageId, spec);
      const base: Omit<ImageItem, "latestAnalysis"> = {
        id: imageId,
        examId: id,
        seq: index + 1,
        originalName: `AX_T1C_${String(index + 1).padStart(3, "0")}.dcm`,
        format: "dicom",
        frameIndex: 0,
        frameCount: 1,
        width: PHANTOM_SIZE,
        height: PHANTOM_SIZE,
        bitsStored: 12,
        isColor: false,
        windowCenter: 520,
        windowWidth: 960,
        valueMin: 0,
        valueMax: 1000,
        invert: false,
        metadata: {
          Modality: "MR",
          SeriesDescription: "AX T1 POST GAD",
          SliceThickness: "5.0",
          PixelSpacing: "0.9\\0.9",
          Manufacturer: "Preview fixture",
        },
        warnings: [],
        sha256: `${imageId}`.padEnd(64, "0"),
        fileSize: 131_072 + index * 512,
        importedAt: iso(seed.hoursAgo),
        importedByName: "Jonas Weber",
        fileMissing: false,
      };
      return {
        ...base,
        latestAnalysis: verdict ? analysis(base, verdict, index, spec) : null,
      };
    },
  );
  const analyzed = images.filter((image) => image.latestAnalysis);
  const count = (verdict: Verdict) =>
    analyzed.filter((image) => image.latestAnalysis?.verdict === verdict)
      .length;
  const positives = count("positive");
  const indeterminate = count("indeterminate");
  const overall: Verdict | null = analyzed.length
    ? positives
      ? "positive"
      : indeterminate
        ? "indeterminate"
        : "negative"
    : null;
  const review: Review | null =
    seed.signed || seed.status === "awaiting_review"
      ? {
          id: `r-${id}`,
          examId: id,
          version: 1,
          status: seed.signed ? "signed" : "draft",
          impression: seed.signed
            ? overall === "positive"
              ? "tumor_suspected"
              : "no_tumor"
            : examIndex === 0
              ? "tumor_suspected"
              : null,
          aiAgreement: seed.signed ? "agree" : null,
          findings: seed.signed
            ? "Ring-enhancing lesion in the right frontal lobe with surrounding vasogenic oedema."
            : examIndex === 0
              ? "Enhancing right frontal lesion, approx. 2.8 cm."
              : "",
          recommendation: seed.signed
            ? "Neurosurgical referral; MR spectroscopy."
            : "",
          amendmentReason: null,
          authorName: session.user.fullName,
          createdAt: iso(seed.hoursAgo - 0.5),
          updatedAt: iso(seed.hoursAgo - 0.6),
          signedAt: seed.signed ? iso(seed.hoursAgo - 1) : null,
          signedByName: seed.signed ? session.user.fullName : null,
        }
      : null;
  const exam: ExamSummary = {
    id,
    accessionNumber: `ACC-${String(240_318 + examIndex * 7)}`,
    patient: {
      id: patient.id,
      mrn: patient.mrn,
      givenName: patient.givenName,
      familyName: patient.familyName,
      sex: patient.sex,
      birthDate: patient.birthDate,
    },
    modality: "MR",
    bodyPart: "BRAIN",
    description: seed.description,
    clinicalIndication:
      examIndex === 0 ? "New-onset seizures, left-sided weakness." : "Headache, rule out mass.",
    referringPhysician: "Dr. L. Moreau",
    priority: seed.priority,
    studyDate: day(Math.floor(seed.hoursAgo / 24)),
    status: seed.status,
    imageCount: images.length,
    ai: {
      analyzedCount: analyzed.length,
      failedCount: 0,
      positiveCount: positives,
      indeterminateCount: indeterminate,
      negativeCount: count("negative"),
      maxProbability: analyzed.length
        ? Math.max(...analyzed.map((image) => image.latestAnalysis?.probability ?? 0))
        : null,
      overall,
    },
    review: review
      ? {
          status: review.status,
          version: review.version,
          impression: review.impression,
          signedAt: review.signedAt,
          signedByName: review.signedByName,
        }
      : null,
    createdAt: iso(seed.hoursAgo),
    updatedAt: iso(seed.hoursAgo - 0.2),
    createdByName: "Jonas Weber",
    finalizedAt: seed.signed ? iso(seed.hoursAgo - 1) : null,
  };
  return {
    exam,
    patient,
    images,
    review,
    reviewHistory: review ? [review] : [],
    activeJob:
      seed.status === "analyzing"
        ? {
            id: `job-${id}`,
            examId: id,
            state: "running",
            total: images.length,
            done: 1,
            failed: 0,
            currentImageId: images[1]?.id ?? null,
            lastImageId: images[0]?.id ?? null,
            cancelRequested: false,
            error: null,
            queuedAt: iso(0.1),
            startedAt: iso(0.1),
            finishedAt: null,
          }
        : null,
  };
});

const MODEL: ModelStatus = {
  state: "ready",
  message: "NeuroScan CNN 1.3.0 loaded and passed its self-test.",
  model: {
    id: "neuroscan-cnn",
    name: "NeuroScan CNN",
    version: "1.3.0",
    description: "Binary brain-tumour screening classifier on axial MR slices.",
    created: "2026-08-14",
    trainingData: "Public brain MRI datasets (preview description).",
    intendedUse: "Screening support for qualified clinicians. Not a diagnosis.",
    performance: { accuracy: 0.94, sensitivity: 0.95, specificity: 0.92 },
    limitations: [
      "Trained on axial T1 post-contrast slices only.",
      "Not validated for paediatric patients.",
    ],
    fixture: false,
    directory: "C:\\ProgramData\\NeuroScan\\models\\neuroscan-cnn",
    fileName: "model.onnx",
    fileSize: 44_812_288,
    sha256: "9f2c4b1e0d7a63c58e14f0b2a9d3c7e6f1a2b3c4d5e6f708192a3b4c5d6e7f80",
    sha256Declared: true,
    runtime: "onnxruntime 1.19 (CPU)",
    signature: {
      inputs: [{ name: "input", elementType: "float32", shape: [1, 3, 224, 224] }],
      outputs: [{ name: "logits", elementType: "float32", shape: [1, 4] }],
    },
    inputWidth: 224,
    inputHeight: 224,
    inputChannels: 3,
    inputLayout: "NCHW",
    classes: [
      { label: "glioma", display_name: "Glioma", finding: "positive" },
      { label: "meningioma", display_name: "Meningioma", finding: "positive" },
      { label: "pituitary", display_name: "Pituitary", finding: "positive" },
      { label: "no_tumor", display_name: "No tumor", finding: "negative" },
    ],
    threshold: 0.5,
    lowConfidenceBand: 0.1,
    explainability: "Grad-CAM",
    loadedAt: iso(2),
    loadMs: 412,
    selfTestMs: 96,
  },
  checks: [
    { id: "manifest", label: "Manifest is valid", status: "passed", detail: null },
    { id: "sha256", label: "Model checksum matches manifest", status: "passed", detail: null },
    { id: "signature", label: "Input and output tensors match", status: "passed", detail: null },
    { id: "selftest", label: "Self-test inference", status: "passed", detail: "96 ms" },
  ],
  source: { kind: "app_data", directory: "C:\\ProgramData\\NeuroScan\\models" },
  searched: [],
  updatedAt: iso(2),
};

const USERS: UserSummary[] = [
  { id: "u-1", username: "a.okafor", fullName: "Amara Okafor", role: "radiologist", isActive: true, mustChangePassword: false, lockedUntil: null, lastLoginAt: iso(1), createdAt: iso(24 * 120) },
  { id: "u-2", username: "admin", fullName: "System Administrator", role: "admin", isActive: true, mustChangePassword: false, lockedUntil: null, lastLoginAt: iso(30), createdAt: iso(24 * 200) },
  { id: "u-3", username: "j.weber", fullName: "Jonas Weber", role: "technologist", isActive: true, mustChangePassword: false, lockedUntil: null, lastLoginAt: iso(3), createdAt: iso(24 * 90) },
  { id: "u-4", username: "r.silva", fullName: "Rita Silva", role: "viewer", isActive: false, mustChangePassword: true, lockedUntil: null, lastLoginAt: null, createdAt: iso(24 * 12) },
];

const AUDIT: AuditEntry[] = [
  ["login_succeeded", "a.okafor", null, null],
  ["patient_record_opened", "a.okafor", "patient", "p-1"],
  ["analysis_completed", "a.okafor", "examination", "e-1"],
  ["review_draft_saved", "a.okafor", "examination", "e-1"],
  ["images_imported", "j.weber", "examination", "e-3"],
  ["examination_created", "j.weber", "examination", "e-5"],
  ["report_signed", "a.okafor", "examination", "e-7"],
  ["settings_changed", "admin", "settings", null],
  ["model_loaded", null, "model", "neuroscan-cnn"],
  ["login_failed", "r.silva", null, null],
].map(([action, username, entityType, entityId], index) => ({
  seq: 1000 - index,
  id: `log-${index}`,
  ts: iso(index * 2.5),
  userId: username ? `u-${username}` : null,
  username,
  action: action as string,
  entityType,
  entityId,
  details: action === "images_imported" ? { files: 5, frames: 5 } : null,
}));

function summarize(patient: Patient): PatientSummary {
  const exams = EXAMS.filter((detail) => detail.patient.id === patient.id);
  return {
    ...patient,
    examCount: exams.length,
    openExamCount: exams.filter((detail) => detail.exam.status !== "finalized").length,
    lastStudyDate:
      exams.map((detail) => detail.exam.studyDate).sort().reverse()[0] ??
      null,
  };
}

function matches(text: string, search?: string) {
  return !search || text.toLowerCase().includes(search.toLowerCase());
}

function listExams(query: ExamQuery) {
  let items = EXAMS.map((detail) => detail.exam).filter((exam) => {
    if (query.patientId && exam.patient.id !== query.patientId) return false;
    if (query.status === "open" && exam.status === "finalized") return false;
    if (query.status && query.status !== "open" && exam.status !== query.status) return false;
    if (query.priority && exam.priority !== query.priority) return false;
    if (query.aiFlag) {
      const overall = exam.ai.overall;
      if (query.aiFlag === "none" && overall) return false;
      if (query.aiFlag === "flagged" && overall !== "positive" && overall !== "indeterminate") return false;
      if (["positive", "negative", "indeterminate"].includes(query.aiFlag) && overall !== query.aiFlag) return false;
    }
    return matches(
      `${exam.patient.familyName} ${exam.patient.givenName} ${exam.patient.mrn} ${exam.accessionNumber}`,
      query.search,
    );
  });
  const rank = { stat: 0, urgent: 1, routine: 2 };
  items =
    query.order === "recent"
      ? items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : items.sort((a, b) => rank[a.priority] - rank[b.priority] || a.createdAt.localeCompare(b.createdAt));
  const offset = query.offset ?? 0;
  const limit = query.limit ?? 50;
  return { items: items.slice(offset, offset + limit), total: items.length };
}

let phase = previewPhase();

export async function previewCall(
  command: string,
  args: Record<string, unknown> = {},
): Promise<unknown> {
  // A short, honest delay so loading states are visible but brief.
  await new Promise((resolve) => setTimeout(resolve, 120));
  const get = <T>(key: string) => args[key] as T;

  switch (command) {
    case "app_bootstrap":
      return {
        setupRequired: phase === "setup",
        session:
          phase === "active"
            ? session
            : phase === "locked"
              ? { ...session, locked: true }
              : null,
        appVersion: "0.2.0-preview",
        facilityName: "Preview fixtures · not patient data",
      };
    case "auth_login":
    case "auth_unlock":
    case "setup_initialize":
    case "auth_change_password":
      phase = "active";
      return session;
    case "auth_heartbeat":
      return session;
    case "auth_lock":
      phase = "locked";
      return null;
    case "auth_logout":
      phase = "login";
      return null;

    case "exams_stats": {
      const all = EXAMS.map((detail) => detail.exam);
      const count = (status: ExamSummary["status"]) =>
        all.filter((exam) => exam.status === status).length;
      return {
        awaitingImages: count("awaiting_images"),
        ready: count("ready"),
        analyzing: count("analyzing"),
        awaitingReview: count("awaiting_review"),
        finalizedToday: 1,
        flaggedOpen: all.filter(
          (exam) =>
            exam.status !== "finalized" &&
            (exam.ai.overall === "positive" || exam.ai.overall === "indeterminate"),
        ).length,
        totalOpen: all.filter((exam) => exam.status !== "finalized").length,
        patientCount: PATIENTS.length,
      };
    }
    case "exams_list":
      return listExams(get<ExamQuery>("query"));
    case "exams_get": {
      const detail = EXAMS.find((item) => item.exam.id === get<string>("id"));
      if (!detail) throw new ApiError("not_found", "Examination not found.");
      return detail;
    }
    case "patients_list": {
      const query = get<PatientQuery>("query");
      const items = PATIENTS.filter((patient) =>
        matches(`${patient.familyName} ${patient.givenName} ${patient.mrn}`, query.search),
      ).map(summarize);
      const offset = query.offset ?? 0;
      const limit = query.limit ?? 50;
      return { items: items.slice(offset, offset + limit), total: items.length };
    }
    case "patients_get": {
      const patient = PATIENTS.find((item) => item.id === get<string>("id"));
      if (!patient) throw new ApiError("not_found", "Patient not found.");
      return {
        patient,
        exams: EXAMS.filter((detail) => detail.patient.id === patient.id).map(
          (detail) => detail.exam,
        ),
      };
    }
    case "images_analysis_history": {
      const image = EXAMS.flatMap((detail) => detail.images).find(
        (item) => item.id === get<string>("imageId"),
      );
      return image?.latestAnalysis ? [image.latestAnalysis] : [];
    }
    case "ai_status":
    case "ai_reload":
      return MODEL;
    case "analysis_jobs":
      return EXAMS.flatMap((detail) => (detail.activeJob ? [detail.activeJob] : []));
    case "users_list":
      return USERS;
    case "settings_get":
      return {
        facilityName: "Preview fixtures · not patient data",
        department: "Neuroradiology",
        sessionTimeoutMinutes: 15,
        autoAnalyzeOnImport: true,
        modelDirectory: null,
      };
    case "system_info":
      return {
        appVersion: "0.2.0-preview",
        dataDirectory: "C:\\Users\\Preview\\AppData\\Roaming\\NeuroScan",
        databaseBytes: 3_481_600,
        imageStorageBytes: 812_646_400,
        patients: PATIENTS.length,
        examinations: EXAMS.length,
        images: EXAMS.reduce((sum, detail) => sum + detail.images.length, 0),
        analyses: 24,
        users: USERS.length,
        auditEntries: 1000,
      };
    case "audit_list":
      return {
        items: AUDIT,
        total: AUDIT.length,
        actions: Array.from(new Set(AUDIT.map((entry) => entry.action))),
      };
    case "audit_verify":
      return { valid: true, checked: 1000, firstInvalidSeq: null, verifiedAt: iso(0) };
    case "review_save_draft":
    case "review_sign":
    case "review_amend": {
      const detail = EXAMS.find((item) => item.exam.id === get<string>("examId"));
      return detail?.review;
    }
    default:
      throw new ApiError(
        "runtime_unavailable",
        `“${command}” is not available in design preview mode.`,
      );
  }
}
