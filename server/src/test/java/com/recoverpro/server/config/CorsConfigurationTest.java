package com.recoverpro.server.config;

import com.recoverpro.server.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * SEC-PLAN S18: no CorsConfigurationSource existed anywhere - once a CORS
 * policy does get added (as it must for any cross-origin web deployment),
 * it must be an explicit allowlist, not a wildcard or reflected-origin
 * default that would let any site read authenticated responses.
 */
class CorsConfigurationTest extends AbstractIntegrationTest {

    @Test
    void preflightFromAllowedOrigin_isPermitted() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Origin", "http://localhost:5173");
        headers.set("Access-Control-Request-Method", "GET");
        HttpEntity<Void> request = new HttpEntity<>(headers);

        ResponseEntity<Void> response = restTemplate.exchange(
                baseUrl("/api/v1/allocations"), HttpMethod.OPTIONS, request, Void.class);

        assertThat(response.getHeaders().getAccessControlAllowOrigin()).isEqualTo("http://localhost:5173");
    }

    @Test
    void preflightFromUnlistedOrigin_isBlocked() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Origin", "https://attacker.example");
        headers.set("Access-Control-Request-Method", "GET");
        HttpEntity<Void> request = new HttpEntity<>(headers);

        ResponseEntity<Void> response = restTemplate.exchange(
                baseUrl("/api/v1/allocations"), HttpMethod.OPTIONS, request, Void.class);

        assertThat(response.getHeaders().getAccessControlAllowOrigin()).isNull();
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
