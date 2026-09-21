CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 1,
  color TEXT NOT NULL DEFAULT '#D9E1F2',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- type: ESTUDO | SIMULADO | REVISAO_24H | REVISAO_7D | REVISAO_15D | REVISAO_30D
-- status: TODO | DONE | POSTPONED
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  topic_id TEXT REFERENCES topics(id),
  date TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'ESTUDO',
  status TEXT NOT NULL DEFAULT 'TODO',
  minutes INTEGER NOT NULL DEFAULT 120,
  questions INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  origin_session_id TEXT REFERENCES sessions(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_sessions_topic ON sessions(topic_id);
