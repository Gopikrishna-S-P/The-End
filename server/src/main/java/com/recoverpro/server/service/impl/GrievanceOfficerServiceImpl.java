package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.UpsertGrievanceOfficerRequest;
import com.recoverpro.server.dto.response.GrievanceOfficerResponse;
import com.recoverpro.server.entity.GrievanceOfficer;
import com.recoverpro.server.repository.GrievanceOfficerRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.service.GrievanceOfficerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/** One GRO record per org (uq_grievance_officer_org) -- upsert, no workflow. */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class GrievanceOfficerServiceImpl implements GrievanceOfficerService {

    private final GrievanceOfficerRepository repository;
    private final OrgIsolationGuard orgIsolationGuard;

    @Override
    public GrievanceOfficerResponse upsert(UUID organizationId, UpsertGrievanceOfficerRequest request, UUID actingUserId) {
        GrievanceOfficer officer = repository.findByOrganizationId(organizationId)
                .orElseGet(() -> GrievanceOfficer.builder().organizationId(organizationId).build());

        officer.setName(request.getName());
        officer.setDesignation(request.getDesignation());
        officer.setEmail(request.getEmail());
        officer.setPhone(request.getPhone());
        officer.setAddress(request.getAddress());
        officer.setUpdatedByUserId(actingUserId);

        GrievanceOfficer saved = repository.save(officer);
        log.info("Grievance officer upserted: org={}, by={}", organizationId, actingUserId);
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public GrievanceOfficerResponse getByOrganization(UUID organizationId) {
        if (!orgIsolationGuard.belongsToOrg(organizationId)) {
            throw new ResourceNotFoundException("No grievance officer set for this organization");
        }
        GrievanceOfficer officer = repository.findByOrganizationId(organizationId)
                .orElseThrow(() -> new ResourceNotFoundException("No grievance officer set for this organization"));
        return toResponse(officer);
    }

    private GrievanceOfficerResponse toResponse(GrievanceOfficer o) {
        return GrievanceOfficerResponse.builder()
                .id(o.getId())
                .organizationId(o.getOrganizationId())
                .name(o.getName())
                .designation(o.getDesignation())
                .email(o.getEmail())
                .phone(o.getPhone())
                .address(o.getAddress())
                .updatedByUserId(o.getUpdatedByUserId())
                .createdAt(o.getCreatedAt())
                .updatedAt(o.getUpdatedAt())
                .build();
    }
}
