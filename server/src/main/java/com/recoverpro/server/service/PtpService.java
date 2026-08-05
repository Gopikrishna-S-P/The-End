package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.CreatePtpRequest;
import com.recoverpro.server.dto.request.PtpFilterRequest;
import com.recoverpro.server.dto.request.UpdatePtpStatusRequest;
import com.recoverpro.server.dto.response.PtpHistoryResponse;
import com.recoverpro.server.dto.response.PtpResponse;
import com.recoverpro.server.dto.response.PtpStatisticsResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface PtpService {

    PtpResponse createPtp(CreatePtpRequest request, UUID currentUserId);

    PtpResponse getPtpById(UUID id);

    Page<PtpResponse> getAllPtps(PtpFilterRequest filter, Pageable pageable);

    List<PtpResponse> getPtpsByAllocationId(UUID allocationId);

    List<PtpResponse> getPtpsByAllocationIds(List<UUID> allocationIds);

    PtpResponse updatePtpStatus(UUID id, UpdatePtpStatusRequest request, UUID currentUserId, String currentUserName);

    void deletePtp(UUID id, UUID currentUserId);

    List<PtpHistoryResponse> getPtpHistory(UUID ptpId);

    List<PtpHistoryResponse> getFullAllocationHistory(UUID allocationId);

    PtpStatisticsResponse getAgentStatistics(UUID agentId);

    int autoMarkExpiredPtpsAsBroken();

    int sendDueDateReminders();
}
