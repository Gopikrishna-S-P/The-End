package com.recoverpro.server.controller;

import com.recoverpro.server.config.AppProperties;
import com.recoverpro.server.config.PlatformConstants;
import com.recoverpro.server.dto.request.CreateOrganizationRequest;
import com.recoverpro.server.entity.PasswordResetToken;
import com.recoverpro.server.entity.Role;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.mapper.UserMapper;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import com.recoverpro.server.repository.PasswordResetTokenRepository;
import com.recoverpro.server.repository.RoleRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.AuditService;
import com.recoverpro.server.service.EmailService;
import com.recoverpro.server.service.FeatureFlagService;
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
    @Mock private AuditService auditService;
    @Mock private EmailService emailService;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepo;
    @Mock private UserMapper userMapper;
    @Mock private NotificationService notificationService;
    @Mock private OrgSubscriptionRepository orgSubscriptionRepo;
    @Mock private FeatureFlagService featureFlagService;

    private AppProperties appProperties;
    private PlatformOrganizationController controller;

    @BeforeEach
    void setUp() {
        appProperties = new AppProperties();
        controller = new PlatformOrganizationController(
                orgRepo, userRepo, roleRepo, passwordEncoder, auditLogService, auditService,
                emailService, passwordResetTokenRepo, appProperties, userMapper, notificationService,
                orgSubscriptionRepo, featureFlagService);

        when(orgRepo.existsByCode(any())).thenReturn(false);
        when(orgRepo.existsByName(any())).thenReturn(false);
        when(userRepo.existsByEmail(any())).thenReturn(false);
        when(roleRepo.findByNameAndOrganizationIdIsNull(PlatformConstants.ROLE_ORG_ADMIN))
                .thenReturn(Optional.of(Role.builder().name(PlatformConstants.ROLE_ORG_ADMIN).build()));
        when(orgRepo.save(any())).thenAnswer(inv -> {
            com.recoverpro.server.entity.Organization o = inv.getArgument(0);
            if (o.getId() == null) o.setId(UUID.randomUUID()); // JPA @GeneratedValue, simulated
            return o;
        });
        when(userRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(orgSubscriptionRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepo.countByOrganizationId(any())).thenReturn(1L);
        when(userRepo.findByOrganizationIdAndRoleName(any(), any())).thenReturn(java.util.List.of());
    }

    /**
     * SYSTEM-PLAN 28.1: create() previously created NO OrgSubscription row at all, which left a
     * new org with no FeatureFlag rows either -- RequiresFeatureAspect's fail-open default then
     * granted every paid feature, and EntitlementServiceImpl's "no limit row = unlimited" granted
     * unlimited users/loans. This asserts every org now gets a defined TRIAL subscription in the
     * SAME call, and that flags are provisioned for it (not left to some later event).
     */
    @Test
    void create_alwaysCreatesATrialSubscription_andProvisionsFlagsForIt() {
        CreateOrganizationRequest request = new CreateOrganizationRequest();
        request.setName("Delta Recovery");
        request.setCode("DELTA");
        request.setAdminEmail("admin@delta.test");
        request.setAdminFirstName("Dana");
        request.setAdminLastName("Admin");

        UserPrincipal caller = mock(UserPrincipal.class);
        when(caller.getId()).thenReturn(UUID.randomUUID());

        controller.create(request, caller);

        ArgumentCaptor<com.recoverpro.server.entity.OrgSubscription> subCaptor =
                ArgumentCaptor.forClass(com.recoverpro.server.entity.OrgSubscription.class);
        verify(orgSubscriptionRepo).save(subCaptor.capture());
        com.recoverpro.server.entity.OrgSubscription saved = subCaptor.getValue();
        assertThat(saved.getStatus()).isEqualTo(com.recoverpro.server.entity.OrgSubscription.Status.TRIAL);
        assertThat(saved.getPlan()).isEqualTo(com.recoverpro.server.entity.OrgSubscription.Plan.STARTER);
        assertThat(saved.getTrialEndsAt()).isNotNull();
        assertThat(saved.getOrgId()).isNotNull();

        verify(featureFlagService).provisionFlagsFor(saved);
    }

    @Test
    void create_sendsWelcomeEmailWithCorrectExpiry() {
        CreateOrganizationRequest request = new CreateOrganizationRequest();
        request.setName("Acme Collections");
        request.setCode("ACME");
        request.setAdminEmail("admin@acme.test");
        request.setAdminFirstName("Ann");
        request.setAdminLastName("Admin");

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

    /**
     * SYSTEM-PLAN 18.1: CreateOrganizationRequest no longer has an adminPassword field at all --
     * the request DTO's shape now structurally guarantees the caller cannot set the initial
     * credential. This asserts the *generated* hash input is genuinely random (not fixed,
     * predictable, or empty), matching UserServiceImpl.createUser()'s established pattern.
     */
    @Test
    void create_generatesARandomInitialPassword_neverAFixedOrPredictableOne() {
        CreateOrganizationRequest request = new CreateOrganizationRequest();
        request.setName("Beta Recovery");
        request.setCode("BETA");
        request.setAdminEmail("admin@beta.test");
        request.setAdminFirstName("Bob");
        request.setAdminLastName("Admin");

        UserPrincipal caller = mock(UserPrincipal.class);
        when(caller.getId()).thenReturn(UUID.randomUUID());

        controller.create(request, caller);

        // encode() is called twice per create(): once for the admin's throwaway password hash,
        // once more inside sendWelcomeOtp() for the OTP hash -- in that order. Index 0 is the
        // password-hash input.
        ArgumentCaptor<String> hashedInput = ArgumentCaptor.forClass(String.class);
        verify(passwordEncoder, org.mockito.Mockito.times(2)).encode(hashedInput.capture());
        String firstOrgPasswordInput = hashedInput.getAllValues().get(0);
        assertThat(firstOrgPasswordInput).isNotBlank().hasSizeGreaterThan(20);

        // A second org's create() must produce a DIFFERENT random password-hash input -- proves
        // it's generated per-call, not a hardcoded placeholder that merely looks random once.
        when(userRepo.existsByEmail(any())).thenReturn(false);
        CreateOrganizationRequest secondRequest = new CreateOrganizationRequest();
        secondRequest.setName("Gamma Recovery");
        secondRequest.setCode("GAMMA");
        secondRequest.setAdminEmail("admin@gamma.test");
        secondRequest.setAdminFirstName("Gina");
        secondRequest.setAdminLastName("Admin");
        controller.create(secondRequest, caller);

        ArgumentCaptor<String> allHashedInputs = ArgumentCaptor.forClass(String.class);
        verify(passwordEncoder, org.mockito.Mockito.times(4)).encode(allHashedInputs.capture());
        String secondOrgPasswordInput = allHashedInputs.getAllValues().get(2);
        assertThat(secondOrgPasswordInput).isNotBlank().hasSizeGreaterThan(20);
        assertThat(firstOrgPasswordInput).isNotEqualTo(secondOrgPasswordInput);
    }
}
