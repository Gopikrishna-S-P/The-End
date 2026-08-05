package com.recoverpro.server.security;

import com.recoverpro.server.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MigratingPasswordEncoderWiringTest extends AbstractIntegrationTest {

    @Test
    void activePasswordEncoderBean_isMigratingPasswordEncoder() {
        assertThat(passwordEncoder).isInstanceOf(MigratingPasswordEncoder.class);
    }

    @Test
    void encodedPassword_isArgon2id() {
        String hash = passwordEncoder.encode("Test1234!");
        assertThat(hash).startsWith("$argon2id$");
    }

    @Test
    void existingBcryptHash_stillMatches() {
        // Simulates a pre-migration user row whose hash was produced by plain BCrypt.
        String bcryptHash = "$2a$10$EYreiTIdF6m/bSXB2/3ep.pU66ForB8JDDwVgnbx05UlgX.oadZIO"; // "Test1234!"
        assertThat(passwordEncoder.matches("Test1234!", bcryptHash)).isTrue();
        assertThat(passwordEncoder.upgradeEncoding(bcryptHash)).isTrue();
    }
}
