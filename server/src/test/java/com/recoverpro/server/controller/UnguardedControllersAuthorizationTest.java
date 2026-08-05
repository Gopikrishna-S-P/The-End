package com.recoverpro.server.controller;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.entity.Organization;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class UnguardedControllersAuthorizationTest extends AbstractIntegrationTest {

    @Test
    void systemPromptAdmin_rejectsNonPlatformAdmin() {
        Organization org = createOrg("s2-prompt");
        String token = tokenFor(org, "ROLE_ORG_ADMIN");

        ResponseEntity<String> response = restTemplate.exchange(
                baseUrl("/api/v1/friday/admin/prompts/LUCIEN_SYSTEM"), HttpMethod.GET,
                new HttpEntity<>(bearerHeaders(token)), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void systemPromptAdmin_allowsPlatformAdmin() {
        String token = tokenFor(null, "ROLE_PLATFORM_ADMIN");

        ResponseEntity<String> response = restTemplate.exchange(
                baseUrl("/api/v1/friday/admin/prompts/LUCIEN_SYSTEM"), HttpMethod.GET,
                new HttpEntity<>(bearerHeaders(token)), String.class);

        assertThat(response.getStatusCode()).isNotEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void columnSchema_rejectsFieldOfficer() {
        Organization org = createOrg("s2-colschema");
        String token = tokenFor(org, "ROLE_FO");

        ResponseEntity<String> response = restTemplate.exchange(
                baseUrl("/api/v1/column-schemas?organizationId=" + org.getId()), HttpMethod.GET,
                new HttpEntity<>(bearerHeaders(token)), String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void reporting_rejectsAnonymous() {
        ResponseEntity<String> response = restTemplate.getForEntity(
                baseUrl("/api/v1/reports/mis-eod?orgId=" + UUID.randomUUID() + "&date=2026-07-05"),
                String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void notification_allowsAnyAuthenticatedUserForOwnNotifications() {
        Organization org = createOrg("s2-notif");
        String token = tokenFor(org, "ROLE_FO");

        ResponseEntity<String> response = restTemplate.exchange(
                baseUrl("/api/v1/notifications"), HttpMethod.GET,
                new HttpEntity<>(bearerHeaders(token)), String.class);

        assertThat(response.getStatusCode()).isNotEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getStatusCode()).isNotEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void paymentLinkResolve_staysPublic() {
        ResponseEntity<String> response = restTemplate.getForEntity(
                baseUrl("/p/some-test-token"), String.class);

        assertThat(response.getStatusCode()).isNotEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getStatusCode()).isNotEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void contactForm_staysPublic() {
        ResponseEntity<String> response = restTemplate.postForEntity(
                baseUrl("/api/v1/contact"),
                new HttpEntity<>("{\"name\":\"a\",\"email\":\"a@b.com\",\"message\":\"hi\"}"),
                String.class);

        assertThat(response.getStatusCode()).isNotEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getStatusCode()).isNotEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void authMe_requiresAuthentication() {
        // /api/v1/auth/** is in the URL-level permitAll allowlist (S1) so login/register etc.
        // stay reachable pre-auth; @PreAuthorize("isAuthenticated()") is the actual enforcement
        // point for /me. Spring's AnonymousAuthenticationToken.isAuthenticated() is true by
        // design ("authenticated as anonymous"), so a denial here is an AccessDeniedException
        // (403), not a 401 — the endpoint is still fully blocked for anonymous callers, just
        // via the method-security path rather than the filter-chain entry point.
        ResponseEntity<String> response = restTemplate.getForEntity(baseUrl("/api/v1/auth/me"), String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void lucienGetSession_requiresAuthentication() {
        ResponseEntity<String> response = restTemplate.getForEntity(
                baseUrl("/api/v1/lucien/sessions/some-session-id"), String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
