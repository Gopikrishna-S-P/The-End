package com.recoverpro.server.service.impl;

import com.recoverpro.server.config.AppProperties;
import com.recoverpro.server.dto.response.UserResponse;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.mapper.UserMapper;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.repository.PasswordResetTokenRepository;
import com.recoverpro.server.repository.RoleRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.service.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlatformSetupServiceImplTest {

    @Mock private OrganizationRepository orgRepo;
    @Mock private UserRepository userRepo;
    @Mock private RoleRepository roleRepo;
    @Mock private PasswordResetTokenRepository passwordResetTokenRepo;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private EmailService emailService;
    @Mock private AppProperties appProperties;
    @Mock private UserMapper userMapper;

    private PlatformSetupServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new PlatformSetupServiceImpl(orgRepo, userRepo, roleRepo, passwordResetTokenRepo,
                passwordEncoder, emailService, appProperties, userMapper);
    }

    @Test
    void listAdminUsers_queriesByRoleName_insteadOfFullTableScan() {
        User admin = new User();
        when(userRepo.findDistinctByRoleNameIn(List.of("ROLE_ORG_ADMIN", "ROLE_PLATFORM_ADMIN")))
                .thenReturn(List.of(admin));
        when(userMapper.toResponse(admin)).thenReturn(UserResponse.builder().build());

        List<UserResponse> result = service.listAdminUsers();

        assertThat(result).hasSize(1);
        verify(userRepo, never()).findAll();
    }
}
