package com.recoverpro.server.controller;

import com.recoverpro.server.config.AppProperties;
import com.recoverpro.server.config.PlatformConstants;
import com.recoverpro.server.dto.request.CreateOrganizationRequest;
import com.recoverpro.server.entity.PasswordResetToken;
import com.recoverpro.server.entity.Role;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.mapper.UserMapper;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.repository.PasswordResetTokenRepository;
import com.recoverpro.server.repository.RoleRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.EmailService;
import com.recoverpro.server.service.NotificationService;
import com.recoverpro.server.service.UserActionAuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regression coverage: create() built the org-admin user and saved it, but never called
 * sendWelcomeOtp -- a fully-wired private method (email service, token repo, all injected) that
 * simply had no call site. Every other user-creation flow in the codebase (UserServiceImpl,
 * PlatformSetupServiceImpl, UserCreationRequestServiceImpl) sends this email; this one silently
 * didn't. Also covers a second bug found in the same dead method: it read
 * Security.otpExpiryMinutes (10 min, meant for password-reset OTPs) instead of
 * Security.welcomeOtpExpiryMinutes (1440 min) -- the other three call sites all use the latter.
 */
@ExtendWith(MockitoExtension.class)
class PlatformOrganizationControllerTest {

    @Mock private OrganizationRepository orgRepo;
    @Mock private UserRepository userRepo;
    @Mock private RoleRepository roleRepo;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private UserActionAuditService auditLogService;
    @Mock private EmailService emailService;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepo;
    @Mock private UserMapper userMapper;
    @Mock private NotificationService notificationService;

    private AppProperties appProperties;
    private PlatformOrganizationController controller;

    @BeforeEach
    void setUp() {
        appProperties = new AppProperties();
        controller = new PlatformOrganizationController(
                orgRepo, userRepo, roleRepo, passwordEncoder, auditLogService,
                emailService, passwordResetTokenRepo, appProperties, userMapper, notificationService);

        when(orgRepo.existsByCode(any())).thenReturn(false);
        when(orgRepo.existsByName(any())).thenReturn(false);
        when(userRepo.existsByEmail(any())).thenReturn(false);
        when(roleRepo.findByNameAndOrganizationIdIsNull(PlatformConstants.ROLE_ORG_ADMIN))
                .thenReturn(Optional.of(Role.builder().name(PlatformConstants.ROLE_ORG_ADMIN).build()));
        when(orgRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepo.countByOrganizationId(any())).thenReturn(1L);
        when(userRepo.findByOrganizationIdAndRoleName(any(), any())).thenReturn(java.util.List.of());
    }

    @Test
    void create_sendsWelcomeEmailWithCorrectExpiry() {
        CreateOrganizationRequest request = new CreateOrganizationRequest();
        request.setName("Acme Collections");
        request.setCode("ACME");
        request.setAdminEmail("admin@acme.test");
        request.setAdminFirstName("Ann");
        request.setAdminLastName("Admin");
        request.setAdminPassword("Password123!");

        UserPrincipal caller = mock(UserPrincipal.class);
        when(caller.getId()).thenReturn(UUID.randomUUID());

        controller.create(request, caller);

        verify(emailService).sendWelcomeEmail(
                org.mockito.ArgumentMatchers.eq("admin@acme.test"),
                org.mockito.ArgumentMatchers.eq("Ann"),
                anyString(),
                org.mockito.ArgumentMatchers.eq(1440));

        ArgumentCaptor<PasswordResetToken> tokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(passwordResetTokenRepo).save(tokenCaptor.capture());
        assertThat(tokenCaptor.getValue().getUser().getEmail()).isEqualTo("admin@acme.test");
    }
}
