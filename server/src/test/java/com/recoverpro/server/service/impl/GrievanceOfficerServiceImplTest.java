package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.UpsertGrievanceOfficerRequest;
import com.recoverpro.server.dto.response.GrievanceOfficerResponse;
import com.recoverpro.server.entity.GrievanceOfficer;
import com.recoverpro.server.repository.GrievanceOfficerRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GrievanceOfficerServiceImplTest {

    @Mock private GrievanceOfficerRepository repository;
    @Mock private OrgIsolationGuard orgIsolationGuard;

    private GrievanceOfficerServiceImpl service;
    private UUID orgId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        service = new GrievanceOfficerServiceImpl(repository, orgIsolationGuard);
        lenient().when(orgIsolationGuard.belongsToOrg(any())).thenReturn(true);
        orgId = UUID.randomUUID();
        userId = UUID.randomUUID();
        lenient().when(repository.save(any(GrievanceOfficer.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private UpsertGrievanceOfficerRequest request() {
        UpsertGrievanceOfficerRequest r = new UpsertGrievanceOfficerRequest();
        r.setName("Priya Sharma");
        r.setDesignation("Grievance Redressal Officer");
        r.setEmail("gro@example.com");
        r.setPhone("+91-9876543210");
        r.setAddress("Head Office");
        return r;
    }

    @Test
    void upsert_noExistingRecord_createsNew() {
        when(repository.findByOrganizationId(orgId)).thenReturn(Optional.empty());

        GrievanceOfficerResponse response = service.upsert(orgId, request(), userId);

        assertThat(response.getOrganizationId()).isEqualTo(orgId);
        assertThat(response.getName()).isEqualTo("Priya Sharma");
        assertThat(response.getUpdatedByUserId()).isEqualTo(userId);
    }

    @Test
    void upsert_existingRecord_updatesInPlace() {
        UUID existingId = UUID.randomUUID();
        GrievanceOfficer existing = GrievanceOfficer.builder()
                .id(existingId).organizationId(orgId).name("Old Name")
                .designation("Old Designation").email("old@example.com").phone("000").build();
        when(repository.findByOrganizationId(orgId)).thenReturn(Optional.of(existing));

        GrievanceOfficerResponse response = service.upsert(orgId, request(), userId);

        assertThat(response.getId()).isEqualTo(existingId);
        assertThat(response.getName()).isEqualTo("Priya Sharma");
        verify(repository, times(1)).save(any());
    }

    @Test
    void getByOrganization_notSet_throwsResourceNotFoundException() {
        when(repository.findByOrganizationId(orgId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getByOrganization(orgId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getByOrganization_foreignOrg_throwsResourceNotFoundException() {
        when(orgIsolationGuard.belongsToOrg(orgId)).thenReturn(false);

        assertThatThrownBy(() -> service.getByOrganization(orgId))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(repository, never()).findByOrganizationId(any());
    }
}
