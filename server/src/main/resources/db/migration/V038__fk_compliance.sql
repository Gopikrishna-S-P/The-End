-- V038__fk_compliance.sql

ALTER TABLE consent_artifacts
    ADD CONSTRAINT fk_consent_artifacts_borrower     FOREIGN KEY (borrower_id)     REFERENCES borrowers (id)     ON DELETE RESTRICT,
    ADD CONSTRAINT fk_consent_artifacts_organization FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE RESTRICT;

ALTER TABLE data_erasure_requests
    ADD CONSTRAINT fk_data_erasure_requests_borrower     FOREIGN KEY (borrower_id)          REFERENCES borrowers (id)     ON DELETE RESTRICT,
    ADD CONSTRAINT fk_data_erasure_requests_organization FOREIGN KEY (organization_id)      REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_data_erasure_requests_requested_by FOREIGN KEY (requested_by_user_id) REFERENCES users (id)         ON DELETE SET NULL,
    ADD CONSTRAINT fk_data_erasure_requests_reviewed_by  FOREIGN KEY (reviewed_by_user_id)  REFERENCES users (id)         ON DELETE SET NULL;

ALTER TABLE grievances
    ADD CONSTRAINT fk_grievances_organization  FOREIGN KEY (organization_id)     REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_grievances_allocation    FOREIGN KEY (allocation_id)       REFERENCES allocations (id)   ON DELETE SET NULL,
    ADD CONSTRAINT fk_grievances_raised_by     FOREIGN KEY (raised_by_user_id)   REFERENCES users (id)         ON DELETE SET NULL,
    ADD CONSTRAINT fk_grievances_assigned_to   FOREIGN KEY (assigned_to_user_id) REFERENCES users (id)         ON DELETE SET NULL;

ALTER TABLE grievance_officers
    ADD CONSTRAINT fk_grievance_officers_organization FOREIGN KEY (organization_id)     REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_grievance_officers_updated_by   FOREIGN KEY (updated_by_user_id)  REFERENCES users (id)         ON DELETE SET NULL;

ALTER TABLE lsp_disclosures
    ADD CONSTRAINT fk_lsp_disclosures_organization FOREIGN KEY (organization_id)    REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_lsp_disclosures_updated_by   FOREIGN KEY (updated_by_user_id) REFERENCES users (id)         ON DELETE SET NULL;

ALTER TABLE key_fact_statements
    ADD CONSTRAINT fk_key_fact_statements_allocation   FOREIGN KEY (allocation_id)        REFERENCES allocations (id)   ON DELETE RESTRICT,
    ADD CONSTRAINT fk_key_fact_statements_organization FOREIGN KEY (organization_id)      REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_key_fact_statements_generated_by FOREIGN KEY (generated_by_user_id) REFERENCES users (id)         ON DELETE SET NULL;

ALTER TABLE settlement_offers
    ADD CONSTRAINT fk_settlement_offers_organization       FOREIGN KEY (organization_id)                 REFERENCES organizations (id)   ON DELETE RESTRICT,
    ADD CONSTRAINT fk_settlement_offers_allocation         FOREIGN KEY (allocation_id)                   REFERENCES allocations (id)     ON DELETE RESTRICT,
    ADD CONSTRAINT fk_settlement_offers_borrower           FOREIGN KEY (borrower_id)                     REFERENCES borrowers (id)       ON DELETE SET NULL,
    ADD CONSTRAINT fk_settlement_offers_drafted_by         FOREIGN KEY (drafted_by_user_id)              REFERENCES users (id)           ON DELETE RESTRICT,
    ADD CONSTRAINT fk_settlement_offers_proposed_by        FOREIGN KEY (proposed_by_user_id)             REFERENCES users (id)           ON DELETE SET NULL,
    ADD CONSTRAINT fk_settlement_offers_approved_by        FOREIGN KEY (approved_by_user_id)             REFERENCES users (id)           ON DELETE SET NULL,
    ADD CONSTRAINT fk_settlement_offers_rejected_by        FOREIGN KEY (rejected_by_user_id)             REFERENCES users (id)           ON DELETE SET NULL,
    ADD CONSTRAINT fk_settlement_offers_compliance_review  FOREIGN KEY (compliance_reviewed_by_user_id)  REFERENCES users (id)           ON DELETE SET NULL,
    ADD CONSTRAINT fk_settlement_offers_consent            FOREIGN KEY (borrower_consent_artifact_id)    REFERENCES consent_artifacts (id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_settlement_offers_payment_intent     FOREIGN KEY (payment_intent_id)               REFERENCES payment_intents (id) ON DELETE SET NULL;

ALTER TABLE settlement_audit_logs
    ADD CONSTRAINT fk_settlement_audit_logs_offer        FOREIGN KEY (settlement_offer_id) REFERENCES settlement_offers (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_settlement_audit_logs_allocation   FOREIGN KEY (allocation_id)       REFERENCES allocations (id)       ON DELETE RESTRICT,
    ADD CONSTRAINT fk_settlement_audit_logs_performed_by FOREIGN KEY (performed_by)        REFERENCES users (id)             ON DELETE RESTRICT;

ALTER TABLE fraud_cases
    ADD CONSTRAINT fk_fraud_cases_organization    FOREIGN KEY (organization_id)         REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_fraud_cases_allocation      FOREIGN KEY (allocation_id)           REFERENCES allocations (id)   ON DELETE SET NULL,
    ADD CONSTRAINT fk_fraud_cases_borrower        FOREIGN KEY (borrower_id)             REFERENCES borrowers (id)     ON DELETE SET NULL,
    ADD CONSTRAINT fk_fraud_cases_investigated_by FOREIGN KEY (investigated_by_user_id) REFERENCES users (id)         ON DELETE SET NULL,
    ADD CONSTRAINT fk_fraud_cases_reported_by     FOREIGN KEY (reported_by_user_id)     REFERENCES users (id)         ON DELETE RESTRICT;

ALTER TABLE compliance_decisions
    ADD CONSTRAINT fk_compliance_decisions_allocation FOREIGN KEY (allocation_id) REFERENCES allocations (id)   ON DELETE SET NULL,
    ADD CONSTRAINT fk_compliance_decisions_org        FOREIGN KEY (org_id)        REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_compliance_decisions_actor      FOREIGN KEY (actor_id)      REFERENCES users (id)         ON DELETE SET NULL;

-- FK-column indexes not already present in V001/V008's index sections.
CREATE INDEX idx_grievances_raised_by ON grievances (raised_by_user_id);
CREATE INDEX idx_grievances_assigned_to ON grievances (assigned_to_user_id);
CREATE INDEX idx_settlement_offers_drafted_by ON settlement_offers (drafted_by_user_id);
CREATE INDEX idx_fraud_cases_borrower ON fraud_cases (borrower_id);
CREATE INDEX idx_compliance_decisions_actor ON compliance_decisions (actor_id);
