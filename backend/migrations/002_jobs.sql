CREATE TABLE jobs(id TEXT PRIMARY KEY, agency_id TEXT NOT NULL REFERENCES agencies(id), thread_id TEXT NOT NULL, message_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', attempts INTEGER NOT NULL DEFAULT 0, available_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX jobs_pending ON jobs(status,available_at);
