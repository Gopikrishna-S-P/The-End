package com.recoverpro.server.config;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.entity.Organization;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityFilterChainTest extends AbstractIntegrationTest {

    @Test
    void unauthenticatedRequestToProtectedEndpoint_returns401() {
        ResponseEntity<String> response = restTemplate.getForEntity(
                baseUrl("/api/v1/allocations?orgId=" + java.util.UUID.randomUUID()), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void authenticatedRequestToProtectedEndpoint_isNotRejectedByAuthentication() {
        Organization org = createOrg("sec-s1");
        String token = tokenFor(org, "ROLE_ORG_ADMIN");

        ResponseEntity<String> response = restTemplate.exchange(
                baseUrl("/api/v1/allocations?orgId=" + org.getId()),
                HttpMethod.GET,
                new HttpEntity<>(bearerHeaders(token)),
                String.class);

        // Not 401 — authentication succeeded. (200/400/etc. depending on service logic is fine;
        // this test only proves the JWT filter + authenticated() rule work, not endpoint business logic.)
        assertThat(response.getStatusCode()).isNotEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void invalidBearerToken_returns401() {
        ResponseEntity<String> response = restTemplate.exchange(
                baseUrl("/api/v1/allocations?orgId=" + java.util.UUID.randomUUID()),
                HttpMethod.GET,
                new HttpEntity<>(bearerHeaders("not-a-real-jwt")),
                String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void publicAuthEndpoint_reachableWithoutToken() {
        // /api/v1/auth/login must stay reachable pre-authentication — this proves the
        // PUBLIC_PATHS allowlist works. A malformed body still proves the URL wasn't
        // blocked at 401/403 (it should fail validation with 400, not auth with 401/403).
        ResponseEntity<String> response = restTemplate.postForEntity(
                baseUrl("/api/v1/auth/login"), new HttpEntity<>("{}"), String.class);

        assertThat(response.getStatusCode()).isNotIn(HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }
}
