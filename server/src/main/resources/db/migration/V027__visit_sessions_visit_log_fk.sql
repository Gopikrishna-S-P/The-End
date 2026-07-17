-- V027__visit_sessions_visit_log_fk.sql
-- Add deferred FK from visit_sessions.visit_log_id to visit_logs(id).
-- V025 created the column without the constraint; adding it here.

ALTER TABLE visit_sessions
    ADD CONSTRAINT fk_visit_session_visit_log
        FOREIGN KEY (visit_log_id) REFERENCES visit_logs(id);
