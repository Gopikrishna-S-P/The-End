package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.CreateUserRequestDto;
import com.recoverpro.server.dto.request.ReviewRequestDto;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.Role;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.entity.UserCreationRequest;
import com.recoverpro.server.entity.UserCreationRequest.RequestedRole;
import com.recoverpro.server.entity.UserCreationRequest.RequestStatus;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.repository.PasswordResetTokenRepository;
import com.recoverpro.server.repository.RoleRepository;
import com.recoverpro.server.repository.UserCreationRequestRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.EmailService;
import com.recoverpro.server.service.NotificationService;
import com.recoverpro.server.config.AppProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regression coverage for two bugs found in this pass:
 * 1. submit() previously let a platform-admin caller fall through to resolveOrg(), which throws
 *    "Your account has no organization assigned. Contact Platform Admin." -- a nonsensical message
 *    to show the platform admin themselves. Now fails fast with a clear explanation instead.
 * 2. review()'s approval path built the role to assign as "ROLE_" + requestedRole.name() --
 *    correct for ORG_ADMIN ("ROLE_ORG_ADMIN", a real role), but requestedRole's other value is the
 *    coarse category ORG_USER, and "ROLE_ORG_USER" was never a real role -- confirmed live by
 *    actually submitting and approving a request through the UI, which threw exactly this error.
 *    Fixed by adding requestedStaffRole (FO/CALLER/TL/MANAGER) and using it for ORG_USER approvals.
 */
@ExtendWith(MockitoExtension.class)
class UserCreationRequestServiceImplTest {

    @Mock private UserCreationRequestRepository requestRepo;
    @Mock private UserRepository userRepo;
    @Mock private RoleRepository roleRepo;
    @Mock private OrganizationRepository orgRepo;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepo;
    @Mock private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    @Mock private EmailService emailService;
    @Mock private AppProperties appProperties;
    @Mock private NotificationService notificationService;

    private UserCreationRequestServiceImpl newService() {
        return new UserCreationRequestServiceImpl(requestRepo, userRepo, roleRepo, orgRepo,
                passwordResetTokenRepo, passwordEncoder, emailService, appProperties, notificationService);
    }

    @Test
    void submit_platformAdmin_throwsClearBusinessException() {
        UserCreationRequestServiceImpl service = newService();
        UUID adminId = UUID.randomUUID();
        User platformAdmin = User.builder().id(adminId).build();
        Role platformAdminRole = Role.builder().name("ROLE_PLATFORM_ADMIN").build();
        platformAdmin.addRole(platformAdminRole);
        when(userRepo.findById(adminId)).thenReturn(Optional.of(platformAdmin));

        UserPrincipal principal = mock(UserPrincipal.class);
        lenient().when(principal.getId()).thenReturn(adminId);

        CreateUserRequestDto dto = new CreateUserRequestDto();

        BusinessException ex = assertThrows(BusinessException.class, () -> service.submit(dto, principal));
        assertThat(ex.getMessage()).contains("Platform admins have no organization context");

        verify(orgRepo, never()).findById(any());
        verify(requestRepo, never()).save(any());
    }

    @Test
    void submit_orgUser_missingStaffRole_throwsBusinessException() {
        UserCreationRequestServiceImpl service = newService();
        UUID orgAdminId = UUID.randomUUID();
        User orgAdmin = User.builder().id(orgAdminId).build();
        orgAdmin.addRole(Role.builder().name("ROLE_ORG_ADMIN").build());
        when(userRepo.findById(orgAdminId)).thenReturn(Optional.of(orgAdmin));

        UserPrincipal principal = mock(UserPrincipal.class);
        lenient().when(principal.getId()).thenReturn(orgAdminId);

        CreateUserRequestDto dto = new CreateUserRequestDto();
        dto.setEmail("newstaff@example.com");
        dto.setFirstName("New");
        dto.setLastName("Staff");
        dto.setRole(RequestedRole.ORG_USER);
        // staffRole intentionally left unset

        BusinessException ex = assertThrows(BusinessException.class, () -> service.submit(dto, principal));
        assertThat(ex.getMessage()).contains("staffRole is required");
        verify(requestRepo, never()).save(any());
    }

