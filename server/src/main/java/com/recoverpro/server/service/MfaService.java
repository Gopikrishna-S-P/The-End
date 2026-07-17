package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.EnableMfaRequest;
import com.recoverpro.server.dto.response.MfaEnableResponse;
import com.recoverpro.server.dto.response.MfaSetupResponse;
import com.recoverpro.server.entity.User;

import java.util.UUID;

/** TOTP enrollment/verification and recovery-code lifecycle, split out of AuthServiceImpl
 * (SYSTEM-PLAN SP39). */
public interface MfaService {

    MfaSetupResponse initMfaSetup(UUID userId);

    MfaEnableResponse enableMfa(UUID userId, EnableMfaRequest request);

    void disableMfa(UUID userId, String totpCode);

    /** Whether MFA enrollment is globally enforced (app.security.mfa.enforce). */
    boolean isEnforced();

    /** Whether this user's roles require MFA enrollment before they may log in. */
    boolean requiresMfaEnrollment(User user);

    /** Stores a short-lived session marker for the "MFA required" login step. */
    String storeMfaSession(UUID userId);

    /** Verifies a TOTP code at login time, rejecting replay within the same 30s window. */
    boolean verifyTotpForLogin(UUID userId, String mfaSecret, String totpCode);

    /** Marks the matching unused recovery code as used and returns true, or false if none
     * for this user matches. Codes are single-use. */
    boolean redeemRecoveryCode(UUID userId, String rawCode);
}
