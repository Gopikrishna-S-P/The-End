-- V037__fk_ptp_comms.sql
-- ptp_audit_logs and restructure_proposals already have FKs (V031).

ALTER TABLE ptp_records
    ADD CONSTRAINT fk_ptp_records_allocation FOREIGN KEY (allocation_id) REFERENCES allocations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_ptp_records_agent      FOREIGN KEY (agent_id)      REFERENCES users (id)        ON DELETE RESTRICT,
    ADD CONSTRAINT fk_ptp_records_created_by FOREIGN KEY (created_by)    REFERENCES users (id)        ON DELETE RESTRICT,
    ADD CONSTRAINT fk_ptp_records_updated_by FOREIGN KEY (updated_by)    REFERENCES users (id)        ON DELETE SET NULL;

ALTER TABLE ptp_history
    ADD CONSTRAINT fk_ptp_history_ptp        FOREIGN KEY (ptp_id)        REFERENCES ptp_records (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_ptp_history_allocation FOREIGN KEY (allocation_id) REFERENCES allocations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_ptp_history_changed_by FOREIGN KEY (changed_by)    REFERENCES users (id)        ON DELETE RESTRICT;

ALTER TABLE message_templates
    ADD CONSTRAINT fk_message_templates_organization FOREIGN KEY (organization_id)      REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_message_templates_created_by   FOREIGN KEY (created_by_user_id)   REFERENCES users (id)         ON DELETE RESTRICT,
    ADD CONSTRAINT fk_message_templates_approved_by  FOREIGN KEY (approved_by_user_id)  REFERENCES users (id)         ON DELETE SET NULL;

ALTER TABLE communication_logs
    ADD CONSTRAINT fk_communication_logs_organization FOREIGN KEY (organization_id) REFERENCES organizations (id)   ON DELETE RESTRICT,
    ADD CONSTRAINT fk_communication_logs_borrower     FOREIGN KEY (borrower_id)     REFERENCES borrowers (id)       ON DELETE SET NULL,
    ADD CONSTRAINT fk_communication_logs_allocation   FOREIGN KEY (allocation_id)   REFERENCES allocations (id)     ON DELETE SET NULL,
    ADD CONSTRAINT fk_communication_logs_template     FOREIGN KEY (template_id)     REFERENCES message_templates (id) ON DELETE SET NULL;

-- FK-column indexes not already present in V001's index section.
CREATE INDEX idx_ptp_history_changed_by ON ptp_history (changed_by);
CREATE INDEX idx_communication_logs_template ON communication_logs (template_id);
