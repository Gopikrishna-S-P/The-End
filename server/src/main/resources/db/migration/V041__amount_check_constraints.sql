-- V041__amount_check_constraints.sql
-- DATABASE_DESIGN.md §7: CHECK (amount >= 0) on every monetary column;
-- ledger debit/credit amounts CHECK (amount > 0) since a zero-value
-- ledger entry is never a real business event.

ALTER TABLE allocations
    ADD CONSTRAINT chk_allocations_total_due          CHECK (total_due IS NULL OR total_due >= 0),
    ADD CONSTRAINT chk_allocations_outstanding_amount  CHECK (outstanding_amount IS NULL OR outstanding_amount >= 0);

ALTER TABLE collections
    ADD CONSTRAINT chk_collections_amount CHECK (amount >= 0);

ALTER TABLE collection_ledger_entries
    ADD CONSTRAINT chk_collection_ledger_entries_amount CHECK (amount > 0);

ALTER TABLE ptp_records
    ADD CONSTRAINT chk_ptp_records_promised_amount   CHECK (promised_amount >= 0),
    ADD CONSTRAINT chk_ptp_records_collected_amount  CHECK (collected_amount IS NULL OR collected_amount >= 0),
    ADD CONSTRAINT chk_ptp_records_negotiated_amount CHECK (negotiated_amount IS NULL OR negotiated_amount >= 0),
    ADD CONSTRAINT chk_ptp_records_floor_amount      CHECK (floor_amount IS NULL OR floor_amount >= 0);

ALTER TABLE npa_records
    ADD CONSTRAINT chk_npa_records_outstanding_amount   CHECK (outstanding_amount >= 0),
    ADD CONSTRAINT chk_npa_records_last_payment_amount  CHECK (last_payment_amount IS NULL OR last_payment_amount >= 0);

ALTER TABLE payment_intents
    ADD CONSTRAINT chk_payment_intents_amount CHECK (amount >= 0);

ALTER TABLE payment_transactions
    ADD CONSTRAINT chk_payment_transactions_amount CHECK (amount >= 0);

ALTER TABLE payment_splits
    ADD CONSTRAINT chk_payment_splits_amount CHECK (amount >= 0);

ALTER TABLE bank_statement_rows
    ADD CONSTRAINT chk_bank_statement_rows_amount CHECK (amount >= 0);

ALTER TABLE agent_performance_snapshots
    ADD CONSTRAINT chk_agent_performance_snapshots_amount_collected   CHECK (amount_collected >= 0),
    ADD CONSTRAINT chk_agent_performance_snapshots_amount_outstanding CHECK (amount_outstanding >= 0);

ALTER TABLE monthly_loan_book_snapshots
    ADD CONSTRAINT chk_monthly_loan_book_snapshots_total_outstanding_amount CHECK (total_outstanding_amount >= 0),
    ADD CONSTRAINT chk_monthly_loan_book_snapshots_total_collected_amount   CHECK (total_collected_amount >= 0),
    ADD CONSTRAINT chk_monthly_loan_book_snapshots_total_npa_amount         CHECK (total_npa_amount >= 0);

ALTER TABLE settlement_offers
    ADD CONSTRAINT chk_settlement_offers_outstanding_at_offer CHECK (outstanding_at_offer >= 0),
    ADD CONSTRAINT chk_settlement_offers_offered_amount     CHECK (offered_amount >= 0);

ALTER TABLE restructure_proposals
    ADD CONSTRAINT chk_restructure_proposals_original_emi_amount CHECK (original_emi_amount >= 0),
    ADD CONSTRAINT chk_restructure_proposals_new_emi_amount      CHECK (new_emi_amount >= 0);

ALTER TABLE fraud_cases
    ADD CONSTRAINT chk_fraud_cases_amount_involved CHECK (amount_involved IS NULL OR amount_involved >= 0);
