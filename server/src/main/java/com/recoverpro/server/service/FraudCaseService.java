package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.CreateFraudCaseRequest;
import com.recoverpro.server.dto.request.TransitionFraudCaseRequest;
import com.recoverpro.server.dto.response.FraudCaseResponse;
import com.recoverpro.server.enums.FraudCaseStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface FraudCaseService {

    FraudCaseResponse create(CreateFraudCaseRequest request, UUID actingUserId);

    FraudCaseResponse transition(UUID id, TransitionFraudCaseRequest request, UUID actingUserId);

    FraudCaseResponse getById(UUID id);

    Page<FraudCaseResponse> list(UUID organizationId, FraudCaseStatus status, Pageable pageable);

    FraudCaseResponse runCfrLookup(UUID id, UUID actingUserId);
}
