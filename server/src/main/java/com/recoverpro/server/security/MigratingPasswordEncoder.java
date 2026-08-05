package com.recoverpro.server.security;

import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

public class MigratingPasswordEncoder implements PasswordEncoder {

    private static final Argon2PasswordEncoder ARGON2 =
            Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();

    private final BCryptPasswordEncoder bcrypt;

    public MigratingPasswordEncoder(int bcryptStrength) {
        this.bcrypt = new BCryptPasswordEncoder(bcryptStrength);
    }

    @Override
    public String encode(CharSequence rawPassword) {
        return ARGON2.encode(rawPassword);
    }

    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        if (encodedPassword == null) return false;
        return isBcrypt(encodedPassword)
                ? bcrypt.matches(rawPassword, encodedPassword)
                : ARGON2.matches(rawPassword, encodedPassword);
    }

    @Override
    public boolean upgradeEncoding(String encodedPassword) {
        return encodedPassword != null && isBcrypt(encodedPassword);
    }

    private boolean isBcrypt(String hash) {
        return hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$");
    }
}
