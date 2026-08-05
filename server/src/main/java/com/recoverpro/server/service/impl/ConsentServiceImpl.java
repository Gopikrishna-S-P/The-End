package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.GrantConsentRequest;
import com.recoverpro.server.dto.response.ConsentArtifactResponse;
import com.recoverpro.server.entity.Borrower;
import com.recoverpro.server.entity.ConsentArtifact;
import com.recoverpro.server.enums.ConsentPurpose;
import com.recoverpro.server.enums.ConsentScope;
import com.recoverpro.server.enums.ConsentStatus;
import com.recoverpro.server.repository.BorrowerRepository;
import com.recoverpro.server.repository.ConsentArtifactRepository;
import com.recoverpro.server.service.ConsentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ConsentServiceImpl implements ConsentService {

    public static final String REVOCATION_CHANNEL = "recoverpro:consent:revoked";

    private final ConsentArtifactRepository consentRepository;
    private final BorrowerRepository borrowerRepository;
    private final StringRedisTemplate redis;

    @Override
    public ConsentArtifactResponse grant(UUID borrowerId, GrantConsentRequest request, UUID actingUserId) {
        Borrower b = borrowerRepository.findById(borrowerId)
                .orElseThrow(() -> new ResourceNotFoundException("Borrower not found: " + borrowerId));

        consentRepository.findFirstByBorrowerIdAndPurposeAndScopeAndStatusOrderByGrantedAtDesc(
                        borrowerId, request.getPurpose(), request.getScope(), ConsentStatus.ACTIVE)
                .ifPresent(prior -> {
                    prior.setStatus(ConsentStatus.SUPERSEDED);
                    prior.setRevokedAt(Instant.now());
                    prior.setRevokedReason("superseded by new consent version " + request.getTermsVersion());
                    consentRepository.save(prior);
                });

        ConsentArtifact c = ConsentArtifact.builder()
                .borrowerId(borrowerId)
                .organizationId(b.getOrganizationId())
                .purpose(request.getPurpose())
                .scope(request.getScope())
                .termsText(request.getTermsText())
                .termsVersion(request.getTermsVersion())
                .evidenceRef(request.getEvidenceRef())
                .grantedAt(Instant.now())
                .expiresAt(request.getExpiresAt())
                .status(ConsentStatus.ACTIVE)
                .build();

        ConsentArtifact saved = consentRepository.save(c);
        log.info("Consent granted: borrower={}, purpose={}, scope={}, version={}, by={}",
                borrowerId, request.getPurpose(), request.getScope(), request.getTermsVersion(), actingUserId);
        return toResponse(saved);
    }

    @Override
    public void revoke(UUID borrowerId, ConsentPurpose purpose, ConsentScope scope, String reason) {
        consentRepository.findFirstByBorrowerIdAndPurposeAndScopeAndStatusOrderByGrantedAtDesc(
                        borrowerId, purpose, scope, ConsentStatus.ACTIVE)
                .ifPresent(active -> {
                    active.setStatus(ConsentStatus.REVOKED);
                    active.setRevokedAt(Instant.now());
                    active.setRevokedReason(reason);
                    consentRepository.save(active);
                    log.info("Consent revoked: borrower={}, purpose={}, scope={}", borrowerId, purpose, scope);
                    publishRevocation(borrowerId, purpose, scope);
                });
    }

    private void publishRevocation(UUID borrowerId, ConsentPurpose purpose, ConsentScope scope) {
        try {
            String msg = borrowerId + ":" + purpose.name() + ":" + scope.name();
            redis.convertAndSend(REVOCATION_CHANNEL, msg);
            log.debug("Published consent revocation: {}", msg);
        } catch (Exception e) {
            log.warn("Consent revocation pub/sub failed for {}: {}", borrowerId, e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConsentArtifactResponse> listForBorrower(UUID borrowerId) {
        return consentRepository.findByBorrowerIdOrderByGrantedAtDesc(borrowerId)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasActiveConsent(UUID borrowerId, ConsentPurpose purpose, ConsentScope scope) {
        Borrower b = borrowerRepository.findById(borrowerId).orElse(null);
        if (b == null || b.isErasurePending()) return false;
        List<ConsentArtifact> hits = consentRepository.findActiveConsents(
                borrowerId, purpose, scope, Instant.now());
        return !hits.isEmpty();
    }

    private ConsentArtifactResponse toResponse(ConsentArtifact c) {
        return ConsentArtifactResponse.builder()
                .id(c.getId())
                .borrowerId(c.getBorrowerId())
                .organizationId(c.getOrganizationId())
                .purpose(c.getPurpose())
                .scope(c.getScope())
                .termsText(c.getTermsText())
                .termsVersion(c.getTermsVersion())
                .signedHash(c.getSignedHash())
                .evidenceRef(c.getEvidenceRef())
                .grantedAt(c.getGrantedAt())
                .expiresAt(c.getExpiresAt())
                .revokedAt(c.getRevokedAt())
                .revokedReason(c.getRevokedReason())
                .status(c.getStatus())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
