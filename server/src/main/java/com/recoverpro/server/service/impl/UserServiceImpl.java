package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.config.AppProperties;
import com.recoverpro.server.config.PlatformConstants;
import com.recoverpro.server.dto.request.AssignRoleRequest;
import com.recoverpro.server.dto.request.CreateUserRequest;
import com.recoverpro.server.dto.request.UpdateUserRequest;
import com.recoverpro.server.dto.response.DirectPermissionResponse;
import com.recoverpro.server.dto.response.PageResponse;
import com.recoverpro.server.dto.response.PermissionResponse;
import com.recoverpro.server.dto.response.UserPermissionsResponse;
import com.recoverpro.server.dto.response.UserResponse;
import com.recoverpro.server.entity.Permission;
import com.recoverpro.server.entity.PasswordResetToken;
import com.recoverpro.server.entity.Role;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.entity.UserPermission;
import com.recoverpro.server.mapper.UserMapper;
import com.recoverpro.server.repository.PasswordResetTokenRepository;
import com.recoverpro.server.repository.PermissionRepository;
import com.recoverpro.server.repository.RoleRepository;
import com.recoverpro.server.repository.UserPermissionRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.UserActionAuditService;
import com.recoverpro.server.service.EmailService;
import com.recoverpro.server.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserPermissionRepository userPermissionRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final UserActionAuditService auditLogService;
    private final EmailService emailService;
    private final AppProperties appProperties;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID id) {
        return userRepository.findById(id)
                .map(userMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UUID userId) {
        return getUserById(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<UserResponse> listUsers(UUID callerOrgId, Pageable pageable) {
        Page<User> page = callerOrgId == null
                ? userRepository.findAllByOrderByCreatedAtDesc(pageable)
                : userRepository.findByOrganizationIdOrderByCreatedAtDesc(callerOrgId, pageable);
        return PageResponse.of(page.map(userMapper::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getOrgUser(UUID callerOrgId, UUID targetUserId) {
        return userMapper.toResponse(requireSameOrg(callerOrgId, targetUserId));
    }

    @Override
    public UserResponse createUser(UUID callerOrgId, CreateUserRequest request) {
        if (callerOrgId == null) throw new BusinessException("Caller has no organization context");

        String email = request.getEmail().toLowerCase().trim();
        if (userRepository.existsByEmail(email)) {
            log.warn("Duplicate user creation attempt email hash={}", email.hashCode());
            throw new BusinessException("A user with that email already exists");
        }

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(UUID.randomUUID() + UUID.randomUUID().toString()))
                .firstName(request.getFirstName().strip())
                .lastName(request.getLastName().strip())
                .enabled(true)
                .accountLocked(false)
                .organizationId(callerOrgId)
                .build();

        if (request.getRoleNames() != null && !request.getRoleNames().isEmpty()) {
            for (String name : request.getRoleNames()) {
                String normalized = name.toUpperCase();
                Role role = roleRepository.findByNameAndOrganizationIdIsNull(normalized)
                        .or(() -> roleRepository.findByNameAndOrganizationId(normalized, callerOrgId))
                        .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + name));
                if (PlatformConstants.ROLE_PLATFORM_ADMIN.equals(role.getName())) {
                    throw new BusinessException("ROLE_PLATFORM_ADMIN cannot be assigned by an Org Admin");
                }
                user.addRole(role);
            }
        }

        User saved = userRepository.save(user);
        sendWelcomeOtp(saved);
        auditLogService.logUserAction(callerId(), "USER_CREATED",
                "Created user id=" + saved.getId() + " in org=" + callerOrgId);
        return userMapper.toResponse(saved);
    }

    private void sendWelcomeOtp(User user) {
        int expiryMinutes = appProperties.getSecurity().getWelcomeOtpExpiryMinutes();
        String otp = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
        passwordResetTokenRepository.invalidateAllByUserId(user.getId());
        PasswordResetToken token = PasswordResetToken.builder()
                .user(user)
                .otpHash(passwordEncoder.encode(otp))
                .expiresAt(Instant.now().plus(expiryMinutes, ChronoUnit.MINUTES))
                .build();
        passwordResetTokenRepository.save(token);
        emailService.sendWelcomeEmail(user.getEmail(), user.getFirstName(), otp, expiryMinutes);
    }

    @Override
    public UserResponse updateUser(UUID callerOrgId, UUID targetUserId, UpdateUserRequest request) {
        User user = requireSameOrg(callerOrgId, targetUserId);
        if (request.getFirstName() != null && !request.getFirstName().isBlank()) {
            user.setFirstName(request.getFirstName().strip());
        }
        if (request.getLastName() != null && !request.getLastName().isBlank()) {
            user.setLastName(request.getLastName().strip());
        }
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String newEmail = request.getEmail().strip().toLowerCase();
            userRepository.findByEmailIgnoreCase(newEmail)
                    .filter(existing -> !existing.getId().equals(targetUserId))
                    .ifPresent(__ -> { throw new BusinessException("Email is already in use"); });
            user.setEmail(newEmail);
        }
        User saved = userRepository.save(user);
        auditLogService.logUserAction(callerId(), "USER_UPDATED", "Updated user id=" + targetUserId);
        return userMapper.toResponse(saved);
    }

    @Override
    public UserResponse assignRole(UUID callerOrgId, UUID targetUserId, AssignRoleRequest request) {
        User caller = currentCallerOrThrow(callerOrgId);
        User target = requireSameOrg(callerOrgId, targetUserId);
        String normalizedRoleName = request.getRoleName().toUpperCase();

        Role role = roleRepository.findByNameAndOrganizationIdIsNull(normalizedRoleName)
                .or(() -> callerOrgId != null
                        ? roleRepository.findByNameAndOrganizationId(normalizedRoleName, callerOrgId)
                        : Optional.empty())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + request.getRoleName()));

        Set<String> callerPerms = collectPermissions(caller);
        Set<String> rolePerms   = role.getPermissions().stream()
                .map(Permission::getName).collect(Collectors.toSet());
        if (!callerPerms.containsAll(rolePerms)) {
            Set<String> missing = new HashSet<>(rolePerms);
            missing.removeAll(callerPerms);
            throw new BusinessException("You cannot assign a role with permissions you don't hold: " + missing);
        }
        if (PlatformConstants.ROLE_PLATFORM_ADMIN.equals(role.getName()) && !isPlatformAdmin(caller)) {
            throw new BusinessException("ROLE_PLATFORM_ADMIN can only be granted by another Platform Admin");
        }

        target.addRole(role);
        User saved = userRepository.save(target);
        auditLogService.logUserAction(callerId(), "ROLE_GRANTED",
                "Granted " + role.getName() + " to user=" + targetUserId);
        return userMapper.toResponse(saved);
    }

    @Override
    public UserResponse removeRole(UUID callerOrgId, UUID targetUserId, String roleName) {
        User target = requireSameOrg(callerOrgId, targetUserId);
        String normalized = roleName.toUpperCase();
        Role role = roleRepository.findByNameAndOrganizationIdIsNull(normalized)
                .or(() -> callerOrgId != null
                        ? roleRepository.findByNameAndOrganizationId(normalized, callerOrgId)
                        : Optional.empty())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName));

        if (target.getRoles().size() <= 1) {
            throw new BusinessException("Cannot remove the user's last role -- user would become orphaned");
        }

        target.removeRole(role);
        User saved = userRepository.save(target);
        auditLogService.logUserAction(callerId(), "ROLE_REVOKED",
                "Revoked " + roleName + " from user=" + targetUserId);
        return userMapper.toResponse(saved);
    }

    @Override
    public void enableUser(UUID callerOrgId, UUID targetUserId) {
        User user = requireSameOrg(callerOrgId, targetUserId);
        user.setEnabled(true);
        user.setAccountLocked(false);
        user.setLockoutUntil(null);
        user.setFailedLoginAttempts(0);
        userRepository.save(user);
        auditLogService.logUserAction(callerId(), "USER_ENABLED", "Enabled user id=" + targetUserId);
    }

    @Override
    public void disableUser(UUID callerOrgId, UUID targetUserId) {
        User user = requireSameOrg(callerOrgId, targetUserId);
        requireNotSelf(targetUserId, "deactivate");
        requireNotLastPlatformAdmin(user, "deactivate");
        user.setEnabled(false);
        userRepository.save(user);
        auditLogService.logUserAction(callerId(), "USER_DISABLED", "Disabled user id=" + targetUserId);
    }

    @Override
    public void deleteUser(UUID callerOrgId, UUID targetUserId) {
        User user = requireSameOrg(callerOrgId, targetUserId);
        requireNotSelf(targetUserId, "delete");
        requireNotLastPlatformAdmin(user, "delete");
        user.setEmail("deleted-" + user.getId() + "@recoverpro.internal");
        user.setFirstName("[Deleted]");
        user.setLastName("[User]");
        user.setEnabled(false);
        user.setDeletedAt(Instant.now());
        userRepository.save(user);
        auditLogService.logUserAction(callerId(), "USER_DELETED",
                "Soft-deleted user id=" + targetUserId + " in org=" + callerOrgId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> listUsersByRole(UUID callerOrgId, String roleName) {
        if (callerOrgId == null) return List.of();
        return userRepository.findByOrganizationIdAndRoleName(callerOrgId, roleName)
                .stream().map(userMapper::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public UserPermissionsResponse getUserPermissions(UUID callerOrgId, UUID targetUserId) {
        return buildPermissionsResponse(requireSameOrg(callerOrgId, targetUserId));
    }

    @Override
    public UserPermissionsResponse grantDirectPermission(UUID callerOrgId, UUID targetUserId,
                                                          String permissionName, UUID grantedByUserId) {
        User target = requireSameOrg(callerOrgId, targetUserId);
        Permission perm = permissionRepository.findByName(permissionName)
                .orElseThrow(() -> new ResourceNotFoundException("Permission not found: " + permissionName));

        User caller = currentCallerOrThrow(callerOrgId);
        Set<String> callerPerms = collectPermissions(caller);
        if (!callerPerms.contains(perm.getName())) {
            throw new BusinessException("You cannot grant a permission you don't hold: " + permissionName);
        }

        userPermissionRepository.findByUserIdAndPermissionId(target.getId(), perm.getId())
                .ifPresentOrElse(
                        existing -> existing.setGranted(true),
                        () -> {
                            User grantor = grantedByUserId != null
                                    ? userRepository.findById(grantedByUserId).orElse(null) : null;
                            userPermissionRepository.save(UserPermission.builder()
                                    .user(target)
                                    .permission(perm)
                                    .grantedBy(grantor)
                                    .isGranted(true)
                                    .build());
                        });

        auditLogService.logUserAction(callerId(), "PERMISSION_GRANTED",
                "Granted " + permissionName + " to user=" + targetUserId);
        return buildPermissionsResponse(userRepository.findById(target.getId()).orElse(target));
    }

    @Override
    public UserPermissionsResponse revokeDirectPermission(UUID callerOrgId, UUID targetUserId,
                                                           String permissionName) {
        User target = requireSameOrg(callerOrgId, targetUserId);
        Permission perm = permissionRepository.findByName(permissionName)
                .orElseThrow(() -> new ResourceNotFoundException("Permission not found: " + permissionName));

        if (userPermissionRepository.findByUserIdAndPermissionId(target.getId(), perm.getId()).isEmpty()) {
            throw new ResourceNotFoundException("Direct permission not found for user: " + permissionName);
        }
        userPermissionRepository.deleteByUserIdAndPermissionId(target.getId(), perm.getId());

        auditLogService.logUserAction(callerId(), "PERMISSION_REVOKED",
                "Revoked direct permission " + permissionName + " from user=" + targetUserId);
        return buildPermissionsResponse(target);
    }

    // ─── helpers ─────────────────────────────────────────────────────────────

    private UserPermissionsResponse buildPermissionsResponse(User user) {
        Set<PermissionResponse> fromRoles = user.getRoles().stream()
                .flatMap(r -> r.getPermissions().stream())
                .map(userMapper::toPermissionResponse)
                .collect(Collectors.toSet());

        Set<DirectPermissionResponse> direct = userPermissionRepository
                .findActiveGrantsByUserId(user.getId(), Instant.now())
                .stream()
                .map(up -> {
                    Permission p = up.getPermission();
                    return DirectPermissionResponse.builder()
                            .id(up.getId())
                            .name(p.getName())
                            .resource(p.getResource())
                            .action(p.getAction())
                            .description(p.getDescription())
                            .scope(p.getScope() != null ? p.getScope().name() : null)
                            .granted(up.isGranted())
                            .grantedAt(up.getGrantedAt())
                            .build();
                })
                .collect(Collectors.toSet());

        return UserPermissionsResponse.builder().fromRoles(fromRoles).direct(direct).build();
    }

    private UUID callerId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal up) {
            return up.getId();
        }
        return null;
    }

    private User currentCallerOrThrow(UUID callerOrgId) {
        if (callerOrgId == null) {
            User platform = new User();
            platform.setRoles(new HashSet<>());
            return platform;
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal up) {
            return userRepository.findById(up.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Caller user not found"));
        }
        throw new BusinessException("No authenticated caller");
    }

    private User requireSameOrg(UUID callerOrgId, UUID targetUserId) {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + targetUserId));
        if (callerOrgId != null
                && (user.getOrganizationId() == null || !user.getOrganizationId().equals(callerOrgId))) {
            throw new ResourceNotFoundException("User not found: " + targetUserId);
        }
        return user;
    }

    private Set<String> collectPermissions(User user) {
        if (user.getRoles().isEmpty()) {
            return roleRepository.findByName(PlatformConstants.ROLE_PLATFORM_ADMIN)
                    .map(r -> r.getPermissions().stream()
                            .map(Permission::getName).collect(Collectors.toSet()))
                    .orElse(Set.of());
        }
        Set<String> out = new HashSet<>();
        for (Role r : user.getRoles()) {
            for (Permission p : r.getPermissions()) {
                out.add(p.getName());
            }
        }
        return out;
    }

    private boolean isPlatformAdmin(User user) {
        return user.getRoles().stream()
                .anyMatch(r -> PlatformConstants.ROLE_PLATFORM_ADMIN.equals(r.getName()));
    }

    private void requireNotSelf(UUID targetUserId, String action) {
        if (targetUserId.equals(callerId())) {
            throw new BusinessException("You cannot " + action + " your own account");
        }
    }

    private void requireNotLastPlatformAdmin(User target, String action) {
        if (isPlatformAdmin(target)
                && userRepository.countByRoleNameAndEnabledTrue(PlatformConstants.ROLE_PLATFORM_ADMIN) <= 1) {
            throw new BusinessException("Cannot " + action + " the last active platform admin");
        }
    }
}
