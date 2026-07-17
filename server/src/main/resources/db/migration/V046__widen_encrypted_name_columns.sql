-- users.first_name/last_name and user_creation_requests.requested_first_name/
-- requested_last_name are now @Convert-encrypted (SEC-PLAN S12). Ciphertext
-- (IV + AES-GCM tag, base64-encoded, "enc:v1:" prefixed) needs more room than
-- the plaintext name ever did; widen to match the existing convention for
-- encrypted name columns (borrowers.first_name/last_name, VARCHAR(512)).
ALTER TABLE users ALTER COLUMN first_name TYPE VARCHAR(512);
ALTER TABLE users ALTER COLUMN last_name TYPE VARCHAR(512);
ALTER TABLE user_creation_requests ALTER COLUMN requested_first_name TYPE VARCHAR(512);
ALTER TABLE user_creation_requests ALTER COLUMN requested_last_name TYPE VARCHAR(512);
