CREATE TABLE IF NOT EXISTS email_batches (
 id TEXT PRIMARY KEY,
 payload_hash TEXT NOT NULL,
 recipient TEXT NOT NULL,
 subject TEXT NOT NULL,
 created_at TEXT NOT NULL,
 accepted_at TEXT,
 status TEXT NOT NULL CHECK (status IN ('pending','accepted','failed','unknown')),
 provider_id TEXT,
 error TEXT,
 size INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS email_batches_created ON email_batches(created_at);
