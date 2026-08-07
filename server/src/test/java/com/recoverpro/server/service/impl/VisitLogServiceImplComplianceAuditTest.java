package com.recoverpro.server.service.impl;

import com.recoverpro.server.client.ClamAvScannerClient;
import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.dto.request.VisitLogRequest;
import com.recoverpro.server.enums.GuardType;
import com.recoverpro.server.mapper.VisitLogMapper;
import com.recoverpro.server.repository.AllocationAuditLogRepository;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.repository.VisitImageRepository;
import com.recoverpro.server.repository.VisitLogRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.service.UserActionAuditService;
import com.recoverpro.server.service.CallingHoursGuard;
import com.recoverpro.server.service.NotificationService;
import com.recoverpro.server.service.compliance.ComplianceAuditService;
import com.recoverpro.server.service.storage.StoragePort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * SYSTEM-PLAN SP28: the calling-hours guard denial in VisitLogServiceImpl.create threw a
 * BusinessException but never persisted a ComplianceDecision row.
 */
@ExtendWith(MockitoExtension.class)
class VisitLogServiceImplComplianceAuditTest {

    @Mock private VisitLogRepository visitLogRepository;
    @Mock private VisitLogMapper visitLogMapper;
    @Mock private AllocationRepository allocationRepository;
    @Mock private AllocationAuditLogRepository allocationAuditLogRepository;
    @Mock private UserRepository userRepository;
    @Mock private VisitImageRepository visitImageRepository;
    @Mock private CallingHoursGuard callingHoursGuard;
    @Mock private UserActionAuditService auditLogService;
    @Mock private OrgIsolationGuard orgIsolationGuard;
    @Mock private ClamAvScannerClient clamAvScannerClient;
    @Mock private ComplianceAuditService complianceAuditService;
    @Mock private StoragePort storagePort;
    @Mock private NotificationService notificationService;

    private VisitLogServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new VisitLogServiceImpl(visitLogRepository, visitLogMapper, allocationRepository,
                allocationAuditLogRepository, userRepository, visitImageRepository, callingHoursGuard,
                auditLogService, orgIsolationGuard, clamAvScannerClient, complianceAuditService, storagePort,
                notificationService);
    }

    @Test
    void create_outsideCallingHoursNoOverride_recordsDenialThenThrows() {
        UUID allocationId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        UUID agentId = UUID.randomUUID();

        VisitLogRequest request = new VisitLogRequest();
        request.setAllocationId(allocationId);
        request.setOrganizationId(orgId);

        when(callingHoursGuard.denialReason(eq(orgId), any())).thenReturn("outside calling hours 08:00-19:00");

        MockMultipartFile image1 = new MockMultipartFile("image1", "photo.jpg", "image/jpeg", "data".getBytes());

        assertThatThrownBy(() -> service.create(request, image1, null, null, agentId, agentId))
                .isInstanceOf(BusinessException.class);

        verify(complianceAuditService).record(eq(GuardType.CALLING_HOURS), eq(allocationId), eq(orgId),
                eq(agentId), eq("VISIT_LOG_CREATE"), any());
    }
}
