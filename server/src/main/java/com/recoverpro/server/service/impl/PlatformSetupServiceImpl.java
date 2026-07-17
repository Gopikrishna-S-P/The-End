package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.config.AppProperties;
import com.recoverpro.server.dto.request.CreateDirectUserRequest;
import com.recoverpro.server.dto.response.UserResponse;
import com.recoverpro.server.entity.PasswordResetToken;
import com.recoverpro.server.entity.Role;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.mapper.UserMapper;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.repository.PasswordResetTokenRepository;
import com.recoverpro.server.repository.RoleRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.service.EmailService;
import com.recoverpro.server.service.PlatformSetupService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PlatformSetupServiceImpl implements PlatformSetupService {

    private final OrganizationRepository orgRepo;
    private final UserRepository userRepo;
    private final RoleRepository roleRepo;
    private final PasswordResetTokenRepository passwordResetTokenRepo;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AppProperties appProperties;
    private final UserMapper userMapper;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Override
    public UserResponse createAdminUser(CreateDirectUserRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        String roleName = "ROLE_" + request.getRole().toUpperCase().trim();

        if (!roleName.equals("ROLE_ORG_ADMIN") && !roleName.equals("ROLE_PLATFORM_ADMIN")) {
            throw new BusinessException("Direct user creation only supports ORG_ADMIN or PLATFORM_ADMIN roles");
        }
        if (userRepo.existsByEmail(email)) {
            log.warn("Direct admin creation blocked: email already registered (role={})", roleName);
            throw new BusinessException("That email is already registered");
        }

        Role role = roleRepo.findByNameAndOrganizationIdIsNull(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("System role not found: " + roleName));

        UUID orgId = null;
        if (roleName.equals("ROLE_ORG_ADMIN")) {
            if (request.getOrganizationId() == null) {
                throw new BusinessException("organizationId is required for ORG_ADMIN");
            }
            orgRepo.findById(request.getOrganizationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Organization", request.getOrganizationId()));
            orgId = request.getOrganizationId();
        }

        String tempPassword = UUID.randomUUID() + UUID.randomUUID().toString();
        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(tempPassword))
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())
                .enabled(true)
                .organizationId(orgId)
                .build();
        user.addRole(role);
        user = userRepo.save(user);

        sendWelcomeOtp(user);
        log.info("Created {} user: id={} (org={})", roleName, user.getId(), orgId);
        return userMapper.toResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> listAdminUsers() {
        return userRepo.findDistinctByRoleNameIn(List.of("ROLE_ORG_ADMIN", "ROLE_PLATFORM_ADMIN")).stream()
                .map(userMapper::toResponse)
                .collect(Collectors.toList());
    }

    private void sendWelcomeOtp(User user) {
        int expiryMinutes = appProperties.getSecurity().getWelcomeOtpExpiryMinutes();
        String otp = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
        passwordResetTokenRepo.invalidateAllByUserId(user.getId());
        PasswordResetToken token = PasswordResetToken.builder()
                .user(user)
                .otpHash(passwordEncoder.encode(otp))
                .expiresAt(Instant.now().plusSeconds(expiryMinutes * 60L))
                .build();
        passwordResetTokenRepo.save(token);
        emailService.sendWelcomeEmail(user.getEmail(), user.getFirstName(), otp, expiryMinutes);
    }
}
