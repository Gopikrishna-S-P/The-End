-- V044__missing_version_columns.sql
-- Organization.java and User.java have both declared @Version since before this
-- session, but neither V001 baseline nor any later migration ever added the
-- backing column — only surfaced now that flyway migrate + Hibernate
-- ddl-auto=validate have actually been run against a real Postgres instance
-- for the first time (2026-07-04). ptp_records already has it from V001;
-- allocations/collections/assignments/visit_sessions/payment_intents/
-- settlement_offers were added in V043 — neither touched here.

ALTER TABLE organizations ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE users         ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
