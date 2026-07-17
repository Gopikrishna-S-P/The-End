-- V036__fk_collections_payments.sql
-- collection_ledger_entries already has FKs (V029). Everything else in this
-- bounded context still has none.

ALTER TABLE collections
    ADD CONSTRAINT fk_collections_allocation           FOREIGN KEY (allocation_id)             REFERENCES allocations (id)   ON DELETE RESTRICT,
    ADD CONSTRAINT fk_collections_organization         FOREIGN KEY (organization_id)           REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_collections_submitted_by         FOREIGN KEY (submitted_by)               REFERENCES users (id)         ON DELETE RESTRICT,
    ADD CONSTRAINT fk_collections_approved_by          FOREIGN KEY (approved_by)                REFERENCES users (id)         ON DELETE SET NULL,
    ADD CONSTRAINT fk_collections_deposited_by         FOREIGN KEY (deposited_by)               REFERENCES users (id)         ON DELETE SET NULL,
    ADD CONSTRAINT fk_collections_cash_supervisor      FOREIGN KEY (cash_supervisor_signed_by)  REFERENCES users (id)         ON DELETE SET NULL;

ALTER TABLE collection_audit_logs
    ADD CONSTRAINT fk_collection_audit_logs_collection  FOREIGN KEY (collection_id) REFERENCES collections (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_collection_audit_logs_performed_by FOREIGN KEY (performed_by) REFERENCES users (id)       ON DELETE RESTRICT;

ALTER TABLE collection_documents
    ADD CONSTRAINT fk_collection_documents_collection  FOREIGN KEY (collection_id) REFERENCES collections (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_collection_documents_uploaded_by FOREIGN KEY (uploaded_by)   REFERENCES users (id)       ON DELETE RESTRICT;

ALTER TABLE payment_intents
    ADD CONSTRAINT fk_payment_intents_organization  FOREIGN KEY (organization_id)     REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_payment_intents_allocation    FOREIGN KEY (allocation_id)       REFERENCES allocations (id)   ON DELETE RESTRICT,
    ADD CONSTRAINT fk_payment_intents_borrower      FOREIGN KEY (borrower_id)         REFERENCES borrowers (id)     ON DELETE SET NULL,
    ADD CONSTRAINT fk_payment_intents_created_by    FOREIGN KEY (created_by_user_id)  REFERENCES users (id)         ON DELETE SET NULL;

ALTER TABLE payment_links
    ADD CONSTRAINT fk_payment_links_intent      FOREIGN KEY (intent_id)          REFERENCES payment_intents (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_payment_links_created_by  FOREIGN KEY (created_by_user_id) REFERENCES users (id)           ON DELETE SET NULL;

ALTER TABLE payment_transactions
    ADD CONSTRAINT fk_payment_transactions_intent FOREIGN KEY (intent_id) REFERENCES payment_intents (id) ON DELETE RESTRICT;

ALTER TABLE payment_splits
    ADD CONSTRAINT fk_payment_splits_txn FOREIGN KEY (txn_id) REFERENCES payment_transactions (id) ON DELETE CASCADE;

ALTER TABLE reconciliation_runs
    ADD CONSTRAINT fk_reconciliation_runs_organization FOREIGN KEY (organization_id)    REFERENCES organizations (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_reconciliation_runs_report_job   FOREIGN KEY (report_job_id)      REFERENCES report_jobs (id)   ON DELETE SET NULL,
    ADD CONSTRAINT fk_reconciliation_runs_started_by   FOREIGN KEY (started_by_user_id) REFERENCES users (id)         ON DELETE SET NULL;

ALTER TABLE bank_statement_rows
    ADD CONSTRAINT fk_bank_statement_rows_run              FOREIGN KEY (run_id)                  REFERENCES reconciliation_runs (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_bank_statement_rows_matched_txn      FOREIGN KEY (matched_payment_txn_id)  REFERENCES payment_transactions (id) ON DELETE SET NULL;

-- FK-column indexes not already present in V001's index section.
CREATE INDEX idx_collections_deposited_by ON collections (deposited_by);
CREATE INDEX idx_collections_cash_supervisor ON collections (cash_supervisor_signed_by);
CREATE INDEX idx_payment_intents_borrower ON payment_intents (borrower_id);
CREATE INDEX idx_payment_intents_created_by ON payment_intents (created_by_user_id);
CREATE INDEX idx_reconciliation_runs_report_job ON reconciliation_runs (report_job_id);
CREATE INDEX idx_bank_statement_rows_matched_txn ON bank_statement_rows (matched_payment_txn_id);
