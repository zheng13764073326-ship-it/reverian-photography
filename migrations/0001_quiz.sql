CREATE TABLE IF NOT EXISTS quiz_records (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  version TEXT NOT NULL,
  correct_count INTEGER NOT NULL,
  total INTEGER NOT NULL,
  answers_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS quiz_records_date ON quiz_records(submitted_at DESC, id DESC);
CREATE TABLE IF NOT EXISTS quiz_rate_limits (
  bucket TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
