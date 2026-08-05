package com.recoverpro.server.service.impl;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.entity.IncidentReport;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.repository.IncidentReportRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.service.AgentFieldService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AgentFieldServiceIsolationTest extends AbstractIntegrationTest {

    @Autowired private AgentFieldService agentFieldService;
    @Autowired private IncidentReportRepository incidentReportRepository;

    private IncidentReport incidentInOrgA;
    private Organization orgA;

    @AfterEach
    void cleanup() {
        if (incidentInOrgA != null) {
            RlsOrgIdHolder.set(orgA.getId());
            incidentReportRepository.deleteById(incidentInOrgA.getId());
            RlsOrgIdHolder.clear();
        }
    }

    @Test
    void resolveIncident_crossOrg_throwsNotFound() {
        orgA = createOrg("sp15-a");
        Organization orgB = createOrg("sp15-b");

        RlsOrgIdHolder.set(orgA.getId());
        User agentInOrgA = createUser(orgA, "ROLE_FO");
        incidentInOrgA = incidentReportRepository.save(IncidentReport.builder()
                .organizationId(orgA.getId())
                .agentId(agentInOrgA.getId())
                .triggeredAt(Instant.now())
                .build());
        RlsOrgIdHolder.clear();

        User strangerInOrgB = createUser(orgB, "ROLE_MANAGER");
        actAsUser(strangerInOrgB);
        RlsOrgIdHolder.set(orgA.getId());

        assertThatThrownBy(() -> agentFieldService.resolveIncident(
                incidentInOrgA.getId(), strangerInOrgB.getId(), "resolved"))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
