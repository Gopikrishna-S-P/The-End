package com.recoverpro.server.security.encryption;

public interface EnvelopeEncryptor {

    String CIPHERTEXT_PREFIX = "enc:v1:";

    String encrypt(String plaintext);

    String decrypt(String storedValue);
}
