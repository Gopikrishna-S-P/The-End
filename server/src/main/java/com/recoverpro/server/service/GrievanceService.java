package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.AcknowledgeGrievanceRequest;
import com.recoverpro.server.dto.request.EscalateGrievanceRequest;
import com.recoverpro.server.dto.request.InvestigateGrievanceRequest;
import com.recoverpro.server.dto.request.RaiseGrievanceRequest;
import com.recoverpro.server.dto.request.ResolveGrievanceRequest;
import com.recoverpro.server.dto.response.GrievanceResponse;
import com.recoverpro.server.enums.GrievanceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface GrievanceService {

    GrievanceResponse raise(RaiseGrievanceRequest request, UUID organizationId, UUID actingUserId);

    GrievanceResponse acknowledge(UUID id, AcknowledgeGrievanceRequest request, UUID actingUserId);

    GrievanceResponse investigate(UUID id, InvestigateGrievanceRequest request, UUID actingUserId);

    GrievanceResponse escalate(UUID id, EscalateGrievanceRequest request, UUID actingUserId);

    GrievanceResponse resolve(UUID id, ResolveGrievanceRequest request, UUID actingUserId);

    GrievanceResponse close(UUID id, UUID actingUserId);

    GrievanceResponse getById(UUID id);

    List<GrievanceResponse> getByAllocationId(UUID allocationId);

    Page<GrievanceResponse> getByOrganization(UUID organizationId, GrievanceStatus status, Pageable pageable);
}
