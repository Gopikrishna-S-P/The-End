-- Double-entry bookkeeping ledger for collection monetary events.
-- Every approval and deposit produces two rows (debit + credit).
-- Rows are insert-only; the immutable trigger below prevents any UPDATE or DELETE.

CREATE TABLE collection_ledger_entries (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID        NOT NULL,
    collection_id   UUID        NOT NULL,
    allocation_id   UUID        NOT NULL,
    entry_type      VARCHAR(30) NOT NULL,
    debit_account   VARCHAR(40) NOT NULL,
    credit_account  VARCHAR(40) NOT NULL,
    amount          NUMERIC(15,2) NOT NULL,
    currency        VARCHAR(3)  NOT NULL DEFAULT 'INR',
    reference_id    VARCHAR(64),
    actor_id        UUID,
    notes           TEXT,
    created_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

CREATE INDEX idx_ledger_org_created  ON collection_ledger_entries (organization_id, created_at);
CREATE INDEX idx_ledger_collection   ON collection_ledger_entries (collection_id);
CREATE INDEX idx_ledger_allocation   ON collection_ledger_entries (allocation_id);
CREATE INDEX idx_ledger_debit_acct   ON collection_ledger_entries (debit_account);
CREATE INDEX idx_ledger_credit_acct  ON collection_ledger_entries (credit_account);

-- Immutable: no UPDATE or DELETE allowed on ledger rows.
CREATE OR REPLACE FUNCTION collection_ledger_immutable() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'collection_ledger_entries is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_immutable
    BEFORE UPDATE OR DELETE ON collection_ledger_entries
    FOR EACH ROW EXECUTE FUNCTION collection_ledger_immutable();
