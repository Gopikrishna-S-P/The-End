package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.CreateBorrowerRequest;
import com.recoverpro.server.dto.request.CreateErasureRequestRequest;
import com.recoverpro.server.dto.request.UpsertNomineeRequest;
import com.recoverpro.server.dto.response.BorrowerResponse;
import com.recoverpro.server.dto.response.DataErasureRequestResponse;
import com.recoverpro.server.dto.response.NomineeResponse;
import com.recoverpro.server.entity.Borrower;
import com.recoverpro.server.entity.DataErasureRequest;
import com.recoverpro.server.entity.NpaRecord;
import com.recoverpro.server.entity.PtpRecord;
import com.recoverpro.server.enums.ErasureRequestStatus;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.BorrowerRepository;
import com.recoverpro.server.repository.DataErasureRequestRepository;
import com.recoverpro.server.repository.NpaRecordRepository;
import com.recoverpro.server.repository.PtpRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.security.encryption.LookupHashService;
import com.recoverpro.server.service.BorrowerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class BorrowerServiceImpl implements BorrowerService {

    private final BorrowerRepository borrowerRepository;
    private final DataErasureRequestRepository erasureRepository;
    private final AllocationRepository allocationRepository;
    private final PtpRepository ptpRepository;
    private final NpaRecordRepository npaRecordRepository;
    private final LookupHashService lookupHashService;
    private final OrgIsolationGuard orgIsolationGuard;

    @Override
    public BorrowerResponse create(CreateBorrowerRequest request) {
        if (!orgIsolationGuard.belongsToOrg(request.getOrganizationId())) {
            throw new BusinessException("Access denied: organization mismatch");
        }

        if (request.getCkycId() != null && !request.getCkycId().isBlank()
                && borrowerRepository.findByOrganizationIdAndCkycIdLookupHash(
                        request.getOrganizationId(), lookupHashService.hash(request.getCkycId())).isPresent()) {
            throw new BusinessException(
                    "A borrower with CKYC ID " + request.getCkycId() + " already exists in this organization.");
        }

        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            String phoneHash = lookupHashService.hashPhone(request.getPhone());
            if (borrowerRepository.findByOrganizationIdAndPhoneLookupHash(
                    request.getOrganizationId(), phoneHash).isPresent()) {
                throw new BusinessException(
                        "A borrower with this phone number already exists in this organization.");
            }
        }

        Borrower b = Borrower.builder()
                .organizationId(request.getOrganizationId())
                .ckycId(request.getCkycId())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .address(request.getAddress())
                .build();
        Borrower saved;
        try {
            saved = borrowerRepository.save(b);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new BusinessException(
                    "A borrower with these identifiers already exists in this organization.");
        }
        log.info("Borrower created: id={}, org={}", saved.getId(), saved.getOrganizationId());
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public BorrowerResponse getById(UUID id) {
        return toResponse(load(id));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BorrowerResponse> list(UUID organizationId, Pageable pageable) {
        if (!orgIsolationGuard.belongsToOrg(organizationId)) {
            throw new BusinessException("Access denied: organization mismatch");
        }
        return borrowerRepository.findByOrganizationId(organizationId, pageable).map(this::toMaskedResponse);
    }

    @Override
    public DataErasureRequestResponse requestErasure(
            UUID borrowerId, CreateErasureRequestRequest request, UUID actingUserId) {
        Borrower b = load(borrowerId);
        if (!b.isErasurePending()) {
            b.setErasurePending(true);
            borrowerRepository.save(b);
        }
        DataErasureRequest er = DataErasureRequest.builder()
                .borrowerId(borrowerId)
                .organizationId(b.getOrganizationId())
                .requestedByUserId(actingUserId)
                .reason(request.getReason())
                .status(ErasureRequestStatus.REQUESTED)
                .build();
        DataErasureRequest saved = erasureRepository.save(er);
        log.info("Erasure request filed: id={}, borrower={}, by={}", saved.getId(), borrowerId, actingUserId);
        return toErasureResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DataErasureRequestResponse> listErasureRequests(UUID borrowerId) {
        load(borrowerId);
        return erasureRepository.findByBorrowerIdOrderByCreatedAtDesc(borrowerId)
                .stream().map(this::toErasureResponse).toList();
    }

    @Override
    public NomineeResponse upsertNominee(UUID borrowerId, UpsertNomineeRequest request) {
        Borrower b = load(borrowerId);
        b.setNomineeName(request.getNomineeName());
        b.setNomineeRelation(request.getNomineeRelation());
        b.setNomineePhone(request.getNomineePhone());
        b.setNomineeEmail(request.getNomineeEmail());
        b.setNomineeRecordedAt(Instant.now());
        Borrower saved = borrowerRepository.save(b);
        log.info("Nominee upserted for borrower {}", borrowerId);
        return toNomineeResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<NomineeResponse> getNominee(UUID borrowerId) {
        Borrower b = load(borrowerId);
        if (b.getNomineeName() == null || b.getNomineeName().isBlank()) return Optional.empty();
        return Optional.of(toNomineeResponse(b));
    }

    @Override
    public DataErasureRequestResponse executeErasure(UUID requestId, UUID reviewerUserId, String complianceNotes) {
        DataErasureRequest request = erasureRepository.findByIdForUpdate(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Erasure request not found: " + requestId));

        if (request.getStatus() == ErasureRequestStatus.PARTIALLY_EXECUTED
                || request.getStatus() == ErasureRequestStatus.REJECTED) {
            throw new BusinessException(
                    "Erasure request is already in terminal status: " + request.getStatus());
        }

        Borrower borrower = load(request.getBorrowerId());
        List<UUID> allocationIds = allocationRepository
                .findByBorrowerIdAndIsDeletedFalse(borrower.getId())
                .stream().map(a -> a.getId()).toList();

        borrower.setFirstName("[ERASED]");
        borrower.setLastName("[ERASED]");
        borrower.setEmail(null);
        borrower.setPhone(null);
        borrower.setAddress(null);
        borrower.setCkycId(null);
        borrower.setErasurePending(false);
        borrowerRepository.save(borrower);

        if (!allocationIds.isEmpty()) {
            List<PtpRecord> ptps = ptpRepository.findByAllocationIdIn(allocationIds);
            ptps.forEach(p -> p.setBorrowerName("[ERASED]"));
            ptpRepository.saveAll(ptps);

            List<NpaRecord> npas = npaRecordRepository.findByAllocationIdIn(allocationIds);
            npas.forEach(n -> n.setBorrowerName("[ERASED]"));
            npaRecordRepository.saveAll(npas);
        }

        request.setStatus(ErasureRequestStatus.PARTIALLY_EXECUTED);
        request.setReviewedByUserId(reviewerUserId);
        request.setReviewedAt(Instant.now());
        request.setExecutedAt(Instant.now());
        request.setComplianceNotes(complianceNotes != null ? complianceNotes
                : "PII anonymized. Financial records retained per RBI 8-10 year obligation.");
        DataErasureRequest saved = erasureRepository.save(request);

        log.info("Erasure executed: requestId={}, borrower={}, allocationCount={}, reviewer={}",
                requestId, request.getBorrowerId(), allocationIds.size(), reviewerUserId);
        return toErasureResponse(saved);
    }

    private Borrower load(UUID id) {
        Borrower b = borrowerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Borrower not found: " + id));
        if (!orgIsolationGuard.belongsToOrg(b.getOrganizationId())) {
            throw new ResourceNotFoundException("Borrower not found: " + id);
        }
        return b;
    }

    private BorrowerResponse toResponse(Borrower b) {
        return BorrowerResponse.builder()
                .id(b.getId())
                .organizationId(b.getOrganizationId())
                .ckycId(b.getCkycId())
                .firstName(b.getFirstName())
                .lastName(b.getLastName())
                .email(b.getEmail())
                .phone(b.getPhone())
                .address(b.getAddress())
                .erasurePending(b.isErasurePending())
                .createdAt(b.getCreatedAt())
                .updatedAt(b.getUpdatedAt())
                .build();
    }

    private BorrowerResponse toMaskedResponse(Borrower b) {
        return BorrowerResponse.builder()
                .id(b.getId())
                .organizationId(b.getOrganizationId())
                .ckycId(b.getCkycId())
                .firstName(b.getFirstName())
                .lastName(b.getLastName())
                .email(maskEmail(b.getEmail()))
                .phone(maskPhone(b.getPhone()))
                .address(b.getAddress())
                .erasurePending(b.isErasurePending())
                .createdAt(b.getCreatedAt())
                .updatedAt(b.getUpdatedAt())
                .build();
    }

    private NomineeResponse toNomineeResponse(Borrower b) {
        return NomineeResponse.builder()
                .borrowerId(b.getId())
                .nomineeName(b.getNomineeName())
                .nomineeRelation(b.getNomineeRelation())
                .nomineePhone(b.getNomineePhone())
                .nomineeEmail(b.getNomineeEmail())
                .recordedAt(b.getNomineeRecordedAt())
                .build();
    }

    private DataErasureRequestResponse toErasureResponse(DataErasureRequest er) {
        return DataErasureRequestResponse.builder()
                .id(er.getId())
                .borrowerId(er.getBorrowerId())
                .organizationId(er.getOrganizationId())
                .requestedByUserId(er.getRequestedByUserId())
                .reason(er.getReason())
                .status(er.getStatus())
                .complianceNotes(er.getComplianceNotes())
                .reviewedByUserId(er.getReviewedByUserId())
                .reviewedAt(er.getReviewedAt())
                .executedAt(er.getExecutedAt())
                .createdAt(er.getCreatedAt())
                .updatedAt(er.getUpdatedAt())
                .build();
    }

    private static String maskPhone(String phone) {
        if (phone == null || phone.length() < 4) return phone;
        return "****" + phone.substring(phone.length() - 4);
    }

    private static String maskEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        int at = email.indexOf('@');
        String local = email.substring(0, at);
        String domain = email.substring(at);
        if (local.length() <= 1) return email;
        return local.charAt(0) + "****" + domain;
    }
}
