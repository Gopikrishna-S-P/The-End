package com.recoverpro.server.entity;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.repository.MfaRecoveryCodeRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * SEC-PLAN S13: confirms the TOTP secret and MFA backup codes are never
 * stored in plaintext, closing out what was previously only a "confirm the
 * actual MFA entity" audit note.
 */
class MfaSecretAndRecoveryCodeAtRestTest extends AbstractIntegrationTest {

    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private MfaRecoveryCodeRepository mfaRecoveryCodeRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Test
    void mfaSecret_isStoredEncryptedNotPlaintext() {
        Organization org = createOrg("MfaAtRest");
        User user = createUser(org, "ROLE_FO");
        String plainSecret = "JBSWY3DPEHPK3PXP";

        user.setMfaSecret(plainSecret);
        user.setMfaEnabled(true);
        userRepository.save(user);
        userRepository.flush();

        String storedValue = jdbcTemplate.queryForObject(
                "SELECT mfa_secret FROM users WHERE id = ?", String.class, user.getId());

        assertThat(storedValue).isNotEqualTo(plainSecret);
        assertThat(storedValue).startsWith("enc:");
    }

    @Test
    void mfaRecoveryCode_isStoredAsPasswordHashNotPlaintext() {
        Organization org = createOrg("MfaAtRest");
        User user = createUser(org, "ROLE_FO");
        UUID userId = user.getId();
        String plainCode = "ABCD1234EFGH";

        MfaRecoveryCode recoveryCode = MfaRecoveryCode.builder()
                .userId(userId)
                .codeHash(passwordEncoder.encode(plainCode))
                .build();
        mfaRecoveryCodeRepository.save(recoveryCode);

        String storedValue = jdbcTemplate.queryForObject(
                "SELECT code_hash FROM mfa_recovery_codes WHERE id = ?", String.class, recoveryCode.getId());

        assertThat(storedValue).isNotEqualTo(plainCode);
        assertThat(storedValue).startsWith("$argon2id$");
        assertThat(passwordEncoder.matches(plainCode, storedValue)).isTrue();

        mfaRecoveryCodeRepository.delete(recoveryCode);
    }
}
