-- Records every scheduler job execution for operational observability.
CREATE TABLE IF NOT EXISTS scheduler_job_runs (
    id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    job_name        VARCHAR(120) NOT NULL,
    status          VARCHAR(20)  NOT NULL DEFAULT 'RUNNING',
    started_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    finished_at     TIMESTAMP,
    rows_processed  INTEGER,
    error_message   TEXT
);

CREATE INDEX IF NOT EXISTS idx_sjr_job_started ON scheduler_job_runs (job_name, started_at);
