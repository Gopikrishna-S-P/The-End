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

    /**
     * Finds a Borrower by CKYC id (preferred) or phone number, creating one only when a stable
     * identifier is present. Returns null when the caller supplies neither, since there is
     * nothing safe to dedupe an unidentified row against. Every writer that captures borrower
     * PII (file import, manual row entry) must resolve through here rather than persisting the
     * PII anywhere else, so a phone/email/CKYC value always ends up in the encrypted Borrower
     * columns instead of a plaintext dynamic-data column.
     */
    UUID resolveOrCreateBorrower(UUID organizationId, String ckycId, String phone, String email, String displayName);
}
