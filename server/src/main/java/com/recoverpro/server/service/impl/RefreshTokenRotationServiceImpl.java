package com.recoverpro.server.service.impl;

import com.recoverpro.server.config.AppProperties;
import com.recoverpro.server.dto.request.RefreshTokenRequest;
import com.recoverpro.server.dto.response.AuthResponse;
import com.recoverpro.server.entity.RefreshToken;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.exception.AccountDisabledException;
import com.recoverpro.server.exception.AccountLockedException;
import com.recoverpro.server.exception.InvalidTokenException;
import com.recoverpro.server.mapper.UserMapper;
import com.recoverpro.server.observability.BusinessMetrics;
import com.recoverpro.server.repository.RefreshTokenRepository;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.security.jwt.JwtTokenProvider;
import com.recoverpro.server.service.RefreshTokenRotationService;
import com.recoverpro.server.service.UserActionAuditService;
import com.recoverpro.server.service.security.SessionAnomalyDetector;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenRotationServiceImpl implements RefreshTokenRotationService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final SessionAnomalyDetector sessionAnomalyDetector;
    private final AppProperties appProperties;
    private final UserMapper userMapper;
    private final StringRedisTemplate redisTemplate;
    private final UserActionAuditService auditLogService;
    private final BusinessMetrics metrics;

    private static final String JWT_BLACKLIST_PREFIX = "jwt:blacklist:";
    private static final String USER_PROFILE_CACHE_PREFIX = "user:profile:";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Override
    @Transactional
    public AuthResponse buildFullAuthResponse(User user, HttpServletRequest request) {
        UserPrincipal principal = new UserPrincipal(user);
        String accessToken = jwtTokenProvider.generateAccessToken(principal, user.getId());
        String rawRefreshToken = generateSecureToken();
        String prefix = rawRefreshToken.substring(0, Math.min(16, rawRefreshToken.length()));

        String userAgent = request != null ? request.getHeader("User-Agent") : null;
        String clientIp  = request != null ? extractClientIp(request) : null;
        String deviceId  = request != null ? request.getHeader("X-Device-Id") : null;

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(passwordEncoder.encode(rawRefreshToken))
                .tokenPrefix(prefix)
                .deviceInfo(userAgent)
                .ipAddress(clientIp)
                .expiresAt(Instant.now().plus(
                        appProperties.getJwt().getRefreshTokenExpiryMs() / 1000, ChronoUnit.SECONDS))
                .build();

        sessionAnomalyDetector.inspect(refreshToken, user.getId(), clientIp, userAgent, deviceId);
        refreshTokenRepository.save(refreshToken);

        long expiresIn = appProperties.getJwt().getAccessTokenExpiryMs() / 1000;
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(rawRefreshToken)
                .expiresIn(expiresIn)
                .user(userMapper.toResponse(user))
                .build();
    }

    @Override
    @Transactional
    public AuthResponse rotate(RefreshTokenRequest request, HttpServletRequest httpRequest) {
        String rawToken = request.getRefreshToken();
        String tokenPrefix = rawToken.length() >= 16 ? rawToken.substring(0, 16) : rawToken;

        RefreshToken stored = refreshTokenRepository
                .findByTokenPrefixAndRevokedFalse(tokenPrefix)
                .stream()
                .filter(rt -> passwordEncoder.matches(rawToken, rt.getTokenHash()) && rt.isValid())
                .findFirst()
                .orElse(null);

        if (stored == null) {
            refreshTokenRepository.findByTokenPrefix(tokenPrefix)
                    .stream()
                    .filter(rt -> rt.isRevoked() && passwordEncoder.matches(rawToken, rt.getTokenHash()))
                    .findFirst()
                    .ifPresent(rt -> {
                        UUID userId = rt.getUser().getId();
                        refreshTokenRepository.revokeAllByUserId(userId, Instant.now());
                        evictUserProfileCache(userId);
                        auditLogService.logUserAction(userId, "TOKEN_THEFT_DETECTED",
                                "Revoked refresh token replayed -- all sessions invalidated");
                        metrics.recordTokenTheftDetected();
                        log.error("SECURITY: Refresh token reuse detected for user {}. All sessions revoked.", userId);
                    });
            throw new InvalidTokenException("Refresh token is invalid or expired");
        }

        User user = stored.getUser();
        if (!user.isEnabled()) {
            refreshTokenRepository.revokeAllByUserId(user.getId(), Instant.now());
            throw new AccountDisabledException("Account is disabled");
        }
        if (user.isCurrentlyLocked()) {
            long retryAfter = computeLockoutRetryAfter(user);
            throw new AccountLockedException("Account locked. Try again in " + retryAfter + "s", retryAfter);
        }

        int revoked = refreshTokenRepository.revokeIfActive(stored.getTokenHash(), Instant.now());
        if (revoked == 0) {
            refreshTokenRepository.revokeAllByUserId(user.getId(), Instant.now());
            evictUserProfileCache(user.getId());
            auditLogService.logUserAction(user.getId(), "TOKEN_THEFT_DETECTED",
                    "Concurrent refresh on a single rotation -- all sessions invalidated");
            metrics.recordTokenTheftDetected();
            log.error("SECURITY: Refresh-token rotation race for user {}. All sessions revoked.", user.getId());
            throw new InvalidTokenException("Refresh token is invalid or expired");
        }
        metrics.recordRefreshSuccess();
        auditLogService.logUserAction(user.getId(), "TOKEN_REFRESH", "Access token refreshed");
        return buildFullAuthResponse(user, httpRequest);
    }

    @Override
    @Transactional
    public void logout(String accessToken, UUID userId, String refreshToken) {
        blacklistToken(accessToken);
        if (refreshToken != null && refreshToken.length() >= 8) {
            revokeSingleRefreshToken(refreshToken, userId);
        } else {
            refreshTokenRepository.revokeAllByUserId(userId, Instant.now());
        }
        evictUserProfileCache(userId);
        auditLogService.logUserAction(userId, "LOGOUT", "User logged out (single device)");
    }

    @Override
    @Transactional
    public void logoutAllDevices(UUID userId, String accessToken) {
        blacklistToken(accessToken);
        refreshTokenRepository.revokeAllByUserId(userId, Instant.now());
        evictUserProfileCache(userId);
        auditLogService.logUserAction(userId, "LOGOUT_ALL", "User logged out from all devices");
    }

    @Override
    public void blacklistToken(String accessToken) {
        if (accessToken == null) return;
        try {
            if (jwtTokenProvider.validateToken(accessToken)) {
                long ttlMs = jwtTokenProvider.extractExpiration(accessToken).getTime() - System.currentTimeMillis();
                if (ttlMs > 0) {
                    redisTemplate.opsForValue().set(
                            JWT_BLACKLIST_PREFIX + accessToken, "1", ttlMs, TimeUnit.MILLISECONDS);
                }
            }
        } catch (Exception ignored) {}
    }

    // userId is the caller's own id (from their JWT) -- cross-checked here so logout can only
    // ever revoke the caller's own refresh tokens, never someone else's, even if a raw token
    // value were somehow supplied that belongs to another account.
    private void revokeSingleRefreshToken(String rawToken, UUID userId) {
        // Must match the 16-char prefix length used at token creation (line ~58) and in
        // rotate() (line ~90) -- this was previously 8, a silent mismatch that made the lookup
        // find zero rows and no-op, leaving the "revoked" refresh token fully usable forever.
        String prefix = rawToken.substring(0, Math.min(16, rawToken.length()));
        refreshTokenRepository.findByTokenPrefixAndRevokedFalse(prefix)
                .stream()
                .filter(rt -> rt.getUser().getId().equals(userId))
                .filter(rt -> passwordEncoder.matches(rawToken, rt.getTokenHash()))
                .findFirst()
                .ifPresent(rt -> refreshTokenRepository.revokeByTokenHash(rt.getTokenHash(), Instant.now()));
    }

    private long computeLockoutRetryAfter(User user) {
        if (user.getLockoutUntil() == null) return 0L;
        return Math.max(0L, java.time.Duration.between(Instant.now(), user.getLockoutUntil()).toSeconds());
    }

    private void evictUserProfileCache(UUID userId) {
        redisTemplate.delete(USER_PROFILE_CACHE_PREFIX + userId);
    }

    private String generateSecureToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String extractClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        String realIp = request.getHeader("X-Real-IP");
        return realIp != null ? realIp.trim() : request.getRemoteAddr();
    }
}
