package com.recoverpro.server.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.recoverpro.server.common.exception.RateLimitExceededException;
import com.recoverpro.server.config.AppProperties;
import com.recoverpro.server.dto.request.RegisterRequest;
import com.recoverpro.server.mapper.UserMapper;
import com.recoverpro.server.repository.RefreshTokenRepository;
import com.recoverpro.server.repository.RoleRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.service.UserActionAuditService;
import com.recoverpro.server.service.EmailService;
import com.recoverpro.server.service.MfaService;
import com.recoverpro.server.service.PasswordResetService;
import com.recoverpro.server.service.RefreshTokenRotationService;
import com.recoverpro.server.util.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

/**
 * SYSTEM-PLAN SP34: registration was rate-limited by IP only, so an attacker retrying the same
 * email from rotating IPs (distributed spam-register) never tripped any limiter.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceImplRegisterRateLimitTest {

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private RefreshTokenRepository refreshTokenRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private RateLimiter rateLimiter;
    @Mock private StringRedisTemplate redisTemplate;
    @Mock private ValueOperations<String, String> valueOperations;
    @Mock private UserMapper userMapper;
    @Mock private UserActionAuditService auditLogService;
    @Mock private EmailService emailService;
    @Mock private MfaService mfaService;
    @Mock private PasswordResetService passwordResetService;
    @Mock private RefreshTokenRotationService refreshTokenRotationService;
    @Mock private HttpServletRequest httpRequest;

    private AuthServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new AuthServiceImpl(userRepository, roleRepository, refreshTokenRepository,
                passwordEncoder, rateLimiter, redisTemplate, new AppProperties(), userMapper,
                auditLogService, new ObjectMapper(), emailService, mfaService, passwordResetService,
                refreshTokenRotationService);

        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        // IP counter always well under the limit -- simulates an attacker rotating source IPs.
        lenient().when(valueOperations.increment(any())).thenReturn(1L);
    }

    @Test
    void register_sameEmailRetriedAcrossDifferentIps_stillTripsPerEmailLimiter() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("attacker@example.com");
        request.setPassword("Password123!");
        request.setFirstName("A");
        request.setLastName("B");

        when(httpRequest.getRemoteAddr()).thenReturn("10.0.0.1");
        when(rateLimiter.tryAcquire(eq("rate:register:email:attacker@example.com"), anyInt(), any(Duration.class)))
                .thenReturn(false);

        assertThatThrownBy(() -> service.register(request, httpRequest))
                .isInstanceOf(RateLimitExceededException.class);
    }
}
