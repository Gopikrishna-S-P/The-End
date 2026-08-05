package com.recoverpro.server.service;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.CreatePaymentIntentRequest;
import com.recoverpro.server.dto.request.CreatePaymentLinkRequest;
import com.recoverpro.server.dto.response.PaymentIntentResponse;
import com.recoverpro.server.dto.response.PaymentLinkResponse;
import com.recoverpro.server.entity.PaymentIntent;
import com.recoverpro.server.entity.PaymentLink;
import com.recoverpro.server.enums.PaymentIntentStatus;
import com.recoverpro.server.enums.PaymentRail;
import com.recoverpro.server.repository.PaymentIntentRepository;
import com.recoverpro.server.repository.PaymentLinkRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class PaymentLinkService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String TOKEN_ALPHABET =
            "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int TOKEN_LEN = 16;

    private final PaymentIntentRepository intentRepository;
    private final PaymentLinkRepository linkRepository;
    private final OrgIsolationGuard orgIsolationGuard;

    @Value("${app.payment.upi.payee-vpa:}")
    private String upiPayeeVpa;

    @Value("${app.payment.upi.payee-name:RecoverPro}")
    private String upiPayeeName;

    @Value("${app.payment.short-url-base:https://pay.recoverpro.local/p/}")
    private String shortUrlBase;

    public PaymentIntentResponse createIntent(
            CreatePaymentIntentRequest request, UUID actingUserId, String idempotencyKey) {

        // RLS's WITH CHECK (V040, USING doubles as WITH CHECK since none is separately given)
        // already rejects an INSERT whose organization_id doesn't match the caller's session --
        // but as a raw DataIntegrityViolationException/500, not a clean 4xx. This check exists so
        // a cross-org attempt fails the same clean way every other isolation check in this
        // codebase does, not to provide isolation RLS doesn't already guarantee.
        if (!orgIsolationGuard.belongsToOrg(request.getOrganizationId())) {
            throw new ResourceNotFoundException("Organization not found: " + request.getOrganizationId());
        }

        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            var existing = intentRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                log.info("Idempotent replay of payment intent: key={}, intentId={}",
                        idempotencyKey, existing.get().getId());
                return toIntentResponse(existing.get());
            }
        }

        Instant expires = request.getExpiresAt() != null
                ? request.getExpiresAt()
                : Instant.now().plus(7, ChronoUnit.DAYS);

        PaymentIntent intent = PaymentIntent.builder()
                .organizationId(request.getOrganizationId())
                .allocationId(request.getAllocationId())
                .borrowerId(request.getBorrowerId())
                .amount(request.getAmount())
                .currency("INR")
                .purpose(request.getPurpose())
                .status(PaymentIntentStatus.CREATED)
                .expiresAt(expires)
                .idempotencyKey(idempotencyKey)
                .createdByUserId(actingUserId)
                .build();
        PaymentIntent saved = intentRepository.save(intent);
        log.info("Payment intent created: id={}, allocation={}, amount={}",
                saved.getId(), saved.getAllocationId(), saved.getAmount());
        return toIntentResponse(saved);
    }

    @Transactional(readOnly = true)
    public PaymentIntentResponse getIntent(UUID id) {
        return intentRepository.findById(id)
                .map(this::toIntentResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Intent not found: " + id));
    }

    public PaymentLinkResponse createLink(CreatePaymentLinkRequest request, UUID actingUserId) {
        PaymentIntent intent = intentRepository.findById(request.getIntentId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Intent not found: " + request.getIntentId()));
        // RLS already scopes this SELECT to the caller's own org (a foreign-org id comes back
        // empty above, not found here), but this explicit check keeps the isolation guarantee for
        // this write path from depending entirely on the read that happened to precede it.
        if (!orgIsolationGuard.belongsToOrg(intent.getOrganizationId())) {
            throw new ResourceNotFoundException("Intent not found: " + request.getIntentId());
        }
        if (intent.getStatus() != PaymentIntentStatus.CREATED
                && intent.getStatus() != PaymentIntentStatus.AUTHORIZED) {
            throw new BusinessException("Cannot issue link for intent in status " + intent.getStatus());
        }

        String targetUri = buildTargetUri(intent, request.getRail());

        Instant expires = (request.getExpiresAt() == null || request.getExpiresAt().isAfter(intent.getExpiresAt()))
                ? intent.getExpiresAt()
                : request.getExpiresAt();

        String token = generateUniqueToken();
        PaymentLink link = PaymentLink.builder()
                .intentId(intent.getId())
                .token(token)
                .targetUri(targetUri)
                .issuedViaChannel(request.getIssuedViaChannel())
                .singleUse(true)
                .expiresAt(expires)
                .createdByUserId(actingUserId)
                .build();
        PaymentLink saved = linkRepository.save(link);
        log.info("Payment link issued: token={}, intent={}, rail={}",
                token, intent.getId(), request.getRail());
        return toLinkResponse(saved);
    }

    @Transactional
    public PaymentLinkResponse resolveAndConsume(String token) {
        Instant now = Instant.now();
        int updated = linkRepository.atomicConsume(token, now);
        if (updated == 0) {
            log.info("Link not consumable (expired or already used): token={}", token);
            return null;
        }
        return linkRepository.findByToken(token).map(this::toLinkResponse).orElse(null);
    }

    private String buildTargetUri(PaymentIntent intent, PaymentRail rail) {
        if (rail == PaymentRail.UPI) {
            if (upiPayeeVpa == null || upiPayeeVpa.isBlank()) {
                throw new BusinessException(
                        "UPI payee VPA not configured (app.payment.upi.payee-vpa)");
            }
            String tr = "RP" + intent.getId().toString().replace("-", "").substring(0, 12).toUpperCase();
            return "upi://pay"
                    + "?pa=" + enc(upiPayeeVpa)
                    + "&pn=" + enc(upiPayeeName)
                    + "&am=" + intent.getAmount().toPlainString()
                    + "&cu=INR"
                    + "&tr=" + enc(tr)
                    + "&tn=" + enc(intent.getPurpose() == null ? "Loan repayment" : intent.getPurpose());
        }
        throw new BusinessException(
                "Server-side link generation not implemented for rail " + rail);
    }

    private String generateUniqueToken() {
        for (int attempt = 0; attempt < 8; attempt++) {
            String t = randomToken(TOKEN_LEN);
            if (!linkRepository.existsByToken(t)) return t;
        }
        return randomToken(TOKEN_LEN + 6);
    }

    private static String randomToken(int len) {
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++)
            sb.append(TOKEN_ALPHABET.charAt(RANDOM.nextInt(TOKEN_ALPHABET.length())));
        return sb.toString();
    }

    private static String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }

    private PaymentIntentResponse toIntentResponse(PaymentIntent i) {
        return PaymentIntentResponse.builder()
                .id(i.getId())
                .organizationId(i.getOrganizationId())
                .allocationId(i.getAllocationId())
                .borrowerId(i.getBorrowerId())
                .amount(i.getAmount())
                .currency(i.getCurrency())
                .purpose(i.getPurpose())
                .status(i.getStatus())
                .expiresAt(i.getExpiresAt())
                .idempotencyKey(i.getIdempotencyKey())
                .createdAt(i.getCreatedAt())
                .build();
    }

    private PaymentLinkResponse toLinkResponse(PaymentLink l) {
        return PaymentLinkResponse.builder()
                .id(l.getId())
                .intentId(l.getIntentId())
                .token(l.getToken())
                .shortUrl(shortUrlBase + l.getToken())
                .targetUri(l.getTargetUri())
                .issuedViaChannel(l.getIssuedViaChannel())
                .singleUse(l.isSingleUse())
                .expiresAt(l.getExpiresAt())
                .consumedAt(l.getConsumedAt())
                .createdAt(l.getCreatedAt())
                .build();
    }
}
