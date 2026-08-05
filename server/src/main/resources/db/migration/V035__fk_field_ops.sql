-- V035__fk_field_ops.sql

ALTER TABLE visit_logs
    ADD CONSTRAINT fk_visit_logs_allocation   FOREIGN KEY (allocation_id)   REFERENCES allocations (id)   ON DELETE RESTRICT,
    ADD CONSTRAINT fk_visit_logs_assignment   FOREIGN KEY (assignment_id)   REFERENCES assignments (id)   ON DELETE SET NULL,
    ADD CONSTRAINT fk_visit_logs_agent        FOREIGN KEY (agent_id)        REFERENCES users (id)         ON DELETE RESTRICT,
    ADD CONSTRAINT fk_visit_logs_organization FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_visit_logs_approved_by  FOREIGN KEY (approved_by)     REFERENCES users (id)         ON DELETE SET NULL,
    ADD CONSTRAINT fk_visit_logs_collection   FOREIGN KEY (collection_id)   REFERENCES collections (id)   ON DELETE SET NULL,
    ADD CONSTRAINT fk_visit_logs_ptp          FOREIGN KEY (ptp_id)          REFERENCES ptp_records (id)   ON DELETE SET NULL,
    ADD CONSTRAINT fk_visit_logs_created_by   FOREIGN KEY (created_by)      REFERENCES users (id)         ON DELETE RESTRICT,
    ADD CONSTRAINT fk_visit_logs_updated_by   FOREIGN KEY (updated_by)      REFERENCES users (id)         ON DELETE SET NULL;

ALTER TABLE visit_images
    ADD CONSTRAINT fk_visit_images_visit_log  FOREIGN KEY (visit_log_id) REFERENCES visit_logs (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_visit_images_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users (id)      ON DELETE RESTRICT;

ALTER TABLE agent_shifts
    ADD CONSTRAINT fk_agent_shifts_agent        FOREIGN KEY (agent_id)        REFERENCES users (id)         ON DELETE RESTRICT,
    ADD CONSTRAINT fk_agent_shifts_organization FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT;

ALTER TABLE agent_location_pings
    ADD CONSTRAINT fk_agent_location_pings_agent FOREIGN KEY (agent_id) REFERENCES users (id)        ON DELETE RESTRICT,
    ADD CONSTRAINT fk_agent_location_pings_shift FOREIGN KEY (shift_id) REFERENCES agent_shifts (id) ON DELETE CASCADE;

ALTER TABLE non_contactables
    ADD CONSTRAINT fk_non_contactables_organization FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_non_contactables_allocation   FOREIGN KEY (allocation_id)   REFERENCES allocations (id)   ON DELETE RESTRICT,
    ADD CONSTRAINT fk_non_contactables_visit        FOREIGN KEY (visit_id)        REFERENCES visit_logs (id)    ON DELETE SET NULL,
    ADD CONSTRAINT fk_non_contactables_agent        FOREIGN KEY (agent_id)        REFERENCES users (id)         ON DELETE RESTRICT;

ALTER TABLE incident_reports
    ADD CONSTRAINT fk_incident_reports_agent         FOREIGN KEY (agent_id)             REFERENCES users (id)         ON DELETE RESTRICT,
    ADD CONSTRAINT fk_incident_reports_organization  FOREIGN KEY (organization_id)      REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_incident_reports_shift         FOREIGN KEY (shift_id)             REFERENCES agent_shifts (id)  ON DELETE SET NULL,
    ADD CONSTRAINT fk_incident_reports_resolved_by   FOREIGN KEY (resolved_by_user_id)  REFERENCES users (id)         ON DELETE SET NULL;

-- FK-column indexes not already present in V001's index section.
CREATE INDEX idx_visit_logs_assignment ON visit_logs (assignment_id);
CREATE INDEX idx_visit_logs_approved_by ON visit_logs (approved_by);
CREATE INDEX idx_visit_logs_collection ON visit_logs (collection_id);
CREATE INDEX idx_visit_logs_ptp ON visit_logs (ptp_id);
CREATE INDEX idx_visit_images_uploaded_by ON visit_images (uploaded_by);
CREATE INDEX idx_non_contactables_visit ON non_contactables (visit_id);
CREATE INDEX idx_incident_reports_shift ON incident_reports (shift_id);
CREATE INDEX idx_incident_reports_resolved_by ON incident_reports (resolved_by_user_id);
