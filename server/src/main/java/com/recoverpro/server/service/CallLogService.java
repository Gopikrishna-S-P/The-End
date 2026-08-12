package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.CompleteCallRequest;
import com.recoverpro.server.dto.response.CallLogResponse;
import com.recoverpro.server.dto.response.CallStartResponse;
import com.recoverpro.server.enums.CallOutcome;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface CallLogService {

    CallStartResponse startCall(UUID allocationId, UUID agentId, UUID organizationId);

    void attachRecording(UUID callLogId, UUID organizationId, MultipartFile file);

    CallLogResponse completeCall(UUID callLogId, UUID organizationId, CompleteCallRequest request);

    List<CallLogResponse> getByAllocation(UUID allocationId, UUID organizationId);

    Page<CallLogResponse> getForOrg(UUID organizationId, UUID agentId, CallOutcome outcome,
                                     Instant fromDate, Instant toDate, Pageable pageable);

    Resource downloadRecording(UUID callLogId, UUID organizationId);
}
