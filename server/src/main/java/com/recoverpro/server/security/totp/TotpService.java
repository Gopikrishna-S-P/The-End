package com.recoverpro.server.security.totp;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import com.warrenstrange.googleauth.GoogleAuthenticatorQRGenerator;
import org.springframework.stereotype.Component;

@Component
public class TotpService {

    private static final String ISSUER = "RecoverPro";
    private final GoogleAuthenticator gAuth = new GoogleAuthenticator();

    public GoogleAuthenticatorKey generateSecret() {
        return gAuth.createCredentials();
    }

    public String getQrCodeUri(String email, String secret) {
        return GoogleAuthenticatorQRGenerator.getOtpAuthURL(ISSUER, email,
                new GoogleAuthenticatorKey.Builder(secret).build());
    }

    public boolean verifyCode(String secret, int code) {
        return gAuth.authorize(secret, code);
    }

    public boolean verifyCode(String secret, String code) {
        try {
            return verifyCode(secret, Integer.parseInt(code));
        } catch (NumberFormatException e) {
            return false;
        }
    }
}
