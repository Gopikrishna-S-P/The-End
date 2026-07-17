package com.recoverpro.server.service.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.recoverpro.server.common.dto.response.PagedResponse;
import com.recoverpro.server.dto.response.MyAssignedCaseResponse;
import com.recoverpro.server.dto.response.PtpResponse;
import com.recoverpro.server.dto.response.VisitLogResponse;
import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.PtpStatus;
import com.recoverpro.server.service.AssignmentService;
import com.recoverpro.server.service.CallingHoursGuard;
import com.recoverpro.server.service.PtpService;
import com.recoverpro.server.service.VisitLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContextAssemblerTest {

    @Mock private AssignmentService assignmentService;
    @Mock private VisitLogService visitLogService;
    @Mock private PtpService ptpService;
    @Mock private CallingHoursGuard callingHoursGuard;

    private ContextAssembler assembler;
    private UUID agentId;
    private UUID orgId;

    @BeforeEach
    void setUp() {
        assembler = new ContextAssembler(assignmentService, visitLogService, ptpService, callingHoursGuard,
                new ObjectMapper());
        agentId = UUID.randomUUID();
        orgId = UUID.randomUUID();
        lenient().when(callingHoursGuard.isAllowedFor(any(), any())).thenReturn(true);
    }

    @Test
    void assembleFor_includesLoanNumberAndAmounts_notObjectIdentityHash() {
        UUID allocationId = UUID.randomUUID();
        MyAssignedCaseResponse caseResponse = MyAssignedCaseResponse.builder()
                .allocationId(allocationId)
                .loanNumber("LN-12345")
                .borrowerName("Jane Doe")
                .outstandingAmount(new BigDecimal("15000"))
                .totalDue(new BigDecimal("20000"))
                .allocationStatus(AllocationStatus.ASSIGNED)
                .npaFlagged(false)
                .dynamicData(Map.of("raw_pii_column", "should-never-appear"))
                .build();
        when(assignmentService.getMyActiveCases(any(), any(), any()))
                .thenReturn(PagedResponse.<MyAssignedCaseResponse>builder()
                        .content(List.of(caseResponse)).totalElements(1).build());

        PtpResponse ptp = PtpResponse.builder()
                .allocationId(allocationId)
                .loanNumber("LN-12345")
                .borrowerName("Jane Doe")
                .promisedAmount(new BigDecimal("5000"))
                .promisedDate(LocalDate.now().plusDays(3))
                .status(PtpStatus.PENDING)
                .build();
        when(ptpService.getPtpsByAllocationIds(any())).thenReturn(List.of(ptp));

        when(visitLogService.getTodayVisits(agentId)).thenReturn(List.of());

        String context = assembler.assembleFor(agentId, orgId);

        assertThat(context).contains("LN-12345");
        assertThat(context).contains("Jane Doe");
        assertThat(context).contains("15000");
        assertThat(context).doesNotContain("should-never-appear");
        assertThat(context).doesNotContainPattern("@[0-9a-f]{6,8}");
    }

    @Test
    void assembleFor_extractsAllocationIdsForEveryActiveCase_viaDirectGetter() {
        // SYSTEM-PLAN SP41: this extraction used to go through reflection
        // (c.getClass().getMethod("getAllocationId").invoke(c)) wrapped in a swallow-all try/catch,
        // so a broken lookup would silently drop cases from the PTP query instead of failing loudly.
        UUID allocA = UUID.randomUUID();
        UUID allocB = UUID.randomUUID();
        MyAssignedCaseResponse caseA = MyAssignedCaseResponse.builder()
                .allocationId(allocA).loanNumber("LN-A").borrowerName("A")
                .allocationStatus(AllocationStatus.ASSIGNED).build();
        MyAssignedCaseResponse caseB = MyAssignedCaseResponse.builder()
                .allocationId(allocB).loanNumber("LN-B").borrowerName("B")
                .allocationStatus(AllocationStatus.ASSIGNED).build();
        when(assignmentService.getMyActiveCases(any(), any(), any()))
                .thenReturn(PagedResponse.<MyAssignedCaseResponse>builder()
                        .content(List.of(caseA, caseB)).totalElements(2).build());
        when(ptpService.getPtpsByAllocationIds(any())).thenReturn(List.of());
        when(visitLogService.getTodayVisits(agentId)).thenReturn(List.of());

        assembler.assembleFor(agentId, orgId);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<UUID>> captor = ArgumentCaptor.forClass(List.class);
        verify(ptpService).getPtpsByAllocationIds(captor.capture());
        assertThat(captor.getValue()).containsExactly(allocA, allocB);
    }
}
