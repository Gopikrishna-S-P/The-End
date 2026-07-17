-- V043__version_columns.sql
-- ptp_records already has `version BIGINT NOT NULL DEFAULT 0` from V001 --
-- not touched here.

ALTER TABLE allocations       ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE collections       ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE assignments       ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE visit_sessions    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE payment_intents   ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
-- settlement_offers: no JPA entity exists for this table (confirmed 2026-07-03),
-- but the column is added anyway for schema-completeness / forward compatibility.
ALTER TABLE settlement_offers ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
