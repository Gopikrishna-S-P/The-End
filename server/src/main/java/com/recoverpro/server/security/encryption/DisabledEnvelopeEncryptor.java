package com.recoverpro.server.security.encryption;

public class DisabledEnvelopeEncryptor implements EnvelopeEncryptor {

    @Override
    public String encrypt(String plaintext) { return plaintext; }

    @Override
    public String decrypt(String storedValue) {
        if (storedValue == null) return null;
        if (storedValue.startsWith(CIPHERTEXT_PREFIX)) {
            throw new EncryptionException(
                    "Encountered ciphertext but encryption is DISABLED. "
                            + "Re-enable encryption with the original key.");
        }
        return storedValue;
    }
}
