package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.CreateSettlementOfferRequest;
import com.recoverpro.server.dto.request.SettlementBorrowerAcceptRequest;
import com.recoverpro.server.dto.request.SettlementMarkPaidRequest;
import com.recoverpro.server.dto.request.SettlementRejectRequest;
import com.recoverpro.server.dto.response.SettlementOfferResponse;
import com.recoverpro.server.enums.SettlementOfferStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface SettlementOfferService {

    SettlementOfferResponse draft(CreateSettlementOfferRequest request, UUID draftedByUserId);

    SettlementOfferResponse approve(UUID id, UUID actingUserId, boolean actingUserIsOrgLevel);

    SettlementOfferResponse reject(UUID id, SettlementRejectRequest request, UUID actingUserId);

    SettlementOfferResponse propose(UUID id, UUID actingUserId);

    SettlementOfferResponse borrowerAccept(UUID id, SettlementBorrowerAcceptRequest request, UUID actingUserId);

    SettlementOfferResponse markPaid(UUID id, SettlementMarkPaidRequest request, UUID actingUserId);

    SettlementOfferResponse getById(UUID id);

    List<SettlementOfferResponse> getByAllocationId(UUID allocationId);

    Page<SettlementOfferResponse> getByOrganization(UUID organizationId, SettlementOfferStatus status, Pageable pageable);

    /** Marks PROPOSED offers past validityUntil as EXPIRED. Returns how many were flipped. */
    int expireOverdueOffers();
}
