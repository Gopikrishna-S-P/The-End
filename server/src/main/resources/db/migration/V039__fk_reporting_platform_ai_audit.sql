-- V039__fk_reporting_platform_ai_audit.sql
-- scheduler_job_runs (V009) has no FK-able columns -- not touched.
-- org_subscriptions (V021) and daily_attendance/visit_sessions (V024/V025)
-- already have FKs from when they were created -- not touched.

ALTER TABLE agent_performance_snapshots
    ADD CONSTRAINT fk_agent_performance_snapshots_agent FOREIGN KEY (agent_id)        REFERENCES users (id)         ON DELETE RESTRICT,
    ADD CONSTRAINT fk_agent_performance_snapshots_org   FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT;

ALTER TABLE monthly_loan_book_snapshots
    ADD CONSTRAINT fk_monthly_loan_book_snapshots_org FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT;

ALTER TABLE report_jobs
    ADD CONSTRAINT fk_report_jobs_organization  FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_report_jobs_requested_by  FOREIGN KEY (requested_by)    REFERENCES users (id)         ON DELETE SET NULL;

ALTER TABLE feature_flags
    ADD CONSTRAINT fk_feature_flags_organization FOREIGN KEY (organization_id)     REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_feature_flags_updated_by   FOREIGN KEY (updated_by_user_id)  REFERENCES users (id)         ON DELETE SET NULL;

ALTER TABLE model_registry
    ADD CONSTRAINT fk_model_registry_approved_by FOREIGN KEY (approved_by_user_id) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE user_creation_requests
    ADD CONSTRAINT fk_user_creation_requests_organization  FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_user_creation_requests_requested_by  FOREIGN KEY (requested_by)    REFERENCES users (id)         ON DELETE RESTRICT,
    ADD CONSTRAINT fk_user_creation_requests_reviewed_by   FOREIGN KEY (reviewed_by)     REFERENCES users (id)         ON DELETE SET NULL,
    ADD CONSTRAINT fk_user_creation_requests_created_user  FOREIGN KEY (created_user_id) REFERENCES users (id)         ON DELETE SET NULL;

-- lucien_chat_sessions/messages/system_prompts: renamed from friday_* by V003;
-- table/column names below are the POST-rename (lucien_*) names.
ALTER TABLE lucien_chat_sessions
    ADD CONSTRAINT fk_lucien_chat_sessions_agent FOREIGN KEY (agent_id) REFERENCES users (id) ON DELETE RESTRICT;

ALTER TABLE lucien_chat_messages
    ADD CONSTRAINT fk_lucien_chat_messages_session FOREIGN KEY (session_id) REFERENCES lucien_chat_sessions (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_lucien_chat_messages_agent   FOREIGN KEY (agent_id)   REFERENCES users (id)                ON DELETE RESTRICT;

ALTER TABLE lucien_system_prompts
    ADD CONSTRAINT fk_lucien_system_prompts_updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE RESTRICT;

ALTER TABLE app_notifications
    ADD CONSTRAINT fk_app_notifications_recipient    FOREIGN KEY (recipient_id)    REFERENCES users (id)         ON DELETE CASCADE,
    ADD CONSTRAINT fk_app_notifications_organization FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT;

ALTER TABLE user_action_audit_logs
    ADD CONSTRAINT fk_user_action_audit_logs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;

-- FK-column indexes not already present in earlier migrations' index sections.
CREATE INDEX idx_model_registry_approved_by ON model_registry (approved_by_user_id);
CREATE INDEX idx_user_creation_requests_created_user ON user_creation_requests (created_user_id);
CREATE INDEX idx_app_notifications_organization ON app_notifications (organization_id);
