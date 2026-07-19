package com.recoverpro.server.service;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.entity.MessageTemplate;
import com.recoverpro.server.enums.Channel;
import com.recoverpro.server.enums.MessageTemplateStatus;
import com.recoverpro.server.repository.MessageTemplateRepository;
import com.recoverpro.server.service.compliance.TemplateAbuseLinter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

/**
 * Maker-checker activation for cadence templates (design-doc §4.6).
 *
 * Activation rules (fail-closed):
 *   1. {@code approverUserId != createdByUserId} (separation-of-duties).
 *   2. SMS templates: {@code dlt_template_id} + {@code category} required.
 *   3. WHATSAPP templates: {@code whatsapp_namespace} required.
 *   4. EMAIL: subject required.
 *   5. Status flow: DRAFT or PENDING_DLT → ACTIVE. Other transitions throw.
 *
 * Retirement is a one-way ACTIVE → RETIRED with no further restrictions --
 * retired rows still serve as audit history; new sends pick up the next
 * ACTIVE version under the same templateKey.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MessageTemplateService {

    private final MessageTemplateRepository repository;
    private final TemplateAbuseLinter abuseLinter;

    @Transactional(readOnly = true)
    public Page<MessageTemplate> findAll(UUID organizationId, MessageTemplateStatus status,
                                          Channel channel, Pageable pageable) {
        return repository.findWithFilters(organizationId, status, channel, pageable);
    }

    @Transactional(readOnly = true)
    public MessageTemplate findById(UUID organizationId, UUID templateId) {
        return repository.findByIdAndOrganizationId(templateId, organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found: " + templateId));
    }

    @Transactional
    public MessageTemplate activate(UUID templateId, UUID approverUserId) {
        MessageTemplate t = repository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Template not found: " + templateId));

        // 1. Separation of duties.
        if (approverUserId == null) {
            throw new BusinessException("Activator user id required");
        }
        if (approverUserId.equals(t.getCreatedByUserId())) {
            throw new BusinessException(
                    "Maker-checker violated: a template cannot be activated by its creator");
        }

        // 2-4. Per-channel field validation.
        validateForActivation(t);

        // 5. Status flow.
        MessageTemplateStatus current = t.getStatus();
        if (current != MessageTemplateStatus.DRAFT
                && current != MessageTemplateStatus.PENDING_DLT) {
            throw new BusinessException(
                    "Template " + templateId + " cannot be activated from status " + current);
        }

        t.setStatus(MessageTemplateStatus.ACTIVE);
        t.setApprovedByUserId(approverUserId);
        t.setApprovedAt(Instant.now());
        MessageTemplate saved = repository.save(t);
        log.info("Template activated: id={}, key={}, version={}, channel={}, approver={}",
                saved.getId(), saved.getTemplateKey(), saved.getVersion(),
                saved.getChannel(), approverUserId);
        return saved;
    }

    @Transactional
    public MessageTemplate submitForDlt(UUID templateId, UUID actingUserId) {
        MessageTemplate t = repository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Template not found: " + templateId));
        if (t.getStatus() != MessageTemplateStatus.DRAFT) {
            throw new BusinessException(
                    "Only DRAFT templates can be submitted for DLT review (current=" + t.getStatus() + ")");
        }
        t.setStatus(MessageTemplateStatus.PENDING_DLT);
        return repository.save(t);
    }

    @Transactional
    public MessageTemplate retire(UUID templateId, UUID actingUserId) {
        MessageTemplate t = repository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Template not found: " + templateId));
        if (t.getStatus() == MessageTemplateStatus.RETIRED) {
            return t; // idempotent
        }
        t.setStatus(MessageTemplateStatus.RETIRED);
        return repository.save(t);
    }

    private void validateForActivation(MessageTemplate t) {
        Channel ch = t.getChannel();
        if (ch == null) throw new BusinessException("Template channel is null");

        if (ch == Channel.SMS) {
            if (isBlank(t.getDltTemplateId())) {
                throw new BusinessException(
                        "SMS template activation requires dlt_template_id (TRAI DLT registration)");
            }
            if (isBlank(t.getCategory())) {
                throw new BusinessException(
                        "SMS template activation requires DLT category (SERVICE / SERVICE_IMPLICIT / SERVICE_EXPLICIT / PROMOTIONAL)");
            }
        }
        if (ch == Channel.WHATSAPP) {
            if (isBlank(t.getWhatsappNamespace())) {
                throw new BusinessException(
                        "WhatsApp template activation requires whatsapp_namespace (Meta Business Platform approval)");
            }
        }
        if (ch == Channel.EMAIL) {
            if (isBlank(t.getSubject())) {
                throw new BusinessException(
                        "EMAIL template activation requires a non-blank subject");
            }
        }
        if (isBlank(t.getBody())) {
            throw new BusinessException("Template body cannot be blank on activation");
        }
        if (isBlank(t.getLanguage())) {
            throw new BusinessException("Template language cannot be blank on activation");
        }

        // RBI Recovery Agent Code of Conduct -- no abusive language. Lint
        // both the body and (when present) the subject. Reject activation
        // on any hit so the offending phrase is fixed in DRAFT, not in prod.
        Set<String> bodyHits = abuseLinter.scan(t.getBody());
        Set<String> subjHits = isBlank(t.getSubject()) ? Set.of() : abuseLinter.scan(t.getSubject());
        if (!bodyHits.isEmpty() || !subjHits.isEmpty()) {
            throw new BusinessException(
                    "Template activation blocked by no-harassment lint. Tokens flagged: "
                            + bodyHits + (subjHits.isEmpty() ? "" : " (subject: " + subjHits + ")"));
        }
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
