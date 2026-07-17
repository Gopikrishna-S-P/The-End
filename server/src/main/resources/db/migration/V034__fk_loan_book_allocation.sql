-- V034__fk_loan_book_allocation.sql

ALTER TABLE file_uploads
    ADD CONSTRAINT fk_file_uploads_organization FOREIGN KEY (organization_id)     REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_file_uploads_uploaded_by  FOREIGN KEY (uploaded_by_user_id) REFERENCES users (id)         ON DELETE SET NULL,
    ADD CONSTRAINT fk_file_uploads_deleted_by   FOREIGN KEY (deleted_by_user_id)  REFERENCES users (id)         ON DELETE SET NULL;

ALTER TABLE file_processing_errors
    ADD CONSTRAINT fk_file_processing_errors_upload FOREIGN KEY (file_upload_id) REFERENCES file_uploads (id) ON DELETE CASCADE;

ALTER TABLE column_schemas
    ADD CONSTRAINT fk_column_schemas_organization FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT;

ALTER TABLE borrowers
    ADD CONSTRAINT fk_borrowers_organization FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT;

ALTER TABLE allocations
    ADD CONSTRAINT fk_allocations_file_upload      FOREIGN KEY (file_upload_id)       REFERENCES file_uploads (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_allocations_organization     FOREIGN KEY (organization_id)      REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_allocations_assigned_to      FOREIGN KEY (assigned_to_user_id)  REFERENCES users (id)         ON DELETE SET NULL,
    ADD CONSTRAINT fk_allocations_deleted_by       FOREIGN KEY (deleted_by_user_id)   REFERENCES users (id)         ON DELETE SET NULL,
    ADD CONSTRAINT fk_allocations_borrower         FOREIGN KEY (borrower_id)          REFERENCES borrowers (id)     ON DELETE SET NULL,
    ADD CONSTRAINT fk_allocations_restructured_from FOREIGN KEY (restructured_from_id) REFERENCES allocations (id)  ON DELETE SET NULL;

ALTER TABLE assignments
    ADD CONSTRAINT fk_assignments_allocation      FOREIGN KEY (allocation_id)      REFERENCES allocations (id)  ON DELETE RESTRICT,
    ADD CONSTRAINT fk_assignments_agent           FOREIGN KEY (agent_id)           REFERENCES users (id)        ON DELETE RESTRICT,
    ADD CONSTRAINT fk_assignments_organization    FOREIGN KEY (organization_id)    REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_assignments_assigned_by     FOREIGN KEY (assigned_by)        REFERENCES users (id)        ON DELETE RESTRICT,
    ADD CONSTRAINT fk_assignments_previous_agent  FOREIGN KEY (previous_agent_id)  REFERENCES users (id)        ON DELETE SET NULL;

ALTER TABLE assignment_audit_logs
    ADD CONSTRAINT fk_assignment_audit_logs_assignment      FOREIGN KEY (assignment_id)      REFERENCES assignments (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_assignment_audit_logs_allocation      FOREIGN KEY (allocation_id)      REFERENCES allocations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_assignment_audit_logs_performed_by    FOREIGN KEY (performed_by)       REFERENCES users (id)       ON DELETE RESTRICT,
    ADD CONSTRAINT fk_assignment_audit_logs_previous_agent  FOREIGN KEY (previous_agent_id)  REFERENCES users (id)       ON DELETE SET NULL,
    ADD CONSTRAINT fk_assignment_audit_logs_new_agent       FOREIGN KEY (new_agent_id)       REFERENCES users (id)       ON DELETE SET NULL;

ALTER TABLE daily_visit_list
    ADD CONSTRAINT fk_daily_visit_list_organization FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_daily_visit_list_agent        FOREIGN KEY (agent_user_id)   REFERENCES users (id)         ON DELETE RESTRICT,
    ADD CONSTRAINT fk_daily_visit_list_allocation   FOREIGN KEY (allocation_id)   REFERENCES allocations (id)   ON DELETE RESTRICT,
    ADD CONSTRAINT fk_daily_visit_list_created_by   FOREIGN KEY (created_by)      REFERENCES users (id)         ON DELETE RESTRICT;

ALTER TABLE agent_capacity_config
    ADD CONSTRAINT fk_agent_capacity_config_organization FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT;

ALTER TABLE holiday_calendar
    ADD CONSTRAINT fk_holiday_calendar_organization FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT;

ALTER TABLE borrower_risk_scores
    ADD CONSTRAINT fk_borrower_risk_scores_organization FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_borrower_risk_scores_borrower     FOREIGN KEY (borrower_id)      REFERENCES borrowers (id)     ON DELETE RESTRICT;

ALTER TABLE npa_records
    ADD CONSTRAINT fk_npa_records_allocation      FOREIGN KEY (allocation_id)      REFERENCES allocations (id)   ON DELETE RESTRICT,
    ADD CONSTRAINT fk_npa_records_organization    FOREIGN KEY (organization_id)    REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_npa_records_assigned_agent  FOREIGN KEY (assigned_agent_id)  REFERENCES users (id)         ON DELETE SET NULL;

-- FK-column indexes not already present in V001's index section.
CREATE INDEX idx_file_uploads_uploaded_by ON file_uploads (uploaded_by_user_id);
CREATE INDEX idx_allocations_assigned_to ON allocations (assigned_to_user_id);
CREATE INDEX idx_allocations_borrower ON allocations (borrower_id);
CREATE INDEX idx_assignments_assigned_by ON assignments (assigned_by);
CREATE INDEX idx_assignment_audit_logs_allocation ON assignment_audit_logs (allocation_id);
CREATE INDEX idx_daily_visit_list_created_by ON daily_visit_list (created_by);
CREATE INDEX idx_npa_records_assigned_agent ON npa_records (assigned_agent_id);
