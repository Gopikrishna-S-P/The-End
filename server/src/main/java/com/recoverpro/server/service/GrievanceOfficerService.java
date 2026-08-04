package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.UpsertGrievanceOfficerRequest;
import com.recoverpro.server.dto.response.GrievanceOfficerResponse;

import java.util.UUID;

public interface GrievanceOfficerService {

    GrievanceOfficerResponse upsert(UUID organizationId, UpsertGrievanceOfficerRequest request, UUID actingUserId);

    GrievanceOfficerResponse getByOrganization(UUID organizationId);
}
