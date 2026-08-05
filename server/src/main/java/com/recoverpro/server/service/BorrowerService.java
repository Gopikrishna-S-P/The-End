package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.CreateBorrowerRequest;
import com.recoverpro.server.dto.request.CreateErasureRequestRequest;
import com.recoverpro.server.dto.request.UpsertNomineeRequest;
import com.recoverpro.server.dto.response.BorrowerResponse;
import com.recoverpro.server.dto.response.DataErasureRequestResponse;
import com.recoverpro.server.dto.response.NomineeResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BorrowerService {

    BorrowerResponse create(CreateBorrowerRequest request);

    BorrowerResponse getById(UUID id);

    Page<BorrowerResponse> list(UUID organizationId, Pageable pageable);

    DataErasureRequestResponse requestErasure(
            UUID borrowerId, CreateErasureRequestRequest request, UUID actingUserId);

    List<DataErasureRequestResponse> listErasureRequests(UUID borrowerId);

    DataErasureRequestResponse executeErasure(UUID requestId, UUID reviewerUserId, String complianceNotes);

    NomineeResponse upsertNominee(UUID borrowerId, UpsertNomineeRequest request);

    Optional<NomineeResponse> getNominee(UUID borrowerId);
}
