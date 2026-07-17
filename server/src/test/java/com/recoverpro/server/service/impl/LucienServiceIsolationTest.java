package com.recoverpro.server.service.impl;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.StartSessionRequest;
import com.recoverpro.server.dto.response.SessionResponse;
import com.recoverpro.server.entity.ChatSession;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.repository.ChatSessionRepository;
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

    @AfterEach
    void cleanup() {
        if (sessionForAgentInOrgA != null) chatSessionRepository.deleteById(sessionForAgentInOrgA.getId());
    }

    @Test
    void getSessionHistory_differentOrgNonSupervisor_throwsNotFound() {
        Organization orgA = createOrg("s5-a");
        Organization orgB = createOrg("s5-b");

        User agentInOrgA = createUser(orgA, "ROLE_FO");

        sessionForAgentInOrgA = chatSessionRepository.save(ChatSession.builder()
                .agentId(agentInOrgA.getId())
                .agentFirstName("Agent")
                .isActive(true)
                .totalMessages(0)
                .build());

        // A different org's field officer (not a supervisor) must not read this session's history.
        User strangerInOrgB = createUser(orgB, "ROLE_FO");
        UserPrincipal strangerPrincipal = new UserPrincipal(strangerInOrgB);

        assertThatThrownBy(() -> lucienService.getSessionHistory(sessionForAgentInOrgA.getId(), strangerPrincipal))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getSession_ownSession_succeeds() {
        Organization orgA = createOrg("s5-own-a");
        User agentInOrgA = createUser(orgA, "ROLE_FO");

        sessionForAgentInOrgA = chatSessionRepository.save(ChatSession.builder()
                .agentId(agentInOrgA.getId())
                .agentFirstName("Agent")
                .isActive(true)
                .totalMessages(0)
                .build());

        UserPrincipal ownerPrincipal = new UserPrincipal(agentInOrgA);

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
        UserPrincipal principal = new UserPrincipal(realAgent);

        StartSessionRequest spoofedRequest = StartSessionRequest.builder()
                .agentId(UUID.randomUUID())
                .agentFirstName("Real Agent")
                .build();

        SessionResponse response = lucienService.startSession(spoofedRequest, principal);
        sessionForAgentInOrgA = chatSessionRepository.findById(response.getSessionId()).orElseThrow();

        assertThat(sessionForAgentInOrgA.getAgentId())
                .as("the session's agentId (and therefore the rate-limit key) must be the real caller, "
                        + "not the spoofed value in the request body")
                .isEqualTo(realAgent.getId())
                .isNotEqualTo(spoofedRequest.getAgentId());
    }
}
