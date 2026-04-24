-- Migration 004: Chat Messages Table
-- Creates chat_messages table for individual message persistence
-- Compatible with both SQLite and PostgreSQL

-- Chat Messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_project ON chat_messages(project_id, created_at DESC);
