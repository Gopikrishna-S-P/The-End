package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.response.KeyFactStatementResponse;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.KeyFactStatement;
import com.recoverpro.server.entity.RestructureProposal;
import com.recoverpro.server.enums.KfsGenerationReason;
import com.recoverpro.server.enums.RestructureStatus;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.KeyFactStatementRepository;
import com.recoverpro.server.repository.RestructureProposalRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.service.KfsService;
import com.recoverpro.server.service.export.KfsPdfBuilder;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;

/**
 * Generates a Key Fact Statement disclosing an approved restructuring's revised terms (see
 * docs/superpowers/specs/2026-08-04-kfs-design.md). Generate-once, immutable -- a unique index on
 * restructure_proposal_id makes this idempotent: a repeat call returns the existing record rather
 * than erroring or duplicating.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class KfsServiceImpl implements KfsService {

    private final KeyFactStatementRepository kfsRepository;
    private final RestructureProposalRepository proposalRepository;
    private final AllocationRepository allocationRepository;
    private final OrgIsolationGuard orgIsolationGuard;

    private final KfsPdfBuilder pdfBuilder = new KfsPdfBuilder();

    @Value("${app.storage.kfs-path:./uploads/kfs}")
    private String kfsPath;

    @Override
    public KeyFactStatementResponse generate(UUID restructureProposalId, UUID actingUserId) {
        // Ownership must be verified BEFORE the idempotent-existing-KFS check below, otherwise a
        // caller could probe another org's KFS by guessing a restructureProposalId.
        RestructureProposal proposal = proposalRepository.findById(restructureProposalId)
                .orElseThrow(() -> new ResourceNotFoundException("RestructureProposal", restructureProposalId));
        if (!orgIsolationGuard.belongsToOrg(proposal.getOrganizationId())) {
            throw new ResourceNotFoundException("RestructureProposal", restructureProposalId);
        }

        var existing = kfsRepository.findByRestructureProposalId(restructureProposalId);
        if (existing.isPresent()) {
            log.info("KFS already exists for restructure proposal {}, returning existing: id={}",
                    restructureProposalId, existing.get().getId());
            return toResponse(existing.get());
        }

        if (proposal.getStatus() != RestructureStatus.APPROVED) {
            throw new BusinessException(
                    "Restructure proposal %s is in status %s; a KFS can only be generated once it is APPROVED"
                            .formatted(restructureProposalId, proposal.getStatus()));
        }

        Allocation allocation = allocationRepository.findByIdAndIsDeletedFalse(proposal.getAllocationId())
                .orElseThrow(() -> new ResourceNotFoundException("Allocation", proposal.getAllocationId()));

        KeyFactStatement kfs = buildFromProposal(proposal, allocation);

        String html = pdfBuilder.buildHtml(kfs, allocation.getLoanNumber(), allocation.getBorrowerName());
        kfs.setRenderedHtml(html);
        kfs.setContentSha256(sha256(html.getBytes(StandardCharsets.UTF_8)));

        byte[] pdfBytes;
        try {
            pdfBytes = pdfBuilder.buildPdf(kfs, allocation.getLoanNumber(), allocation.getBorrowerName());
        } catch (Exception e) {
            log.error("KFS PDF generation failed: proposal={}, error={}", restructureProposalId, e.getMessage(), e);
            throw new BusinessException("KFS PDF generation failed: " + e.getMessage());
        }
        kfs.setPdfSha256(sha256(pdfBytes));
        kfs.setPdfPath(storePdf(proposal.getOrganizationId(), restructureProposalId, pdfBytes));
        kfs.setGeneratedByUserId(actingUserId);

        try {
            KeyFactStatement saved = kfsRepository.save(kfs);
            log.info("KFS generated: id={}, restructureProposal={}, allocation={}",
                    saved.getId(), restructureProposalId, allocation.getId());
            return toResponse(saved);
        } catch (DataIntegrityViolationException e) {
            // Concurrent generate() calls raced the unique index -- the other one won, return its result.
            KeyFactStatement winner = kfsRepository.findByRestructureProposalId(restructureProposalId)
                    .orElseThrow(() -> e);
            log.info("KFS generation raced for restructure proposal {}, returning winner: id={}",
                    restructureProposalId, winner.getId());
            return toResponse(winner);
        }
    }

    private KeyFactStatement buildFromProposal(RestructureProposal proposal, Allocation allocation) {
        BigDecimal sanctionedAmount = allocation.getOutstandingAmount() != null
                ? allocation.getOutstandingAmount() : allocation.getTotalDue();
        BigDecimal emiAmount = proposal.getNewEmiAmount();
        Integer tenureMonths = proposal.getNewEmiCount();
        BigDecimal totalPayable = tenureMonths != null && emiAmount != null
                ? emiAmount.multiply(BigDecimal.valueOf(tenureMonths)) : null;
        BigDecimal totalInterestCharge = totalPayable != null && sanctionedAmount != null
                ? totalPayable.subtract(sanctionedAmount) : null;

        return KeyFactStatement.builder()
                .allocationId(allocation.getId())
                .organizationId(proposal.getOrganizationId())
                .restructureProposalId(proposal.getId())
                .versionLabel("v1")
                .isCurrent(true)
                .generationReason(KfsGenerationReason.RESTRUCTURING)
                .sanctionedAmount(sanctionedAmount)
                .netDisbursedAmount(null)
                .totalInterestCharge(totalInterestCharge)
                .processingFee(null)
                .otherCharges(null)
                .totalPayable(totalPayable)
                .aprPercent(proposal.getNewApr())
                .interestRatePercent(proposal.getNewApr())
                .interestType(null)
                .tenureMonths(tenureMonths)
                .emiAmount(emiAmount)
                .repaymentFrequency("MONTHLY")
                .penalChargesDescription(null)
                .coolingOffDays(null)
                .firstEmiDate(null)
                .lastEmiDate(null)
                .additionalFacts(Map.of(
                        "restructureProposalId", proposal.getId().toString(),
                        "originalApr", String.valueOf(proposal.getOriginalApr()),
                        "newApr", String.valueOf(proposal.getNewApr()),
                        "originalEmiAmount", String.valueOf(proposal.getOriginalEmiAmount()),
                        "newEmiAmount", String.valueOf(proposal.getNewEmiAmount())
                ))
                .build();
    }

    private String storePdf(UUID orgId, UUID restructureProposalId, byte[] pdfBytes) {
        try {
            Path dir = Paths.get(kfsPath, String.valueOf(orgId));
            Files.createDirectories(dir);
            Path filePath = dir.resolve("kfs_" + restructureProposalId + ".pdf");
            Files.write(filePath, pdfBytes);
            return filePath.toString();
        } catch (IOException e) {
            log.error("Failed to store KFS PDF: {}", e.getMessage(), e);
            throw new BusinessException("Failed to store KFS PDF: " + e.getMessage());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public KeyFactStatementResponse getById(UUID id) {
        return toResponse(requireById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public KeyFactStatementResponse getByRestructureProposalId(UUID restructureProposalId) {
        KeyFactStatement kfs = kfsRepository.findByRestructureProposalId(restructureProposalId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No KFS has been generated for restructure proposal " + restructureProposalId));
        if (!orgIsolationGuard.belongsToOrg(kfs.getOrganizationId())) {
            throw new ResourceNotFoundException(
                    "No KFS has been generated for restructure proposal " + restructureProposalId);
        }
        return toResponse(kfs);
    }

    @Override
    @Transactional(readOnly = true)
    public byte[] downloadPdf(UUID id) {
        KeyFactStatement kfs = requireById(id);
        try {
            return Files.readAllBytes(Paths.get(kfs.getPdfPath()));
        } catch (IOException e) {
            log.error("Failed to read KFS PDF: id={}, path={}, error={}", id, kfs.getPdfPath(), e.getMessage());
            throw new BusinessException("KFS PDF file not accessible: " + id);
        }
    }

    private KeyFactStatement requireById(UUID id) {
        KeyFactStatement kfs = kfsRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("KeyFactStatement", id));
        if (!orgIsolationGuard.belongsToOrg(kfs.getOrganizationId())) {
            throw new ResourceNotFoundException("KeyFactStatement", id);
        }
        return kfs;
    }

    private static String sha256(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(data));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    private KeyFactStatementResponse toResponse(KeyFactStatement k) {
        return KeyFactStatementResponse.builder()
                .id(k.getId())
                .allocationId(k.getAllocationId())
                .organizationId(k.getOrganizationId())
                .restructureProposalId(k.getRestructureProposalId())
                .versionLabel(k.getVersionLabel())
                .isCurrent(k.getIsCurrent())
                .generationReason(k.getGenerationReason())
                .sanctionedAmount(k.getSanctionedAmount())
                .netDisbursedAmount(k.getNetDisbursedAmount())
                .totalInterestCharge(k.getTotalInterestCharge())
                .processingFee(k.getProcessingFee())
                .otherCharges(k.getOtherCharges())
                .totalPayable(k.getTotalPayable())
                .aprPercent(k.getAprPercent())
                .interestRatePercent(k.getInterestRatePercent())
                .interestType(k.getInterestType())
                .tenureMonths(k.getTenureMonths())
                .emiAmount(k.getEmiAmount())
                .repaymentFrequency(k.getRepaymentFrequency())
                .penalChargesDescription(k.getPenalChargesDescription())
                .coolingOffDays(k.getCoolingOffDays())
                .firstEmiDate(k.getFirstEmiDate())
                .lastEmiDate(k.getLastEmiDate())
                .contentSha256(k.getContentSha256())
                .pdfSha256(k.getPdfSha256())
                .generatedByUserId(k.getGeneratedByUserId())
                .createdAt(k.getCreatedAt())
                .updatedAt(k.getUpdatedAt())
                .build();
    }
}
