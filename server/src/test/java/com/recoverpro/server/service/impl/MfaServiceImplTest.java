package com.recoverpro.server.service.impl;

import com.recoverpro.server.entity.MfaRecoveryCode;
import com.recoverpro.server.entity.Role;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.repository.MfaRecoveryCodeRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.security.totp.TotpService;
import com.recoverpro.server.service.UserActionAuditService;
import com.recoverpro.server.util.RateLimiter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * SYSTEM-PLAN SP35/SP39: recovery-code redemption and TOTP-at-login verification, extracted from
 * AuthServiceImpl into MfaServiceImpl.
 */
@ExtendWith(MockitoExtension.class)
class MfaServiceImplTest {

    @Mock private UserRepository userRepository;
    @Mock private MfaRecoveryCodeRepository mfaRecoveryCodeRepository;
    @Mock private TotpService totpService;
    @Mock private StringRedisTemplate redisTemplate;
    @Mock private ValueOperations<String, String> valueOperations;
    @Mock private RateLimiter rateLimiter;
    @Mock private UserActionAuditService auditLogService;
    @Mock private PasswordEncoder passwordEncoder;

    private MfaServiceImpl service;
    private UUID userId;

    @BeforeEach
    void setUp() {
        service = new MfaServiceImpl(userRepository, mfaRecoveryCodeRepository, totpService,
                redisTemplate, rateLimiter, auditLogService, passwordEncoder);
        userId = UUID.randomUUID();
    }

    @Test
    void redeemRecoveryCode_matchingUnusedCode_marksUsedAndReturnsTrue() {
        MfaRecoveryCode storedCode = MfaRecoveryCode.builder()
                .id(UUID.randomUUID()).userId(userId).codeHash("hash-of-code").used(false).build();
        when(mfaRecoveryCodeRepository.findByUserIdAndUsedFalse(userId)).thenReturn(List.of(storedCode));
        when(passwordEncoder.matches("ABCD1234WXYZ", "hash-of-code")).thenReturn(true);

        boolean result = service.redeemRecoveryCode(userId, "ABCD-1234-WXYZ");

        assertThat(result).isTrue();
        ArgumentCaptor<MfaRecoveryCode> captor = ArgumentCaptor.forClass(MfaRecoveryCode.class);
        verify(mfaRecoveryCodeRepository).save(captor.capture());
        assertThat(captor.getValue().isUsed()).isTrue();
        assertThat(captor.getValue().getUsedAt()).isNotNull();
    }

    @Test
    void redeemRecoveryCode_noMatch_returnsFalseAndDoesNotSave() {
        MfaRecoveryCode storedCode = MfaRecoveryCode.builder()
                .id(UUID.randomUUID()).userId(userId).codeHash("hash-of-code").used(false).build();
        when(mfaRecoveryCodeRepository.findByUserIdAndUsedFalse(userId)).thenReturn(List.of(storedCode));
        when(passwordEncoder.matches("WRONGCODE0000", "hash-of-code")).thenReturn(false);

        boolean result = service.redeemRecoveryCode(userId, "WRONG-CODE-0000");

        assertThat(result).isFalse();
        verify(mfaRecoveryCodeRepository, never()).save(any());
    }

    @Test
    void verifyTotpForLogin_validCode_returnsTrueAndMarksCodeUsed() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(redisTemplate.hasKey("mfa:used:" + userId + ":123456")).thenReturn(false);
        when(totpService.verifyCode("secret", "123456")).thenReturn(true);

        boolean result = service.verifyTotpForLogin(userId, "secret", "123456");

        assertThat(result).isTrue();
        verify(valueOperations).set("mfa:used:" + userId + ":123456", "1", 60, java.util.concurrent.TimeUnit.SECONDS);
    }

    @Test
    void verifyTotpForLogin_replayedCode_returnsFalse() {
        when(redisTemplate.hasKey("mfa:used:" + userId + ":123456")).thenReturn(true);

        boolean result = service.verifyTotpForLogin(userId, "secret", "123456");

        assertThat(result).isFalse();
    }

    @Test
    void requiresMfaEnrollment_userHasRequiredRole_returnsTrue() {
        setField("mfaRequiredRolesCsv", "ROLE_PLATFORM_ADMIN,ROLE_ORG_ADMIN");
        Role adminRole = Role.builder().name("ROLE_ORG_ADMIN").build();
        User user = User.builder().id(userId).roles(Set.of(adminRole)).build();

        assertThat(service.requiresMfaEnrollment(user)).isTrue();
    }

    @Test
    void requiresMfaEnrollment_userWithoutRequiredRole_returnsFalse() {
        setField("mfaRequiredRolesCsv", "ROLE_PLATFORM_ADMIN,ROLE_ORG_ADMIN");
        Role fo = Role.builder().name("ROLE_FO").build();
        User user = User.builder().id(userId).roles(Set.of(fo)).build();

        assertThat(service.requiresMfaEnrollment(user)).isFalse();
    }

    private void setField(String name, Object value) {
        org.springframework.test.util.ReflectionTestUtils.setField(service, name, value);
    }
}
