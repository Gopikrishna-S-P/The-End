-- The FeatureFlag entity carries a `source` discriminator (PLAN vs MANUAL,
-- design-doc §11.2) that the original V001 baseline table omitted. Add it so
-- a fresh Flyway-built schema matches the JPA model under ddl-auto=validate.
ALTER TABLE feature_flags
    ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'PLAN';
