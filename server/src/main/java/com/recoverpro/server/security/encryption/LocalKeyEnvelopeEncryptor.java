package com.recoverpro.server.security.encryption;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

public class LocalKeyEnvelopeEncryptor implements EnvelopeEncryptor {

    private static final String TRANSFORM = "AES/GCM/NoPadding";
    private static final int IV_LEN  = 12;
    private static final int TAG_BITS = 128;

    private final SecretKey secretKey;
    private final SecureRandom random = new SecureRandom();

    public LocalKeyEnvelopeEncryptor(byte[] keyBytes) {
        if (keyBytes == null || keyBytes.length != 32) {
            throw new EncryptionException(
                    "AES-256 key must be 32 bytes; got "
                            + (keyBytes == null ? "null" : keyBytes.length + " bytes"));
        }
        this.secretKey = new SecretKeySpec(keyBytes, "AES");
    }

    @Override
    public String encrypt(String plaintext) {
        if (plaintext == null) return null;
        try {
            byte[] iv = new byte[IV_LEN];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(TRANSFORM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(TAG_BITS, iv));
            byte[] ct = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            ByteBuffer buf = ByteBuffer.allocate(iv.length + ct.length);
            buf.put(iv);
            buf.put(ct);
            return CIPHERTEXT_PREFIX + Base64.getEncoder().encodeToString(buf.array());
        } catch (Exception e) {
            throw new EncryptionException("Encryption failed", e);
        }
    }

    @Override
    public String decrypt(String storedValue) {
        if (storedValue == null) return null;
        if (!storedValue.startsWith(CIPHERTEXT_PREFIX)) return storedValue;
        try {
            byte[] all = Base64.getDecoder().decode(storedValue.substring(CIPHERTEXT_PREFIX.length()));
            if (all.length <= IV_LEN) throw new EncryptionException("Ciphertext payload too short");
            byte[] iv = new byte[IV_LEN];
            byte[] ct = new byte[all.length - IV_LEN];
            System.arraycopy(all, 0, iv, 0, IV_LEN);
            System.arraycopy(all, IV_LEN, ct, 0, ct.length);
            Cipher cipher = Cipher.getInstance(TRANSFORM);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(ct), StandardCharsets.UTF_8);
        } catch (EncryptionException e) {
            throw e;
        } catch (Exception e) {
            throw new EncryptionException("Decryption failed (tampering or wrong key?)", e);
        }
    }
}
