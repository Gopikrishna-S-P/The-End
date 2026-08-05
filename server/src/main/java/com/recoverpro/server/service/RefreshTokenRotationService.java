package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.RefreshTokenRequest;
import com.recoverpro.server.dto.response.AuthResponse;
import com.recoverpro.server.entity.User;
import jakarta.servlet.http.HttpServletRequest;

import java.util.UUID;

/** Session issuance/rotation/revocation (access + refresh tokens), split out of
 * AuthServiceImpl (SYSTEM-PLAN SP39). */
public interface RefreshTokenRotationService {

    /** Issues a fresh access+refresh token pair for an already-authenticated user
     * (successful register/login/refresh). */
    AuthResponse buildFullAuthResponse(User user, HttpServletRequest request);

    /** Validates and rotates a refresh token, detecting reuse/replay of a revoked token. */
    AuthResponse rotate(RefreshTokenRequest request, HttpServletRequest httpRequest);

    void logout(String accessToken, UUID userId, String refreshToken);

    void logoutAllDevices(UUID userId, String accessToken);

    void blacklistToken(String accessToken);
}
