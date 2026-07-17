package com.recoverpro.server.service.impl;

import com.recoverpro.server.config.AppProperties;
import com.recoverpro.server.dto.request.RefreshTokenRequest;
import com.recoverpro.server.dto.response.AuthResponse;
import com.recoverpro.server.dto.response.UserResponse;
import com.recoverpro.server.entity.RefreshToken;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.exception.InvalidTokenException;
import com.recoverpro.server.mapper.UserMapper;
import com.recoverpro.server.observability.BusinessMetrics;
import com.recoverpro.server.repository.RefreshTokenRepository;
import com.recoverpro.server.security.jwt.JwtTokenProvider;
import com.recoverpro.server.service.UserActionAuditService;
import com.recoverpro.server.service.security.SessionAnomalyDetector;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * SYSTEM-PLAN SP39: refresh-token rotation/session revocation extracted from AuthServiceImpl
 * into its own RefreshTokenRotationService.
 */
@ExtendWith(MockitoExtension.class)
class RefreshTokenRotationServiceImplTest {

    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private SessionAnomalyDetector sessionAnomalyDetector;
    @Mock private UserMapper userMapper;
    @Mock private StringRedisTemplate redisTemplate;
    @Mock private UserActionAuditService auditLogService;
    @Mock private BusinessMetrics metrics;
    @Mock private HttpServletRequest httpRequest;

    private RefreshTokenRotationServiceImpl service;
    private User user;

    @BeforeEach
    void setUp() {
        service = new RefreshTokenRotationServiceImpl(refreshTokenRepository, jwtTokenProvider,
                passwordEncoder, sessionAnomalyDetector, new AppProperties(), userMapper, redisTemplate,
                auditLogService, metrics);
        user = User.builder().id(UUID.randomUUID()).enabled(true).build();
        lenient().when(userMapper.toResponse(any())).thenReturn(UserResponse.builder().build());
        lenient().when(jwtTokenProvider.generateAccessToken(any(), any())).thenReturn("access-token");
    }

    @Test
    void rotate_validActiveToken_revokesOldAndIssuesNewPair() {
        RefreshToken stored = RefreshToken.builder()
                .id(UUID.randomUUID()).user(user).tokenHash("stored-hash").tokenPrefix("rawtoken12345678")
                .revoked(false).expiresAt(Instant.now().plusSeconds(600)).build();
        when(refreshTokenRepository.findByTokenPrefixAndRevokedFalse("rawtoken12345678"))
                .thenReturn(List.of(stored));
        when(passwordEncoder.matches("rawtoken12345678fulltoken", "stored-hash")).thenReturn(true);
        when(refreshTokenRepository.revokeIfActive(eq("stored-hash"), any(Instant.class))).thenReturn(1);

        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("rawtoken12345678fulltoken");

        AuthResponse response = service.rotate(request, httpRequest);

        assertThat(response.getAccessToken()).isEqualTo("access-token");
        verify(metrics).recordRefreshSuccess();
    }

    @Test
    void rotate_unknownToken_throwsInvalidToken() {
        when(refreshTokenRepository.findByTokenPrefixAndRevokedFalse(any())).thenReturn(List.of());
        when(refreshTokenRepository.findByTokenPrefix(any())).thenReturn(List.of());

        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("unknown-raw-token-value");

        assertThatThrownBy(() -> service.rotate(request, httpRequest))
                .isInstanceOf(InvalidTokenException.class);
    }

    @Test
    void rotate_revokedTokenReplayed_revokesAllSessionsAndRecordsTheft() {
        RefreshToken revokedToken = RefreshToken.builder()
                .id(UUID.randomUUID()).user(user).tokenHash("stored-hash").tokenPrefix("rawtoken12345678")
                .revoked(true).expiresAt(Instant.now().plusSeconds(600)).build();
        when(refreshTokenRepository.findByTokenPrefixAndRevokedFalse("rawtoken12345678")).thenReturn(List.of());
        when(refreshTokenRepository.findByTokenPrefix("rawtoken12345678")).thenReturn(List.of(revokedToken));
        when(passwordEncoder.matches("rawtoken12345678fulltoken", "stored-hash")).thenReturn(true);

        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("rawtoken12345678fulltoken");

        assertThatThrownBy(() -> service.rotate(request, httpRequest))
                .isInstanceOf(InvalidTokenException.class);

        verify(refreshTokenRepository).revokeAllByUserId(eq(user.getId()), any(Instant.class));
        verify(metrics).recordTokenTheftDetected();
        verify(auditLogService).logUserAction(eq(user.getId()), eq("TOKEN_THEFT_DETECTED"), any());
    }

    @Test
    void logout_singleDevice_revokesOnlyThatTokenAndBlacklistsAccessToken() {
        service.logout(null, user.getId(), null);
        verify(refreshTokenRepository).revokeAllByUserId(eq(user.getId()), any(Instant.class));
        verify(auditLogService).logUserAction(eq(user.getId()), eq("LOGOUT"), any());
    }

    @Test
    void logoutAllDevices_revokesAllSessions() {
        service.logoutAllDevices(user.getId(), null);
        verify(refreshTokenRepository).revokeAllByUserId(eq(user.getId()), any(Instant.class));
        verify(auditLogService).logUserAction(eq(user.getId()), eq("LOGOUT_ALL"), any());
    }
}
