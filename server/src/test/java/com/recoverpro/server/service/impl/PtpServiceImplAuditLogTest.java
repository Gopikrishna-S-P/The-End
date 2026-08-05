package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.request.CreatePtpRequest;
import com.recoverpro.server.dto.request.UpdatePtpStatusRequest;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.PtpAuditLog;
import com.recoverpro.server.entity.PtpRecord;
import com.recoverpro.server.enums.PtpStatus;
import com.recoverpro.server.mapper.PtpMapper;
import com.recoverpro.server.repository.*;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.service.VisitLogService;
import com.recoverpro.server.service.compliance.CoolingOffGuard;
import com.recoverpro.server.service.compliance.PtpEscalationService;
import com.recoverpro.server.service.compliance.SegmentActionPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Covers only the new PtpAuditLog wiring added inside recordHistory(),
 * shared by createPtp() and updatePtpStatus(). Pre-existing PTP business
 * logic (cooling-off, floor amount, escalation) is unchanged and untested here.
 */
@ExtendWith(MockitoExtension.class)
class PtpServiceImplAuditLogTest {

    @Mock private PtpRepository ptpRepository;
    @Mock private PtpHistoryRepository ptpHistoryRepository;
    @Mock private PtpAuditLogRepository ptpAuditLogRepository;
    @Mock private PtpMapper ptpMapper;
    @Mock private PtpNotificationService notificationService;
    @Mock private VisitLogService visitLogService;
    @Mock private AllocationRepository allocationRepository;
    @Mock private UserRepository userRepository;
    @Mock private CoolingOffGuard coolingOffGuard;
    @Mock private PtpEscalationService ptpEscalationService;
    @Mock private SegmentActionPolicy segmentActionPolicy;
    @Mock private BorrowerRiskScoreRepository borrowerRiskScoreRepository;
    @Mock private OrgIsolationGuard orgIsolationGuard;

    private PtpServiceImpl service;
    private UUID orgId;

    @BeforeEach
    void setUp() {
        service = new PtpServiceImpl(
                ptpRepository, ptpHistoryRepository, ptpAuditLogRepository, ptpMapper,
                notificationService, visitLogService, allocationRepository, userRepository,
                coolingOffGuard, ptpEscalationService, segmentActionPolicy,
                borrowerRiskScoreRepository, orgIsolationGuard);
        orgId = UUID.randomUUID();
    }

    @Test
    void createPtp_writesAuditLogWithCreatedAction() {
        UUID allocationId = UUID.randomUUID();
        UUID currentUserId = UUID.randomUUID();

        CreatePtpRequest request = CreatePtpRequest.builder()
                .allocationId(allocationId)
                .agentId(UUID.randomUUID())
                .agentName("Agent")
                .loanNumber("LN-1")
                .borrowerName("Borrower")
                .promisedDate(LocalDate.now().plusDays(3))
                .promisedAmount(new BigDecimal("500.00"))
                .build();

        PtpRecord entity = PtpRecord.builder()
                .allocationId(allocationId)
                .status(PtpStatus.PENDING)
                .promisedAmount(request.getPromisedAmount())
                .createdBy(currentUserId)
                .build();
        PtpRecord saved = PtpRecord.builder()
                .id(UUID.randomUUID())
                .allocationId(allocationId)
                .status(PtpStatus.PENDING)
                .promisedAmount(request.getPromisedAmount())
                .createdBy(currentUserId)
                .build();

        Organization org = new Organization();
        org.setId(orgId);
        Allocation allocation = Allocation.builder()
                .id(allocationId)
                .organization(org)
                .isDeleted(false)
                .build();

        when(allocationRepository.findByIdAndIsDeletedFalse(allocationId)).thenReturn(Optional.of(allocation));
        when(orgIsolationGuard.belongsToOrg(orgId)).thenReturn(true);
        when(ptpRepository.existsByAllocationIdAndStatusAndIsDeletedFalse(allocationId, PtpStatus.PENDING))
                .thenReturn(false);
        when(ptpMapper.toEntity(request, currentUserId)).thenReturn(entity);
        when(ptpRepository.save(entity)).thenReturn(saved);

        service.createPtp(request, currentUserId);

        ArgumentCaptor<PtpAuditLog> captor = ArgumentCaptor.forClass(PtpAuditLog.class);
        verify(ptpAuditLogRepository).save(captor.capture());
        PtpAuditLog log = captor.getValue();

        assertThat(log.getAction()).isEqualTo("CREATED");
        assertThat(log.getPtpId()).isEqualTo(saved.getId());
        assertThat(log.getAllocationId()).isEqualTo(allocationId);
        assertThat(log.getPreviousStatus()).isNull();
        assertThat(log.getNewStatus()).isEqualTo("PENDING");
        assertThat(log.getPerformedBy()).isEqualTo(currentUserId);
    }

    @Test
    void updatePtpStatus_writesAuditLogWithStatusChangedAction() {
        UUID ptpId = UUID.randomUUID();
        UUID allocationId = UUID.randomUUID();
        UUID currentUserId = UUID.randomUUID();

        PtpRecord record = PtpRecord.builder()
                .id(ptpId)
                .allocationId(allocationId)
                .status(PtpStatus.PENDING)
                .promisedAmount(new BigDecimal("1000.00"))
                .build();

        Organization org = new Organization();
        org.setId(orgId);
        Allocation allocation = Allocation.builder()
                .id(allocationId)
                .organization(org)
                .isDeleted(false)
                .build();

        when(ptpRepository.findByIdAndIsDeletedFalse(ptpId)).thenReturn(Optional.of(record));
        when(allocationRepository.findByIdAndIsDeletedFalse(allocationId)).thenReturn(Optional.of(allocation));
        when(orgIsolationGuard.belongsToOrg(orgId)).thenReturn(true);
        when(ptpRepository.save(record)).thenReturn(record);

        UpdatePtpStatusRequest request = UpdatePtpStatusRequest.builder()
                .newStatus(PtpStatus.FULFILLED)
                .collectedAmount(new BigDecimal("1000.00"))
                .build();

        service.updatePtpStatus(ptpId, request, currentUserId, "Manager Name");

        ArgumentCaptor<PtpAuditLog> captor = ArgumentCaptor.forClass(PtpAuditLog.class);
        verify(ptpAuditLogRepository).save(captor.capture());
        PtpAuditLog log = captor.getValue();

        assertThat(log.getAction()).isEqualTo("STATUS_CHANGED");
        assertThat(log.getPreviousStatus()).isEqualTo("PENDING");
        assertThat(log.getNewStatus()).isEqualTo("FULFILLED");
        assertThat(log.getPerformedBy()).isEqualTo(currentUserId);
    }
}
