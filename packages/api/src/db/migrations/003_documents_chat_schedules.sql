-- Migration 003: Documents, Chat, and Schedules Tables
-- Creates documents, chat_sessions, and schedule_snapshots tables
-- Compatible with both SQLite and PostgreSQL

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  format TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (project_id, document_type, version),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id, document_type);
CREATE INDEX IF NOT EXISTS idx_documents_project_version ON documents(project_id, document_type, version DESC);

-- Chat Sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  messages TEXT NOT NULL DEFAULT '[]', -- JSON array
  context_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_project ON chat_sessions(project_id, updated_at DESC);

-- Schedule Snapshots table
CREATE TABLE IF NOT EXISTS schedule_snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  parameters TEXT NOT NULL, -- JSON object
  result TEXT NOT NULL, -- JSON object
  reasoning TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_schedule_snapshots_project ON schedule_snapshots(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_snapshots_type ON schedule_snapshots(type);
