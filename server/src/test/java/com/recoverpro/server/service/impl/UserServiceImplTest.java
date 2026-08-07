package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.config.AppProperties;
import com.recoverpro.server.config.PlatformConstants;
import com.recoverpro.server.dto.request.UpdateUserRequest;
import com.recoverpro.server.dto.response.PageResponse;
import com.recoverpro.server.dto.response.UserResponse;
import com.recoverpro.server.entity.Role;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.mapper.UserMapper;
import com.recoverpro.server.repository.PasswordResetTokenRepository;
import com.recoverpro.server.repository.PermissionRepository;
import com.recoverpro.server.repository.RoleRepository;
import com.recoverpro.server.repository.UserPermissionRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.UserActionAuditService;
import com.recoverpro.server.service.EmailService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private PermissionRepository permissionRepository;
    @Mock private UserPermissionRepository userPermissionRepository;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock private UserMapper userMapper;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private UserActionAuditService auditLogService;
    @Mock private EmailService emailService;
    @Mock private AppProperties appProperties;

    private UserServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new UserServiceImpl(userRepository, roleRepository, permissionRepository,
                userPermissionRepository, passwordResetTokenRepository, userMapper, passwordEncoder,
                auditLogService, emailService, appProperties);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void actAs(UUID userId) {
        User caller = User.builder().id(userId).build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(new UserPrincipal(caller), null, List.of()));
    }

    @Test
    void listUsers_orgScoped_delegatesPagingToRepository_notInMemory() {
        UUID orgId = UUID.randomUUID();
        Pageable pageable = PageRequest.of(0, 20);
        User user = new User();
        Page<User> repoPage = new PageImpl<>(List.of(user), pageable, 1);

        when(userRepository.findByOrganizationIdOrderByCreatedAtDesc(orgId, pageable)).thenReturn(repoPage);
        when(userMapper.toResponse(user)).thenReturn(UserResponse.builder().build());

        PageResponse<UserResponse> result = service.listUsers(orgId, pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent()).hasSize(1);
        verify(userRepository, never()).findByOrganizationId(any());
    }

    @Test
    void listUsers_platformScoped_usesGlobalPagedQuery() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<User> repoPage = new PageImpl<>(List.of(), pageable, 0);
        when(userRepository.findAllByOrderByCreatedAtDesc(pageable)).thenReturn(repoPage);

        PageResponse<UserResponse> result = service.listUsers(null, pageable);

        assertThat(result.getTotalElements()).isZero();
    }

    @Test
    void updateUser_writesAuditLogEntry() {
        UUID orgId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        User user = User.builder().id(targetId).organizationId(orgId).build();
        when(userRepository.findById(targetId)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userMapper.toResponse(any())).thenReturn(UserResponse.builder().build());
        UpdateUserRequest request = new UpdateUserRequest();
        request.setFirstName("Updated");

        service.updateUser(orgId, targetId, request);

        verify(auditLogService).logUserAction(any(), eq("USER_UPDATED"), contains(targetId.toString()));
    }

    @Test
    void enableUser_writesAuditLogEntry() {
        UUID orgId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        User user = User.builder().id(targetId).organizationId(orgId).build();
        when(userRepository.findById(targetId)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.enableUser(orgId, targetId);

        verify(auditLogService).logUserAction(any(), eq("USER_ENABLED"), contains(targetId.toString()));
    }

    @Test
    void disableUser_writesAuditLogEntry() {
        UUID orgId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        User user = User.builder().id(targetId).organizationId(orgId).build();
        when(userRepository.findById(targetId)).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        actAs(UUID.randomUUID());

        service.disableUser(orgId, targetId);

        verify(auditLogService).logUserAction(any(), eq("USER_DISABLED"), contains(targetId.toString()));
    }

    @Test
    void disableUser_targetingSelf_throwsAndDoesNotSave() {
        UUID selfId = UUID.randomUUID();
        User user = User.builder().id(selfId).build();
        when(userRepository.findById(selfId)).thenReturn(Optional.of(user));
        actAs(selfId);

        assertThatThrownBy(() -> service.disableUser(null, selfId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("own account");
        verify(userRepository, never()).save(any());
    }

    @Test
    void deleteUser_targetingSelf_throwsAndDoesNotSave() {
        UUID selfId = UUID.randomUUID();
        User user = User.builder().id(selfId).build();
        when(userRepository.findById(selfId)).thenReturn(Optional.of(user));
        actAs(selfId);

        assertThatThrownBy(() -> service.deleteUser(null, selfId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("own account");
        verify(userRepository, never()).save(any());
    }

    @Test
    void disableUser_lastEnabledPlatformAdmin_throwsWhenTargetedByAnotherAdmin() {
        UUID callerId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        Role platformAdminRole = Role.builder().name(PlatformConstants.ROLE_PLATFORM_ADMIN).build();
        User target = User.builder().id(targetId).enabled(true)
                .roles(new HashSet<>(Set.of(platformAdminRole))).build();
        when(userRepository.findById(targetId)).thenReturn(Optional.of(target));
        when(userRepository.countByRoleNameAndEnabledTrue(PlatformConstants.ROLE_PLATFORM_ADMIN)).thenReturn(1L);
        actAs(callerId);

        assertThatThrownBy(() -> service.disableUser(null, targetId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("last active platform admin");
        verify(userRepository, never()).save(any());
    }

    @Test
    void deleteUser_lastEnabledPlatformAdmin_throwsWhenTargetedByAnotherAdmin() {
        UUID callerId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        Role platformAdminRole = Role.builder().name(PlatformConstants.ROLE_PLATFORM_ADMIN).build();
        User target = User.builder().id(targetId).enabled(true)
                .roles(new HashSet<>(Set.of(platformAdminRole))).build();
        when(userRepository.findById(targetId)).thenReturn(Optional.of(target));
        when(userRepository.countByRoleNameAndEnabledTrue(PlatformConstants.ROLE_PLATFORM_ADMIN)).thenReturn(1L);
        actAs(callerId);

        assertThatThrownBy(() -> service.deleteUser(null, targetId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("last active platform admin");
        verify(userRepository, never()).save(any());
    }

    @Test
    void disableUser_oneOfTwoEnabledPlatformAdmins_succeeds() {
        UUID callerId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        Role platformAdminRole = Role.builder().name(PlatformConstants.ROLE_PLATFORM_ADMIN).build();
        User target = User.builder().id(targetId).enabled(true)
                .roles(new HashSet<>(Set.of(platformAdminRole))).build();
        when(userRepository.findById(targetId)).thenReturn(Optional.of(target));
        when(userRepository.countByRoleNameAndEnabledTrue(PlatformConstants.ROLE_PLATFORM_ADMIN)).thenReturn(2L);
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        actAs(callerId);

        service.disableUser(null, targetId);

        assertThat(target.isEnabled()).isFalse();
    }

    @Test
    void disableUser_orgAdmin_unaffectedByPlatformAdminGuardEvenAsSoleOrgAdmin() {
        UUID callerId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        UUID targetId = UUID.randomUUID();
        Role orgAdminRole = Role.builder().name(PlatformConstants.ROLE_ORG_ADMIN).build();
        User target = User.builder().id(targetId).organizationId(orgId).enabled(true)
                .roles(new HashSet<>(Set.of(orgAdminRole))).build();
        when(userRepository.findById(targetId)).thenReturn(Optional.of(target));
        when(userRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        actAs(callerId);

        service.disableUser(orgId, targetId);

        assertThat(target.isEnabled()).isFalse();
        verify(userRepository, never()).countByRoleNameAndEnabledTrue(anyString());
    }
}
