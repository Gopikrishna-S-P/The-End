package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.config.AppProperties;
import com.recoverpro.server.config.PlatformConstants;
import com.recoverpro.server.dto.request.CreateOrganizationRequest;
import com.recoverpro.server.dto.request.UpdateOrganizationPlatformRequest;
import com.recoverpro.server.dto.request.UpdateOrgAdminRequest;
import com.recoverpro.server.dto.response.OrganizationSummaryResponse;
import com.recoverpro.server.dto.response.UserResponse;
import com.recoverpro.server.entity.*;
import com.recoverpro.server.enums.OrganizationType;
import com.recoverpro.server.mapper.UserMapper;
import com.recoverpro.server.repository.*;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.EmailService;
import com.recoverpro.server.service.UserActionAuditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1/platform/organizations")
@RequiredArgsConstructor
@PreAuthorize("hasRole('PLATFORM_ADMIN')")
public class PlatformOrganizationController {

    private final OrganizationRepository orgRepo;
    private final UserRepository userRepo;
    private final RoleRepository roleRepo;
    private final PasswordEncoder passwordEncoder;
    private final UserActionAuditService auditLogService;
    private final EmailService emailService;
    private final PasswordResetTokenRepository passwordResetTokenRepo;
    private final AppProperties appProperties;
    private final UserMapper userMapper;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<OrganizationSummaryResponse>>> list() {
        List<OrganizationSummaryResponse> result = orgRepo.findAll().stream()
                .filter(o -> !PlatformConstants.PLATFORM_ORG_CODE.equalsIgnoreCase(o.getCode()))
                .map(this::toSummary)
                .toList();
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<OrganizationSummaryResponse>> getOne(@PathVariable UUID id) {
        Organization org = orgRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + id));
        return ResponseEntity.ok(ApiResponse.success(toSummary(org)));
    }

    @GetMapping("/{id}/users")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<UserResponse>>> getUsers(@PathVariable UUID id) {
        if (!orgRepo.existsById(id)) throw new ResourceNotFoundException("Organization not found: " + id);
        List<UserResponse> users = userRepo.findByOrganizationId(id).stream()
                .map(userMapper::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ApiResponse<OrganizationSummaryResponse>> create(
            @Valid @RequestBody CreateOrganizationRequest request,
            @AuthenticationPrincipal UserPrincipal caller) {

        if (PlatformConstants.PLATFORM_ORG_CODE.equalsIgnoreCase(request.getCode()))
            throw new BusinessException("Organization code '" + request.getCode() + "' is reserved");
        if (orgRepo.existsByCode(request.getCode()))
            throw new BusinessException("Organization code already exists");
        if (orgRepo.existsByName(request.getName()))
            throw new BusinessException("Organization name already exists");
        if (userRepo.existsByEmail(request.getAdminEmail().toLowerCase().trim()))
            throw new BusinessException("Admin email already exists");

        Role orgAdminRole = roleRepo.findByNameAndOrganizationIdIsNull(PlatformConstants.ROLE_ORG_ADMIN)
                .orElseThrow(() -> new BusinessException("ROLE_ORG_ADMIN not seeded"));

        byte[] pepperBytes = new byte[32];
        SECURE_RANDOM.nextBytes(pepperBytes);
        String lookupHashPepper = HexFormat.of().formatHex(pepperBytes);

        Organization org = Organization.builder()
                .name(request.getName())
                .code(request.getCode())
                .organizationType(OrganizationType.ORGANIZATION)
                .isActive(true)
                .lookupHashPepper(lookupHashPepper)
                .build();
        org = orgRepo.save(org);

        User admin = User.builder()
                .email(request.getAdminEmail().toLowerCase().trim())
                .passwordHash(passwordEncoder.encode(request.getAdminPassword()))
                .firstName(request.getAdminFirstName())
                .lastName(request.getAdminLastName())
                .enabled(true)
                .accountLocked(false)
                .organizationId(org.getId())
                .passwordChangedAt(Instant.now())
                .build();
        admin.getRoles().add(orgAdminRole);
        admin = userRepo.save(admin);
        sendWelcomeOtp(admin);

        auditLogService.logUserAction(caller.getId(), "ORG_CREATED",
                "Created org: " + org.getName() + " [" + org.getCode() + "] id=" + org.getId());
        log.info("Org created | orgId={} adminEmail={} by={}", org.getId(), admin.getEmail(), caller.getId());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Organization created", toSummary(org)));
    }

    @PatchMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<OrganizationSummaryResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateOrganizationPlatformRequest request,
            @AuthenticationPrincipal UserPrincipal caller) {

        Organization org = orgRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + id));
        if (PlatformConstants.PLATFORM_ORG_CODE.equalsIgnoreCase(org.getCode()))
            throw new BusinessException("Platform organization cannot be modified");

        String newName = request.getName().trim();
        String newCode = request.getCode().trim().toUpperCase();
        if (!org.getName().equalsIgnoreCase(newName) && orgRepo.existsByName(newName))
            throw new BusinessException("Organization name already in use");
        if (!org.getCode().equalsIgnoreCase(newCode) && orgRepo.existsByCode(newCode))
            throw new BusinessException("Organization code already in use");
        if (PlatformConstants.PLATFORM_ORG_CODE.equalsIgnoreCase(newCode))
            throw new BusinessException("Organization code '" + newCode + "' is reserved");

        org.setName(newName);
        org.setCode(newCode);
        orgRepo.save(org);

        auditLogService.logUserAction(caller.getId(), "ORG_UPDATED",
                "Updated org id=" + id + " name='" + newName + "' code='" + newCode + "'");
        return ResponseEntity.ok(ApiResponse.success(toSummary(org)));
    }

    @PatchMapping("/{id}/admin")
    @Transactional
    public ResponseEntity<ApiResponse<OrganizationSummaryResponse>> updateAdmin(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateOrgAdminRequest request,
            @AuthenticationPrincipal UserPrincipal caller) {

        if (!orgRepo.existsById(id)) throw new ResourceNotFoundException("Organization not found: " + id);
        User admin = userRepo.findByOrganizationIdAndRoleName(id, PlatformConstants.ROLE_ORG_ADMIN)
                .stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Org Admin not found for organization: " + id));

        String newEmail = request.getEmail().toLowerCase().trim();
        if (!admin.getEmail().equalsIgnoreCase(newEmail) && userRepo.existsByEmail(newEmail))
            throw new BusinessException("Email already in use by another account");

        admin.setFirstName(request.getFirstName().trim());
        admin.setLastName(request.getLastName().trim());
        admin.setEmail(newEmail);
        userRepo.save(admin);

        auditLogService.logUserAction(caller.getId(), "ORG_ADMIN_UPDATED",
                "Updated admin for org id=" + id + " new email=" + newEmail);
        return ResponseEntity.ok(ApiResponse.success(toSummary(orgRepo.findById(id).orElseThrow())));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal caller) {

        Organization org = orgRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + id));
        if (PlatformConstants.PLATFORM_ORG_CODE.equalsIgnoreCase(org.getCode()))
            throw new BusinessException("Platform organization cannot be deleted");

        long userCount = userRepo.countByOrganizationId(id);
        if (userCount > 0)
            throw new BusinessException("Cannot delete organization: " + userCount + " user(s) still belong to it. Remove all users first.");

        auditLogService.logUserAction(caller.getId(), "ORG_DELETED",
                "Deleted org: " + org.getName() + " [" + org.getCode() + "] id=" + id);
        orgRepo.delete(org);
        return ResponseEntity.ok(ApiResponse.of("Organization deleted", null));
    }

    @PatchMapping("/{id}/active")
    @Transactional
    public ResponseEntity<ApiResponse<OrganizationSummaryResponse>> setActive(
            @PathVariable UUID id,
            @RequestParam boolean active,
            @AuthenticationPrincipal UserPrincipal caller) {

        Organization org = orgRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + id));
        if (PlatformConstants.PLATFORM_ORG_CODE.equalsIgnoreCase(org.getCode()))
            throw new BusinessException("Platform organization cannot be deactivated");

        boolean previous = org.isActive();
        org.setActive(active);
        orgRepo.save(org);

        auditLogService.logUserAction(caller.getId(), active ? "ORG_ACTIVATED" : "ORG_DEACTIVATED",
                "Org " + org.getCode() + " [" + id + "] active: " + previous + " → " + active);
        return ResponseEntity.ok(ApiResponse.success(toSummary(org)));
    }

    // ─────────────────────────────────────────────────────────────────────────

    private void sendWelcomeOtp(User user) {
        int expiryMinutes = appProperties.getSecurity().getWelcomeOtpExpiryMinutes();
        String otp = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
        PasswordResetToken token = PasswordResetToken.builder()
                .user(user)
                .otpHash(passwordEncoder.encode(otp))
                .expiresAt(Instant.now().plusSeconds(expiryMinutes * 60L))
                .build();
        passwordResetTokenRepo.save(token);
        emailService.sendWelcomeEmail(user.getEmail(), user.getFirstName(), otp, expiryMinutes);
    }

    private OrganizationSummaryResponse toSummary(Organization org) {
        long count = userRepo.countByOrganizationId(org.getId());
        String orgAdminEmail = userRepo
                .findByOrganizationIdAndRoleName(org.getId(), PlatformConstants.ROLE_ORG_ADMIN)
                .stream()
                .map(User::getEmail)
                .findFirst()
                .orElse(null);
        return OrganizationSummaryResponse.builder()
                .id(org.getId())
                .name(org.getName())
                .code(org.getCode())
                .orgType(org.getOrganizationType() != null ? org.getOrganizationType().name() : null)
                .isActive(org.isActive())
                .createdAt(org.getCreatedAt())
                .userCount(count)
                .orgAdminEmail(orgAdminEmail)
                .build();
    }
}
