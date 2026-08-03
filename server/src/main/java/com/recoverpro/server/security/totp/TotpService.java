package com.recoverpro.server.security.totp;

import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import org.springframework.stereotype.Component;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
public class TotpService {

    private static final String ISSUER = "RecoverPro";
    private final GoogleAuthenticator gAuth = new GoogleAuthenticator();

    public GoogleAuthenticatorKey generateSecret() {
        return gAuth.createCredentials();
    }

    // Builds the standard otpauth:// provisioning URI directly instead of using the
    // googleauth library's GoogleAuthenticatorQRGenerator.getOtpAuthURL(), which
    // (as of 1.5.0) hardcodes a wrapper around a third-party QR-rendering service
    // (api.qrserver.com) -- sending every user's TOTP secret to an external host for
    // no benefit, since the frontend already renders the QR code locally with
    // qrcode.react and was encoding that wrapper URL's text as the QR content
    // instead of the actual otpauth:// URI a real authenticator app expects.
    public String getQrCodeUri(String email, String secret) {
        String label = URLEncoder.encode(ISSUER + ":" + email, StandardCharsets.UTF_8);
        String issuer = URLEncoder.encode(ISSUER, StandardCharsets.UTF_8);
        return "otpauth://totp/" + label
                + "?secret=" + secret
                + "&issuer=" + issuer
                + "&algorithm=SHA1&digits=6&period=30";
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
