package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.CreateRestructureProposalRequest;
import com.recoverpro.server.dto.request.RestructureBorrowerAcceptRequest;
import com.recoverpro.server.dto.request.RestructureRejectRequest;
import com.recoverpro.server.dto.response.RestructureProposalResponse;
import com.recoverpro.server.enums.RestructureStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface RestructureProposalService {

    RestructureProposalResponse draft(CreateRestructureProposalRequest request, UUID draftedByUserId);

    RestructureProposalResponse proposeToLender(UUID id, UUID actingUserId);

    RestructureProposalResponse lenderApprove(UUID id, UUID actingUserId);

    RestructureProposalResponse lenderReject(UUID id, RestructureRejectRequest request, UUID actingUserId);

    RestructureProposalResponse borrowerAccept(UUID id, RestructureBorrowerAcceptRequest request);

    RestructureProposalResponse getById(UUID id);

    List<RestructureProposalResponse> getByAllocationId(UUID allocationId);

    Page<RestructureProposalResponse> getByOrganization(UUID organizationId, RestructureStatus status, Pageable pageable);
}
