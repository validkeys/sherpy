-- Migration 002: People and Resource Tables
-- Creates people, skills, person_skills, assignments, and availability_windows tables
-- Compatible with both SQLite and PostgreSQL

-- People table
CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  okta_user_id TEXT UNIQUE,
  capacity_hours_per_week REAL NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_people_email ON people(email);
CREATE INDEX IF NOT EXISTS idx_people_okta_user_id ON people(okta_user_id);

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT
);

CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category);

-- Person-Skill junction table (composite primary key)
CREATE TABLE IF NOT EXISTS person_skills (
  person_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  proficiency TEXT NOT NULL,
  PRIMARY KEY (person_id, skill_id),
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_person_skills_person ON person_skills(person_id);
CREATE INDEX IF NOT EXISTS idx_person_skills_skill ON person_skills(skill_id);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  allocation_percentage INTEGER NOT NULL,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_assignments_task ON assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_assignments_person ON assignments(person_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_dates ON assignments(start_date, end_date);

-- Availability Windows table
CREATE TABLE IF NOT EXISTS availability_windows (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_availability_person ON availability_windows(person_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_availability_dates ON availability_windows(start_date, end_date);
