CREATE TABLE finance_entries(agency_id TEXT NOT NULL REFERENCES agencies(id),id TEXT NOT NULL,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(agency_id,id));
CREATE UNIQUE INDEX finance_external ON finance_entries(agency_id,json_extract(data,'$.source'),json_extract(data,'$.externalId')) WHERE json_extract(data,'$.externalId')<>'';
CREATE TABLE finance_catalogs(agency_id TEXT NOT NULL REFERENCES agencies(id),id TEXT NOT NULL,data TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(agency_id,id));
CREATE TABLE finance_migrations(agency_id TEXT PRIMARY KEY REFERENCES agencies(id),created_at INTEGER NOT NULL);
CREATE TABLE finance_events(id INTEGER PRIMARY KEY,agency_id TEXT NOT NULL REFERENCES agencies(id),entry_id TEXT NOT NULL,user_id TEXT,action TEXT NOT NULL,reason TEXT,previous TEXT,next TEXT,created_at TEXT NOT NULL);
CREATE TABLE finance_requests(agency_id TEXT NOT NULL REFERENCES agencies(id),id TEXT NOT NULL,data TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(agency_id,id));
