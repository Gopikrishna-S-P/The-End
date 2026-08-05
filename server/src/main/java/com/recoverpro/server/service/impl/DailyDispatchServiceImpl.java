package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.CreateDailyDispatchRequest;
import com.recoverpro.server.dto.response.AllocationResponse;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.DailyVisitList;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.mapper.AllocationMapper;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.DailyVisitListRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.service.DailyDispatchService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DailyDispatchServiceImpl implements DailyDispatchService {

    private final DailyVisitListRepository dispatchRepo;
    private final AllocationRepository allocationRepo;
    private final AllocationMapper allocationMapper;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public List<AllocationResponse> createDispatch(UUID orgId, UUID actorId, CreateDailyDispatchRequest request) {
        assertAgentInOrg(orgId, request.getAgentId());

        // Empty list = clear the dispatch for that (org, agent, date)
        dispatchRepo.deleteByOrgAndAgentAndDate(orgId, request.getAgentId(), request.getDate());

        if (request.getCaseIds().isEmpty()) {
            return List.of();
        }

        // Validate every case belongs to this tenant AND is currently assigned
        // to the target agent (no dispatching cases that haven't been assigned).
        List<Allocation> cases = allocationRepo.findAllById(request.getCaseIds());
        if (cases.size() != request.getCaseIds().size()) {
            throw new ResourceNotFoundException("One or more cases not found");
        }
        for (Allocation a : cases) {
            UUID caseOrgId = a.getOrganization() != null ? a.getOrganization().getId() : null;
            if (caseOrgId == null || !caseOrgId.equals(orgId)) {
                throw new ResourceNotFoundException("One or more cases not found");
            }
            if (a.getAssignedToUserId() == null
                    || !a.getAssignedToUserId().equals(request.getAgentId())) {
                throw new BusinessException(
                        "Case " + a.getId() + " is not assigned to the target FO");
            }
        }

        // Insert new entries with sequenceOrder preserved from the input array
        int order = 0;
        for (UUID caseId : request.getCaseIds()) {
            DailyVisitList row = DailyVisitList.builder()
                    .organizationId(orgId)
                    .agentUserId(request.getAgentId())
                    .dispatchDate(request.getDate())
                    .allocationId(caseId)
                    .sequenceOrder(order++)
                    .createdBy(actorId)
                    .build();
            dispatchRepo.save(row);
        }

        log.info("Daily dispatch: created list of {} cases for agent {} on {} (org {})",
                request.getCaseIds().size(), request.getAgentId(), request.getDate(), orgId);

        // Return the full case payload so the TL UI can show what was dispatched.
        return cases.stream()
                .sorted(Comparator.comparingInt(c -> request.getCaseIds().indexOf(c.getId())))
                .map(allocationMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<AllocationResponse> getListForAgent(UUID orgId, UUID agentId, LocalDate date) {
        assertAgentInOrg(orgId, agentId);
        List<DailyVisitList> rows = dispatchRepo
                .findByOrganizationIdAndAgentUserIdAndDispatchDateOrderBySequenceOrderAsc(orgId, agentId, date);
        return loadAllocations(rows, orgId);
    }

    @Override
    @Transactional
    public void removeCase(UUID orgId, UUID agentId, LocalDate date, UUID allocationId) {
        assertAgentInOrg(orgId, agentId);
        dispatchRepo.deleteByOrgAndAgentAndDateAndAllocation(orgId, agentId, date, allocationId);
    }

    @Override
    @Transactional(readOnly = true)
    public long countDispatchedForOrg(UUID orgId, LocalDate date) {
        return dispatchRepo.countByOrganizationIdAndDispatchDate(orgId, date);
    }

    private void assertAgentInOrg(UUID orgId, UUID agentId) {
        User agent = userRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent not found: " + agentId));
        if (!orgId.equals(agent.getOrganizationId())) {
            throw new ResourceNotFoundException("Agent not found: " + agentId);
        }
    }

    private List<AllocationResponse> loadAllocations(List<DailyVisitList> rows, UUID orgId) {
        if (rows.isEmpty()) return List.of();
        Map<UUID, Integer> orderByCase = new LinkedHashMap<>();
        for (DailyVisitList r : rows) {
            orderByCase.put(r.getAllocationId(), r.getSequenceOrder());
        }
        List<Allocation> cases = allocationRepo.findAllById(orderByCase.keySet());
        return cases.stream()
                // Defensive cross-tenant filter
                .filter(a -> a.getOrganization() != null
                        && a.getOrganization().getId().equals(orgId))
                .sorted(Comparator.comparingInt(c -> orderByCase.getOrDefault(c.getId(), Integer.MAX_VALUE)))
                .map(allocationMapper::toResponse)
                .toList();
    }
}
