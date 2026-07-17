package com.recoverpro.server.config;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.entity.Organization;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class MethodSecurityEnabledTest extends AbstractIntegrationTest {

    @Test
    void nonAdminToken_onPlatformOnlyEndpoint_isRejectedByPreAuthorize() {
        // PlatformStatsController is class-level @PreAuthorize("hasRole('PLATFORM_ADMIN')").
        // An FO token authenticates fine (S1 passes) but must be blocked here by method security.
        Organization org = createOrg("sec-s2-nonadmin");
        String token = tokenFor(org, "ROLE_FO");

        ResponseEntity<String> response = restTemplate.exchange(
                baseUrl("/api/v1/platform/stats"), HttpMethod.GET,
                new HttpEntity<>(bearerHeaders(token)), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void platformAdminToken_onPlatformOnlyEndpoint_isNotRejectedByPreAuthorize() {
        String token = tokenFor(null, "ROLE_PLATFORM_ADMIN");

        ResponseEntity<String> response = restTemplate.exchange(
                baseUrl("/api/v1/platform/stats"), HttpMethod.GET,
                new HttpEntity<>(bearerHeaders(token)), String.class);

        assertThat(response.getStatusCode()).isNotEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void wrongRoleToken_onAllocationLeadsOnlyEndpoint_isRejected() {
        // AllocationController.updateAllocationStatus is @PreAuthorize(LEADS) =
        // hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN','MANAGER','TL') — FO is not in that list.
        Organization org = createOrg("sec-s2-alloc");
        String foToken = tokenFor(org, "ROLE_FO");

        HttpHeaders headers = bearerHeaders(foToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<String> response = restTemplate.exchange(
                baseUrl("/api/v1/allocations/" + UUID.randomUUID() + "/status"), HttpMethod.PATCH,
                new HttpEntity<>("{\"status\":\"ASSIGNED\"}", headers), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
