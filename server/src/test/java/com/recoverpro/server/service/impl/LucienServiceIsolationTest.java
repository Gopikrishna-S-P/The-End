package com.recoverpro.server.service.impl;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.StartSessionRequest;
import com.recoverpro.server.dto.response.SessionResponse;
import com.recoverpro.server.entity.ChatSession;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.repository.ChatSessionRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.LucienService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LucienServiceIsolationTest extends AbstractIntegrationTest {

    @Autowired private LucienService lucienService;
    @Autowired private ChatSessionRepository chatSessionRepository;

    private ChatSession sessionForAgentInOrgA;
    // Tracked separately because whichever principal's actAsUser() ran last in the test body
    // (e.g. the cross-org stranger) may not match the session's own org, and RLS would silently
    // no-op the delete below rather than throw -- set explicitly so cleanup always targets the
    // session's actual org regardless of test-body ordering.
    private UUID sessionOrgId;

    @AfterEach
    void cleanup() {
        if (sessionForAgentInOrgA != null) {
            RlsOrgIdHolder.set(sessionOrgId);
            chatSessionRepository.deleteById(sessionForAgentInOrgA.getId());
        }
    }

    @Test
    void getSessionHistory_differentOrgNonSupervisor_throwsNotFound() {
        Organization orgA = createOrg("s5-a");
        Organization orgB = createOrg("s5-b");

        User agentInOrgA = createUser(orgA, "ROLE_FO");

        actAsUser(agentInOrgA);
        sessionForAgentInOrgA = chatSessionRepository.save(ChatSession.builder()
                .agentId(agentInOrgA.getId())
                .organizationId(orgA.getId())
                .agentFirstName("Agent")
                .isActive(true)
                .totalMessages(0)
                .build());
        sessionOrgId = orgA.getId();

        // A different org's field officer (not a supervisor) must not read this session's history.
        User strangerInOrgB = createUser(orgB, "ROLE_FO");
        UserPrincipal strangerPrincipal = actAsUser(strangerInOrgB);

        assertThatThrownBy(() -> lucienService.getSessionHistory(sessionForAgentInOrgA.getId(), strangerPrincipal))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getSession_ownSession_succeeds() {
        Organization orgA = createOrg("s5-own-a");
        User agentInOrgA = createUser(orgA, "ROLE_FO");

        UserPrincipal ownerPrincipal = actAsUser(agentInOrgA);
        sessionForAgentInOrgA = chatSessionRepository.save(ChatSession.builder()
                .agentId(agentInOrgA.getId())
                .organizationId(orgA.getId())
                .agentFirstName("Agent")
                .isActive(true)
                .totalMessages(0)
                .build());
        sessionOrgId = orgA.getId();

        // Should not throw - the owning agent can always access their own session.
        lucienService.getSession(sessionForAgentInOrgA.getId(), ownerPrincipal);
    }

    /**
     * SEC-PLAN S15: ChatRateLimiter (and the token-budget check) key off
     * session.getAgentId(), which startSession must derive strictly from the
     * authenticated principal - never the client-supplied StartSessionRequest.
     * agentId field - or an attacker could rotate that field to spin up a fresh
     * rate-limit bucket per request and evade the 20/60s cap.
     */
    @Test
    void startSession_ignoresClientSuppliedAgentId_alwaysUsesPrincipal() {
        Organization org = createOrg("s15-spoof");
        User realAgent = createUser(org, "ROLE_FO");
        UserPrincipal principal = actAsUser(realAgent);

        StartSessionRequest spoofedRequest = StartSessionRequest.builder()
                .agentId(UUID.randomUUID())
                .agentFirstName("Real Agent")
                .build();

        SessionResponse response = lucienService.startSession(spoofedRequest, principal);
        sessionForAgentInOrgA = chatSessionRepository.findById(response.getSessionId()).orElseThrow();
        sessionOrgId = org.getId();

        assertThat(sessionForAgentInOrgA.getAgentId())
                .as("the session's agentId (and therefore the rate-limit key) must be the real caller, "
                        + "not the spoofed value in the request body")
                .isEqualTo(realAgent.getId())
                .isNotEqualTo(spoofedRequest.getAgentId());
    }
}
