package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.LogMask;
import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.config.AppProperties;
import com.recoverpro.server.dto.request.CreateUserRequestDto;
import com.recoverpro.server.dto.request.ReviewRequestDto;
import com.recoverpro.server.dto.response.UserCreationRequestResponse;
import com.recoverpro.server.entity.*;
import com.recoverpro.server.entity.UserCreationRequest.RequestStatus;
import com.recoverpro.server.entity.UserCreationRequest.RequestedRole;
import com.recoverpro.server.exception.AccessDeniedException;
import com.recoverpro.server.exception.DuplicateResourceException;
import com.recoverpro.server.exception.EmailAlreadyExistsException;
import com.recoverpro.server.repository.*;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.EmailService;
import com.recoverpro.server.service.UserCreationRequestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class UserCreationRequestServiceImpl implements UserCreationRequestService {

    private final UserCreationRequestRepository requestRepo;
    private final UserRepository userRepo;
    private final RoleRepository roleRepo;
    private final OrganizationRepository orgRepo;
    private final PasswordResetTokenRepository passwordResetTokenRepo;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AppProperties appProperties;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Override
    public UserCreationRequestResponse submit(CreateUserRequestDto dto, UserPrincipal principal) {
        User submitter = userRepo.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", principal.getId()));

        if (!submitter.isOrgAdmin() && !submitter.isPlatformAdmin()) {
            throw new AccessDeniedException("Only Org Admin or Platform Admin can submit user creation requests");
        }

        String normalizedEmail = dto.getEmail().toLowerCase().trim();
        if (userRepo.existsByEmail(normalizedEmail)) {
            throw new EmailAlreadyExistsException("Email already registered: " + normalizedEmail);
        }
        if (requestRepo.existsByRequestedEmailAndStatus(normalizedEmail, RequestStatus.PENDING)) {
            throw new DuplicateResourceException("A pending request already exists for: " + normalizedEmail);
        }

        Organization org = resolveOrg(principal);

        UserCreationRequest request = UserCreationRequest.builder()
                .requestedEmail(normalizedEmail)
                .requestedFirstName(dto.getFirstName().trim())
                .requestedLastName(dto.getLastName().trim())
                .requestedRole(dto.getRole())
                .organization(org)
                .requestedBy(submitter)
                .build();

        try {
            requestRepo.save(request);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new DuplicateResourceException("A pending request already exists for: " + normalizedEmail);
        }
        log.info("User creation request submitted by {} for role {} ({})",
                LogMask.email(submitter.getEmail()), dto.getRole(), LogMask.email(normalizedEmail));
        return toResponse(request);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserCreationRequestResponse> listPendingForApprover(UserPrincipal principal, Pageable pageable) {
        User caller = userRepo.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", principal.getId()));

        if (caller.isPlatformAdmin()) {
            return requestRepo.findByRequestedRoleAndStatusOrderByCreatedAtDesc(
                    RequestedRole.ORG_ADMIN, RequestStatus.PENDING, pageable).map(this::toResponse);
        }
        if (caller.isOrgAdmin() && principal.getOrganizationId() != null) {
            return requestRepo.findByOrganizationIdAndRequestedRoleAndStatusOrderByCreatedAtDesc(
                    principal.getOrganizationId(), RequestedRole.ORG_USER, RequestStatus.PENDING, pageable)
                    .map(this::toResponse);
        }
        return Page.empty(pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserCreationRequestResponse> listMyRequests(UserPrincipal principal, Pageable pageable) {
        return requestRepo.findByRequestedByIdOrderByCreatedAtDesc(principal.getId(), pageable)
                .map(this::toResponse);
    }

    @Override
    public UserCreationRequestResponse review(UUID requestId, ReviewRequestDto dto, UserPrincipal principal) {
        User reviewer = userRepo.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", principal.getId()));

        UserCreationRequest request = requestRepo.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("UserCreationRequest", requestId));

        if (request.getStatus() != RequestStatus.PENDING) {
            throw new BusinessException("Request has already been " + request.getStatus().name().toLowerCase());
        }

        validateReviewAuthority(reviewer, request, principal);

        request.setReviewedBy(reviewer);
        request.setReviewedAt(Instant.now());
        request.setReviewNotes(dto.getNotes());

        if (!dto.isApproved()) {
            request.setStatus(RequestStatus.REJECTED);
            requestRepo.save(request);
            log.info("Request {} rejected by {}", requestId, reviewer.getEmail());
            return toResponse(request);
        }

        String email = request.getRequestedEmail();
        if (userRepo.existsByEmail(email)) {
            log.warn("Approval blocked: requested email already registered (requestId={})", requestId);
            throw new EmailAlreadyExistsException("That email is already registered");
        }

        String roleName = "ROLE_" + request.getRequestedRole().name();
        Role role = roleRepo.findByName(roleName)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleName));

        UUID orgId = request.getOrganization() != null ? request.getOrganization().getId() : null;

        String tempPassword = UUID.randomUUID() + UUID.randomUUID().toString();
        User newUser = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(tempPassword))
                .firstName(request.getRequestedFirstName())
                .lastName(request.getRequestedLastName())
                .enabled(true)
                .organizationId(orgId)
                .build();
        newUser.addRole(role);
        userRepo.save(newUser);

        sendWelcomeOtp(newUser);

        request.setStatus(RequestStatus.APPROVED);
        request.setCreatedUser(newUser);
        requestRepo.save(request);

        log.info("Request {} approved by user {}. Created user: {}", requestId, reviewer.getId(), newUser.getId());
        return toResponse(request);
    }

    @Override
    @Transactional(readOnly = true)
    public long countPendingForApprover(UserPrincipal principal) {
        User caller = userRepo.findById(principal.getId()).orElse(null);
        if (caller == null) return 0;
        if (caller.isPlatformAdmin()) {
            return requestRepo.countByRequestedRoleAndStatus(RequestedRole.ORG_ADMIN, RequestStatus.PENDING);
        }
        if (caller.isOrgAdmin() && principal.getOrganizationId() != null) {
            return requestRepo.countByOrganizationIdAndRequestedRoleAndStatus(
                    principal.getOrganizationId(), RequestedRole.ORG_USER, RequestStatus.PENDING);
        }
        return 0;
    }

    private Organization resolveOrg(UserPrincipal principal) {
        if (principal.getOrganizationId() == null) {
            throw new BusinessException("Your account has no organization assigned. Contact Platform Admin.");
        }
        return orgRepo.findById(principal.getOrganizationId())
                .filter(o -> o.isActive())
                .orElseThrow(() -> new ResourceNotFoundException("Organization", principal.getOrganizationId()));
    }

    private void validateReviewAuthority(User reviewer, UserCreationRequest request, UserPrincipal principal) {
        if (request.getRequestedRole() == RequestedRole.ORG_ADMIN && !reviewer.isPlatformAdmin()) {
            throw new AccessDeniedException("Only Platform Admin can approve Org Admin requests");
        }
        if (request.getRequestedRole() == RequestedRole.ORG_USER) {
            if (!reviewer.isOrgAdmin() && !reviewer.isPlatformAdmin()) {
                throw new AccessDeniedException("Only Org Admin or Platform Admin can approve user requests");
            }
            if (reviewer.isOrgAdmin() && !reviewer.isPlatformAdmin()) {
                UUID reviewerOrg = principal.getOrganizationId();
                UUID requestOrg = request.getOrganization() != null ? request.getOrganization().getId() : null;
                if (reviewerOrg == null || !reviewerOrg.equals(requestOrg)) {
                    throw new AccessDeniedException("This request belongs to a different organization");
                }
            }
        }
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

    private UserCreationRequestResponse toResponse(UserCreationRequest r) {
        return UserCreationRequestResponse.builder()
                .id(r.getId())
                .requestedEmail(r.getRequestedEmail())
                .requestedFirstName(r.getRequestedFirstName())
                .requestedLastName(r.getRequestedLastName())
                .requestedRole(r.getRequestedRole())
                .organizationId(r.getOrganization() != null ? r.getOrganization().getId() : null)
                .organizationName(r.getOrganization() != null ? r.getOrganization().getName() : null)
                .requestedById(r.getRequestedBy().getId())
                .requestedByName(r.getRequestedBy().getFirstName() + " " + r.getRequestedBy().getLastName())
                .status(r.getStatus())
                .reviewedById(r.getReviewedBy() != null ? r.getReviewedBy().getId() : null)
                .reviewedByName(r.getReviewedBy() != null
                        ? r.getReviewedBy().getFirstName() + " " + r.getReviewedBy().getLastName() : null)
                .reviewedAt(r.getReviewedAt())
                .reviewNotes(r.getReviewNotes())
                .createdUserId(r.getCreatedUser() != null ? r.getCreatedUser().getId() : null)
                .createdAt(r.getCreatedAt())
                .build();
    }
}
