package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.VisitApprovalRequest;
import com.recoverpro.server.dto.request.VisitLogRequest;
import com.recoverpro.server.dto.response.VisitLogResponse;
import com.recoverpro.server.entity.VisitLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface VisitLogService {

    VisitLogResponse create(VisitLogRequest request, MultipartFile image1, MultipartFile image2,
                            MultipartFile image3, UUID agentId, UUID createdBy);

    VisitLogResponse getById(UUID id);

    List<VisitLogResponse> getByAllocationId(UUID allocationId);

    List<VisitLogResponse> getByAgentId(UUID agentId);

    Page<VisitLogResponse> getByAgentIdPaged(UUID agentId, Pageable pageable);

    Page<VisitLogResponse> getByOrganizationIdPaged(UUID orgId, Pageable pageable);

    List<VisitLogResponse> getTodayVisits(UUID agentId);

    VisitLogResponse approveVisit(UUID visitId, VisitApprovalRequest request, UUID approvedBy);

    VisitLogResponse linkCollection(UUID visitId, UUID collectionId);

    VisitLogResponse linkPtp(UUID visitId, UUID ptpId);

    void softDelete(UUID id, UUID deletedBy);

    Optional<String> getLastVisitedAddress(UUID allocationId);

    Optional<Map<String, Object>> getLastLocation(UUID allocationId);

    VisitLog findVisitById(UUID id);

    String getAgentDisplayName(UUID agentId);

    String regenerateSignedUrl(UUID visitId, int imageSequence);
}
