-- Borrower.ckycId is now @Convert-encrypted (SEC-PLAN S12), matching phone/email
-- on the same entity. Encryption is non-deterministic (random IV per value), so
-- exact-match lookup needs the same xxxLookupHash pattern already used for
-- phone_lookup_hash/email_lookup_hash. Widen ckyc_id for ciphertext (matches
-- borrowers.first_name/last_name, VARCHAR(512)), add the hash column, and
-- replace the now-useless plaintext index with one on the hash column.
ALTER TABLE borrowers ALTER COLUMN ckyc_id TYPE VARCHAR(512);
ALTER TABLE borrowers ADD COLUMN ckyc_id_lookup_hash VARCHAR(64);

DROP INDEX IF EXISTS idx_borrower_ckyc;
CREATE INDEX IF NOT EXISTS idx_borrower_ckyc ON borrowers (ckyc_id_lookup_hash);
