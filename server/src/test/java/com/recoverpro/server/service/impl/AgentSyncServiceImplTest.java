package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.request.AgentSyncRequest;
import com.recoverpro.server.dto.request.CreatePtpRequest;
import com.recoverpro.server.dto.response.AgentSyncResponse;
import com.recoverpro.server.dto.response.PtpResponse;
import com.recoverpro.server.enums.PtpStatus;
import com.recoverpro.server.exception.PendingPtpAlreadyExistsException;
import com.recoverpro.server.service.CollectionService;
import com.recoverpro.server.service.PtpService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AgentSyncServiceImplTest {

    @Mock private CollectionService collectionService;
    @Mock private PtpService ptpService;

    private AgentSyncServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new AgentSyncServiceImpl(collectionService, ptpService);
    }

    @Test
    void process_ptpAlreadyExists_isReportedAsSuccessfulReplayNotFailure() {
        UUID allocationId = UUID.randomUUID();
        UUID actingUserId = UUID.randomUUID();
        UUID existingPtpId = UUID.randomUUID();

        CreatePtpRequest ptpRequest = new CreatePtpRequest();
        ptpRequest.setAllocationId(allocationId);

        AgentSyncRequest.Item item = AgentSyncRequest.Item.builder()
                .clientId("client-1").kind("PTP").ptp(ptpRequest).build();
        AgentSyncRequest request = AgentSyncRequest.builder().items(List.of(item)).build();

        when(ptpService.createPtp(ptpRequest, actingUserId))
                .thenThrow(new PendingPtpAlreadyExistsException("A pending PTP already exists for this allocation."));
        PtpResponse existingPending = PtpResponse.builder()
                .id(existingPtpId).allocationId(allocationId).status(PtpStatus.PENDING).build();
        when(ptpService.getPtpsByAllocationId(allocationId)).thenReturn(List.of(existingPending));

        AgentSyncResponse response = service.process(request, actingUserId);

        assertThat(response.getSucceeded()).isEqualTo(1);
        assertThat(response.getFailed()).isZero();
        AgentSyncResponse.ItemResult result = response.getResults().get(0);
        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getServerId()).isEqualTo(existingPtpId.toString());
    }

    @Test
    void process_ptpOtherBusinessError_stillReportedAsFailure() {
        UUID allocationId = UUID.randomUUID();
        UUID actingUserId = UUID.randomUUID();

        CreatePtpRequest ptpRequest = new CreatePtpRequest();
        ptpRequest.setAllocationId(allocationId);

        AgentSyncRequest.Item item = AgentSyncRequest.Item.builder()
                .clientId("client-2").kind("PTP").ptp(ptpRequest).build();
        AgentSyncRequest request = AgentSyncRequest.builder().items(List.of(item)).build();

        when(ptpService.createPtp(any(), any())).thenThrow(new IllegalArgumentException("boom"));

        AgentSyncResponse response = service.process(request, actingUserId);

        assertThat(response.getSucceeded()).isZero();
        assertThat(response.getFailed()).isEqualTo(1);
        assertThat(response.getResults().get(0).isSuccess()).isFalse();
    }
}
