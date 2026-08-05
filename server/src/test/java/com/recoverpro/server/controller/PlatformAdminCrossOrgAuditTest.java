package com.recoverpro.server.controller;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.config.PlatformConstants;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.UserActionAuditLog;
import com.recoverpro.server.repository.UserActionAuditLogRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * A platform admin reading another tenant's data is a legitimate support operation, but in a
 * regulated lending context it has to leave an attributable trail: who looked, whose data,
 * and why. Nothing currently records it.
 */
class PlatformAdminCrossOrgAuditTest extends AbstractIntegrationTest {

    private static final String CROSS_ORG_ACTION = "PLATFORM_ADMIN_CROSS_ORG_ACCESS";

    @Autowired private UserActionAuditLogRepository auditRepository;

    // No cleanup of the rows this test writes: a DB trigger makes user_action_audit_logs
    // append-only ("rows are immutable"), which is the correct property for an audit trail.

    @Test
    void crossOrgFileUploadListing_writesAttributableAuditRecord() {
        Organization tenant = createOrg("audit-tenant");
        String adminToken = tokenFor(null, PlatformConstants.ROLE_PLATFORM_ADMIN);
        UUID adminId = userRepository.findByEmailIgnoreCase(PlatformConstants.PLATFORM_ADMIN_EMAIL)
                .orElseThrow().getId();

        restTemplate.exchange(
                baseUrl("/api/v1/file-uploads?organizationId=" + tenant.getId()
                        + "&reason=BCR-77%20support%20investigation"),
                HttpMethod.GET,
                new HttpEntity<>(bearerHeaders(adminToken)),
                String.class);

        List<UserActionAuditLog> recent = auditRepository
                .findByUserIdOrderByCreatedAtDesc(adminId, PageRequest.of(0, 10))
                .getContent();

        assertThat(recent)
                .as("a cross-org read by a platform admin must be recorded against that admin")
                .anySatisfy(entry -> {
                    assertThat(entry.getAction()).isEqualTo(CROSS_ORG_ACTION);
                    assertThat(entry.getDetails())
                            .as("the audit record must name whose data was accessed and why")
                            .contains(tenant.getId().toString())
                            .contains("BCR-77");
                });
    }

    @Test
    void crossOrgAccessWithoutAStatedReason_isRejected() {
        Organization tenant = createOrg("no-reason-tenant");
        String adminToken = tokenFor(null, PlatformConstants.ROLE_PLATFORM_ADMIN);

        ResponseEntity<String> response = restTemplate.exchange(
                baseUrl("/api/v1/file-uploads?organizationId=" + tenant.getId()),
                HttpMethod.GET,
                new HttpEntity<>(bearerHeaders(adminToken)),
                String.class);

        assertThat(response.getStatusCode())
                .as("an unexplained cross-tenant read must be refused, not silently served")
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void platformAdminReadingItsOwnOrg_needsNoReason() {
        String adminToken = tokenFor(null, PlatformConstants.ROLE_PLATFORM_ADMIN);

        ResponseEntity<String> response = restTemplate.exchange(
                baseUrl("/api/v1/file-uploads"),
                HttpMethod.GET,
                new HttpEntity<>(bearerHeaders(adminToken)),
                String.class);

        assertThat(response.getStatusCode())
                .as("the reason requirement applies to cross-tenant reads only")
                .isEqualTo(HttpStatus.OK);
    }
}
