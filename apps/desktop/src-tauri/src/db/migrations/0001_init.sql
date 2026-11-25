-- NeuroScan local record store, schema version 1.
--
-- Timestamps are RFC 3339 UTC text; calendar dates are YYYY-MM-DD text.
-- Clinical records are never hard-deleted except image rows removed from a
-- non-finalized examination, and every such removal is written to audit_log.

CREATE TABLE users (
    id                   TEXT PRIMARY KEY,
    username             TEXT NOT NULL UNIQUE COLLATE NOCASE,
    full_name            TEXT NOT NULL,
    role                 TEXT NOT NULL CHECK (role IN ('admin', 'radiologist', 'technologist', 'viewer')),
    password_hash        TEXT NOT NULL,
    is_active            INTEGER NOT NULL DEFAULT 1,
    must_change_password INTEGER NOT NULL DEFAULT 0,
    failed_attempts      INTEGER NOT NULL DEFAULT 0,
    locked_until         TEXT,
    last_login_at        TEXT,
    created_at           TEXT NOT NULL,
    updated_at           TEXT NOT NULL
);

CREATE TABLE patients (
    id          TEXT PRIMARY KEY,
    mrn         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    given_name  TEXT NOT NULL,
    family_name TEXT NOT NULL,
    sex         TEXT NOT NULL CHECK (sex IN ('female', 'male', 'other', 'unknown')),
    birth_date  TEXT,
    phone       TEXT,
    notes       TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    created_by  TEXT REFERENCES users (id)
);

CREATE INDEX idx_patients_family_name ON patients (family_name COLLATE NOCASE, given_name COLLATE NOCASE);

CREATE TABLE examinations (
    id                  TEXT PRIMARY KEY,
    accession_number    TEXT NOT NULL UNIQUE,
    patient_id          TEXT NOT NULL REFERENCES patients (id),
    modality            TEXT NOT NULL DEFAULT 'MR',
    body_part           TEXT NOT NULL DEFAULT 'BRAIN',
    description         TEXT NOT NULL,
    clinical_indication TEXT,
    referring_physician TEXT,
    priority            TEXT NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine', 'urgent', 'stat')),
    study_date          TEXT NOT NULL,
    status              TEXT NOT NULL CHECK (status IN ('awaiting_images', 'ready', 'analyzing', 'awaiting_review', 'finalized')),
    created_at          TEXT NOT NULL,
    updated_at          TEXT NOT NULL,
    created_by          TEXT REFERENCES users (id),
    finalized_at        TEXT,
    finalized_by        TEXT REFERENCES users (id)
);

CREATE INDEX idx_exams_patient ON examinations (patient_id);
CREATE INDEX idx_exams_status ON examinations (status);
CREATE INDEX idx_exams_study_date ON examinations (study_date);

CREATE TABLE images (
    id            TEXT PRIMARY KEY,
    exam_id       TEXT NOT NULL REFERENCES examinations (id),
    seq           INTEGER NOT NULL,
    original_name TEXT NOT NULL,
    stored_file   TEXT NOT NULL,
    frame_index   INTEGER NOT NULL DEFAULT 0,
    format        TEXT NOT NULL CHECK (format IN ('png', 'jpeg', 'dicom')),
    sha256        TEXT NOT NULL,
    file_size     INTEGER NOT NULL,
    width         INTEGER NOT NULL,
    height        INTEGER NOT NULL,
    bits_stored   INTEGER,
    is_color      INTEGER NOT NULL DEFAULT 0,
    window_center REAL NOT NULL,
    window_width  REAL NOT NULL,
    value_min     REAL NOT NULL,
    value_max     REAL NOT NULL,
    invert        INTEGER NOT NULL DEFAULT 0,
    metadata      TEXT NOT NULL DEFAULT '{}',
    warnings      TEXT NOT NULL DEFAULT '[]',
    imported_at   TEXT NOT NULL,
    imported_by   TEXT REFERENCES users (id),
    UNIQUE (exam_id, sha256, frame_index)
);

CREATE INDEX idx_images_exam ON images (exam_id, seq);

CREATE TABLE analyses (
    id                  TEXT PRIMARY KEY,
    image_id            TEXT NOT NULL REFERENCES images (id),
    exam_id             TEXT NOT NULL REFERENCES examinations (id),
    status              TEXT NOT NULL CHECK (status IN ('completed', 'failed')),
    model_id            TEXT NOT NULL,
    model_name          TEXT NOT NULL,
    model_version       TEXT NOT NULL,
    model_sha256        TEXT,
    model_fixture       INTEGER NOT NULL DEFAULT 0,
    probability         REAL,
    verdict             TEXT CHECK (verdict IN ('positive', 'negative', 'indeterminate')),
    predicted_label     TEXT,
    class_probabilities TEXT,
    threshold           REAL,
    low_confidence_band REAL,
    activation_map      TEXT,
    activation_label    TEXT,
    preprocessing       TEXT,
    latency_ms          INTEGER,
    error               TEXT,
    created_at          TEXT NOT NULL,
    created_by          TEXT REFERENCES users (id)
);

CREATE INDEX idx_analyses_image ON analyses (image_id, created_at);
CREATE INDEX idx_analyses_exam ON analyses (exam_id);

CREATE TABLE reviews (
    id               TEXT PRIMARY KEY,
    exam_id          TEXT NOT NULL REFERENCES examinations (id),
    version          INTEGER NOT NULL,
    status           TEXT NOT NULL CHECK (status IN ('draft', 'signed')),
    impression       TEXT CHECK (impression IN ('tumor_suspected', 'no_tumor', 'indeterminate', 'non_diagnostic')),
    ai_agreement     TEXT CHECK (ai_agreement IN ('agree', 'disagree', 'partial', 'not_applicable')),
    findings         TEXT NOT NULL DEFAULT '',
    recommendation   TEXT NOT NULL DEFAULT '',
    amendment_reason TEXT,
    author_id        TEXT NOT NULL REFERENCES users (id),
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL,
    signed_at        TEXT,
    signed_by        TEXT REFERENCES users (id),
    UNIQUE (exam_id, version)
);

CREATE TABLE audit_log (
    seq         INTEGER PRIMARY KEY AUTOINCREMENT,
    id          TEXT NOT NULL UNIQUE,
    ts          TEXT NOT NULL,
    user_id     TEXT,
    username    TEXT,
    action      TEXT NOT NULL,
    entity_type TEXT,
    entity_id   TEXT,
    details     TEXT NOT NULL DEFAULT '{}',
    prev_hash   TEXT NOT NULL,
    hash        TEXT NOT NULL
);

CREATE INDEX idx_audit_ts ON audit_log (ts);
CREATE INDEX idx_audit_action ON audit_log (action);

CREATE TABLE settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by TEXT
);

CREATE TABLE counters (
    name  TEXT PRIMARY KEY,
    value INTEGER NOT NULL
);
