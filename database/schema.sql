-- Run once: psql -U postgres -d iiup_db -f database/schema.sql
-- (The backend also creates these tables automatically on startup.)
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(120) NOT NULL DEFAULT 'Demo User',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analysis_sessions (
    id            UUID PRIMARY KEY,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         VARCHAR(200) NOT NULL,
    chat_history  JSONB NOT NULL DEFAULT '[]',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
    id              UUID PRIMARY KEY,
    session_id      UUID NOT NULL REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    file_name       VARCHAR(255) NOT NULL,
    file_type       VARCHAR(20) NOT NULL,
    size_bytes      BIGINT NOT NULL,
    page_count      INTEGER,
    extracted_text  TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analysis_results (
    id                   UUID PRIMARY KEY,
    session_id           UUID NOT NULL REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    analysis_type        VARCHAR(120) NOT NULL,
    summary              JSONB NOT NULL DEFAULT '[]',
    comparison           JSONB NOT NULL DEFAULT '{}',
    important_findings   JSONB NOT NULL DEFAULT '[]',
    conflicts            JSONB NOT NULL DEFAULT '[]',
    missing_information  JSONB NOT NULL DEFAULT '[]',
    full_result          JSONB NOT NULL DEFAULT '{}',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_session ON documents(session_id);
CREATE INDEX IF NOT EXISTS idx_results_session ON analysis_results(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON analysis_sessions(created_at DESC);