    @Test
    void review_orgUserApproval_assignsRequestedStaffRole_notLiteralOrgUser() {
        UserCreationRequestServiceImpl service = newService();
        UUID reviewerId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        UUID requestId = UUID.randomUUID();

        User reviewer = User.builder().id(reviewerId).organizationId(orgId).build();
        reviewer.addRole(Role.builder().name("ROLE_ORG_ADMIN").build());
        when(userRepo.findById(reviewerId)).thenReturn(Optional.of(reviewer));

        Organization org = Organization.builder().id(orgId).build();
        User requestedBy = User.builder().id(UUID.randomUUID()).firstName("QA").lastName("Admin").build();
        UserCreationRequest request = UserCreationRequest.builder()
                .id(requestId)
                .requestedEmail("newfo@example.com")
                .requestedFirstName("New")
                .requestedLastName("Fo")
                .requestedRole(RequestedRole.ORG_USER)
                .requestedStaffRole("FO")
                .organization(org)
                .requestedBy(requestedBy)
                .status(RequestStatus.PENDING)
                .build();
        when(requestRepo.findById(requestId)).thenReturn(Optional.of(request));
        when(userRepo.existsByEmail("newfo@example.com")).thenReturn(false);

        Role foRole = Role.builder().name("ROLE_FO").build();
        when(roleRepo.findByName("ROLE_FO")).thenReturn(Optional.of(foRole));
        when(passwordEncoder.encode(any())).thenReturn("hash");
        AppProperties.Security security = new AppProperties.Security();
        security.setWelcomeOtpExpiryMinutes(30);
        lenient().when(appProperties.getSecurity()).thenReturn(security);

        UserPrincipal principal = mock(UserPrincipal.class);
        lenient().when(principal.getId()).thenReturn(reviewerId);
        lenient().when(principal.getOrganizationId()).thenReturn(orgId);

        ReviewRequestDto dto = new ReviewRequestDto();
        dto.setApproved(true);

        service.review(requestId, dto, principal);

        verify(roleRepo).findByName("ROLE_FO");
        verify(roleRepo, never()).findByName("ROLE_ORG_USER");
        verify(userRepo).save(any(User.class));
    }

    @Test
    void review_orgUserApproval_missingStaffRole_throwsResourceNotFound_notMisleadingOrgUser() {
        // Documents the pre-fix failure mode for a request that somehow has no staffRole set:
        // "ROLE_null" is a clean, obviously-wrong role name rather than the old
        // "ROLE_ORG_USER" (a plausible-looking name for a role that never existed).
        UserCreationRequestServiceImpl service = newService();
        UUID reviewerId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        UUID requestId = UUID.randomUUID();

        User reviewer = User.builder().id(reviewerId).organizationId(orgId).build();
        reviewer.addRole(Role.builder().name("ROLE_ORG_ADMIN").build());
        when(userRepo.findById(reviewerId)).thenReturn(Optional.of(reviewer));

        Organization org = Organization.builder().id(orgId).build();
        User requestedBy = User.builder().id(UUID.randomUUID()).firstName("QA").lastName("Admin").build();
        UserCreationRequest request = UserCreationRequest.builder()
                .id(requestId)
                .requestedEmail("newuser@example.com")
                .requestedRole(RequestedRole.ORG_USER)
                .requestedStaffRole(null)
                .organization(org)
                .requestedBy(requestedBy)
                .status(RequestStatus.PENDING)
                .build();
        when(requestRepo.findById(requestId)).thenReturn(Optional.of(request));
        when(userRepo.existsByEmail("newuser@example.com")).thenReturn(false);
        when(roleRepo.findByName("ROLE_null")).thenReturn(Optional.empty());

        UserPrincipal principal = mock(UserPrincipal.class);
        lenient().when(principal.getId()).thenReturn(reviewerId);
        lenient().when(principal.getOrganizationId()).thenReturn(orgId);

        ReviewRequestDto dto = new ReviewRequestDto();
        dto.setApproved(true);

        assertThrows(ResourceNotFoundException.class, () -> service.review(requestId, dto, principal));
    }
}
