-- Bobium Rater — D1 schema
-- Run locally:  wrangler d1 execute bobium-ratings --local --file=scripts/init-d1.sql
-- Run in prod:  wrangler d1 execute bobium-ratings --file=scripts/init-d1.sql

CREATE TABLE IF NOT EXISTS ratings (
  creature_id        TEXT PRIMARY KEY,
  rating             INTEGER,
  tags               TEXT NOT NULL DEFAULT '[]',
  style_violations   TEXT NOT NULL DEFAULT '[]',
  has_style_violations INTEGER NOT NULL DEFAULT 0,
  custom_tags        TEXT NOT NULL DEFAULT '[]',
  notes              TEXT NOT NULL DEFAULT '',
  rated_at           TEXT,
  rated_by           TEXT
);

CREATE TABLE IF NOT EXISTS custom_tags (
  tag        TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT
);
