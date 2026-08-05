-- V042__receipt_sequences.sql
CREATE TABLE receipt_sequences (
    organization_id UUID NOT NULL REFERENCES organizations (id) ON DELETE RESTRICT,
    seq_date        DATE NOT NULL,
    last_value      BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (organization_id, seq_date)
);
