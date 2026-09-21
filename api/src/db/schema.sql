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

-- janelas de estudo por dia da semana (0 = domingo ... 6 = sábado), horários HH:MM
CREATE TABLE IF NOT EXISTS availability (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  weekday INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_availability_user ON availability(user_id);

-- compromissos fora do estudo: pontuais (date) ou semanais (weekday)
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Outro',
  date TEXT,
  weekday INTEGER,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);

CREATE TABLE IF NOT EXISTS simulados (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'MULTIPLA',
  duration_min INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  blank INTEGER NOT NULL DEFAULT 0,
  wrong INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_simulados_user ON simulados(user_id, date);

-- reason: DESATENCAO | DESCONHECIMENTO | ESQUECIMENTO
CREATE TABLE IF NOT EXISTS errors (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  topic_id TEXT REFERENCES topics(id),
  source TEXT,
  studied_at TEXT,
  repeat_at TEXT,
  reason TEXT NOT NULL,
  correct_reasoning TEXT,
  reviewed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_errors_user ON errors(user_id);

-- sincronização com calendário CalDAV (iCloud): a senha de app fica criptografada (AES-256-GCM)
CREATE TABLE IF NOT EXISTS calendar_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  apple_id TEXT NOT NULL,
  password_enc TEXT NOT NULL,
  calendar_name TEXT NOT NULL DEFAULT 'Concursei',
  auto_sync INTEGER NOT NULL DEFAULT 1,
  last_sync_at TEXT,
  last_result TEXT,
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS calendar_sync (
  user_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  uid TEXT NOT NULL,
  hash TEXT NOT NULL,
  seq INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, session_id)
);
