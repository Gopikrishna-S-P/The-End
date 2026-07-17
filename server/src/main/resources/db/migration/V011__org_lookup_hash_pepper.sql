-- Per-org HMAC pepper for two-factor lookup-hash hardening (design-doc §9.11).
-- Even if the server-side HMAC key is compromised, an attacker who only has the
-- DB cannot compute valid lookup hashes without also knowing each org's pepper.

-- pgcrypto provides gen_random_bytes() used for the pepper backfill below.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE organizations
    ADD COLUMN lookup_hash_pepper TEXT;

-- Backfill existing orgs with a cryptographically-random 32-byte pepper (hex).
UPDATE organizations
    SET lookup_hash_pepper = encode(gen_random_bytes(32), 'hex')
    WHERE lookup_hash_pepper IS NULL;

ALTER TABLE organizations
    ALTER COLUMN lookup_hash_pepper SET NOT NULL;
