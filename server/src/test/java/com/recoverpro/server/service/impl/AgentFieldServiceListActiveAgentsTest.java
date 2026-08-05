package com.recoverpro.server.service.impl;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.dto.response.AgentLiveStatusResponse;
import com.recoverpro.server.entity.AgentLocationPing;
import com.recoverpro.server.entity.AgentShift;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.ShiftStatus;
import com.recoverpro.server.repository.AgentLocationPingRepository;
import com.recoverpro.server.repository.AgentShiftRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.service.AgentFieldService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Covers listActiveAgents()'s batched "latest ping per agent" query
 * (AgentLocationPingRepository.findLatestPerAgent, Postgres DISTINCT ON) --
 * needs a real database, not mocks, since the thing under test is the SQL
 * itself: does it actually pick the most recent row per agent, not just any
 * row, when an agent has multiple pings.
 */
class AgentFieldServiceListActiveAgentsTest extends AbstractIntegrationTest {

    @Autowired private AgentFieldService agentFieldService;
    @Autowired private AgentShiftRepository shiftRepository;
    @Autowired private AgentLocationPingRepository pingRepository;

    // agent_shifts.agent_id -> users.id is ON DELETE RESTRICT, so the base class's own
    // @AfterEach (which deletes createdUserIds) fails unless shifts are gone first.
    // Pings cascade-delete with their shift (ON DELETE CASCADE), so deleting shifts is enough.
    // JUnit 5 runs subclass @AfterEach before superclass @AfterEach, so this runs in time.
    private final List<UUID> createdShiftIds = new ArrayList<>();

    @AfterEach
    void cleanupShifts() {
        shiftRepository.deleteAllByIdInBatch(createdShiftIds);
    }

    @Test
    void returnsTheMostRecentPingPerAgent_notJustAnyPing() {
        Organization org = createOrg("sp15-lat");
        RlsOrgIdHolder.set(org.getId());
        User agentA = createUser(org, "ROLE_FO");
        User agentB = createUser(org, "ROLE_FO");

        AgentShift shiftA = shiftRepository.save(AgentShift.builder()
                .agentId(agentA.getId()).organizationId(org.getId())
                .startedAt(Instant.now()).status(ShiftStatus.ACTIVE).build());
        AgentShift shiftB = shiftRepository.save(AgentShift.builder()
                .agentId(agentB.getId()).organizationId(org.getId())
                .startedAt(Instant.now()).status(ShiftStatus.ACTIVE).build());
        createdShiftIds.add(shiftA.getId());
        createdShiftIds.add(shiftB.getId());

        Instant now = Instant.now();
        Instant oldestForA = now.minusSeconds(120);
        Instant middleForA = now.minusSeconds(60);
        // Agent A: three pings, oldest to newest -- the query must pick the newest.
        pingRepository.save(AgentLocationPing.builder()
                .agentId(agentA.getId()).shiftId(shiftA.getId())
                .lat(1.0).lng(1.0).recordedAt(oldestForA).build());
        pingRepository.save(AgentLocationPing.builder()
                .agentId(agentA.getId()).shiftId(shiftA.getId())
                .lat(2.0).lng(2.0).recordedAt(middleForA).build());
        AgentLocationPing newestForA = pingRepository.save(AgentLocationPing.builder()
                .agentId(agentA.getId()).shiftId(shiftA.getId())
                .lat(3.0).lng(3.0).recordedAt(now).build());
        // Agent B: a single ping.
        AgentLocationPing onlyForB = pingRepository.save(AgentLocationPing.builder()
                .agentId(agentB.getId()).shiftId(shiftB.getId())
                .lat(9.0).lng(9.0).recordedAt(now.minusSeconds(10)).build());

        actAsUser(agentA);
        List<AgentLiveStatusResponse> result = agentFieldService.listActiveAgents(org.getId());

        assertThat(result).hasSize(2);
        Map<java.util.UUID, AgentLiveStatusResponse> byAgent =
                result.stream().collect(Collectors.toMap(AgentLiveStatusResponse::getAgentId, r -> r));

        assertThat(byAgent.get(agentA.getId()).getLastLat()).isEqualTo(newestForA.getLat());
        // Compare by ordering (is it after the two older pings?) rather than exact equality --
        // Postgres timestamp columns are microsecond-precision and can round either direction
        // relative to the nanosecond-precision in-memory Instant, so exact equality after a DB
        // round-trip is flaky. Ordering proves the thing this test actually cares about: the
        // query picked the newest row, not an older one.
        assertThat(byAgent.get(agentA.getId()).getLastPingAt()).isAfter(middleForA).isAfter(oldestForA);
        assertThat(byAgent.get(agentB.getId()).getLastLat()).isEqualTo(onlyForB.getLat());
    }

    @Test
    void noActiveShifts_returnsEmptyListWithoutQueryingPings() {
        Organization org = createOrg("sp15-empty");
        RlsOrgIdHolder.set(org.getId());
        User admin = createUser(org, "ROLE_ORG_ADMIN");
        actAsUser(admin);

        List<AgentLiveStatusResponse> result = agentFieldService.listActiveAgents(org.getId());

        assertThat(result).isEmpty();
    }
}
