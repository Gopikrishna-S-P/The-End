package com.recoverpro.server.service.impl;

import com.recoverpro.server.config.AppProperties;
import com.recoverpro.server.dto.response.PageResponse;
import com.recoverpro.server.dto.response.UserResponse;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.mapper.UserMapper;
import com.recoverpro.server.repository.PasswordResetTokenRepository;
import com.recoverpro.server.repository.PermissionRepository;
import com.recoverpro.server.repository.RoleRepository;
import com.recoverpro.server.repository.UserPermissionRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.service.UserActionAuditService;
import com.recoverpro.server.service.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
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
}
