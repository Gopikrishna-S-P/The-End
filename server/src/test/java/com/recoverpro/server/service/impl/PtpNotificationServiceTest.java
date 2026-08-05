package com.recoverpro.server.service.impl;

import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.PtpRecord;
import com.recoverpro.server.enums.NotificationType;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PtpNotificationServiceTest {

    @Mock private NotificationService notificationService;
    @Mock private AllocationRepository allocationRepository;

    private PtpNotificationService service;

    @BeforeEach
    void setUp() {
        service = new PtpNotificationService(notificationService, allocationRepository);
    }

    @Test
    void sendPtpReminderToAgent_createsRealNotificationNotJustALogLine() {
        UUID agentId = UUID.randomUUID();
        UUID allocationId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();

        PtpRecord ptp = PtpRecord.builder()
                .id(UUID.randomUUID())
                .allocationId(allocationId)
                .agentId(agentId)
                .agentName("Agent")
                .loanNumber("LN-1")
                .borrowerName("Borrower")
                .promisedDate(LocalDate.now().plusDays(1))
                .promisedAmount(new BigDecimal("500"))
                .build();

        Organization org = new Organization();
        org.setId(orgId);
        Allocation allocation = Allocation.builder().id(allocationId).organization(org).build();
        when(allocationRepository.findByIdAndIsDeletedFalse(allocationId)).thenReturn(Optional.of(allocation));

        service.sendPtpReminderToAgent(ptp);

        verify(notificationService).create(eq(agentId), eq(orgId), eq(NotificationType.FO_PTP_EXPIRING_SOON),
                any(String.class), any(String.class));
    }
}
