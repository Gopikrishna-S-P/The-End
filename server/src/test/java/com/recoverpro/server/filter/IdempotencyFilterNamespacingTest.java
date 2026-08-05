package com.recoverpro.server.filter;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.entity.Organization;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class IdempotencyFilterNamespacingTest extends AbstractIntegrationTest {

    @Autowired private JdbcTemplate jdbcTemplate;

    private Organization orgA;
    private Organization orgB;

    @AfterEach
    void cleanup() {
        if (orgA != null) {
            com.recoverpro.server.security.RlsOrgIdHolder.set(orgA.getId());
            jdbcTemplate.update("DELETE FROM column_schemas WHERE organization_id = ?", orgA.getId());
        }
        if (orgB != null) {
            com.recoverpro.server.security.RlsOrgIdHolder.set(orgB.getId());
            jdbcTemplate.update("DELETE FROM column_schemas WHERE organization_id = ?", orgB.getId());
        }
        com.recoverpro.server.security.RlsOrgIdHolder.clear();
    }

    @Test
    void sameIdempotencyKey_differentOrgs_getIndependentResponses() {
        orgA = createOrg("s6-a");
        orgB = createOrg("s6-b");
        String sameKey = "shared-idem-key-" + System.nanoTime();

        String tokenA = tokenFor(orgA, "ROLE_ORG_ADMIN");
        String tokenB = tokenFor(orgB, "ROLE_ORG_ADMIN");

        HttpHeaders headersA = bearerHeaders(tokenA);
        headersA.set("Idempotency-Key", sameKey);
        headersA.setContentType(MediaType.APPLICATION_JSON);

        HttpHeaders headersB = bearerHeaders(tokenB);
        headersB.set("Idempotency-Key", sameKey);
        headersB.setContentType(MediaType.APPLICATION_JSON);

        String bodyA = "{\"organizationId\":\"" + orgA.getId() + "\",\"name\":\"col_a_" + System.nanoTime()
                + "\",\"displayName\":\"A\",\"dataType\":\"TEXT\"}";
        String bodyB = "{\"organizationId\":\"" + orgB.getId() + "\",\"name\":\"col_b_" + System.nanoTime()
                + "\",\"displayName\":\"B\",\"dataType\":\"TEXT\"}";

        ResponseEntity<String> responseA = restTemplate.exchange(
                baseUrl("/api/v1/column-schemas"), HttpMethod.POST,
                new HttpEntity<>(bodyA, headersA), String.class);
        ResponseEntity<String> responseB = restTemplate.exchange(
                baseUrl("/api/v1/column-schemas"), HttpMethod.POST,
                new HttpEntity<>(bodyB, headersB), String.class);

        // Org B's response must reflect its own request (org B's data), not a cached copy of org A's response.
        assertThat(responseB.getBody()).doesNotContain(orgA.getId().toString());
        assertThat(responseB.getBody()).contains("\"B\"");
    }
}
