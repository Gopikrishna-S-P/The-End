package com.recoverpro.server.service.impl;

import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.AllocationNameSearchToken;
import com.recoverpro.server.repository.AllocationNameSearchTokenRepository;
import com.recoverpro.server.security.encryption.LookupHashService;
import com.recoverpro.server.service.AllocationSearchIndexService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AllocationSearchIndexServiceImpl implements AllocationSearchIndexService {

    private final AllocationNameSearchTokenRepository tokenRepository;
    private final LookupHashService lookupHashService;

    @Override
    @Transactional
    public void reindex(Allocation allocation) {
        tokenRepository.deleteByAllocationId(allocation.getId());
        Set<String> tokens = lookupHashService.nameSearchTokens(allocation.getBorrowerName());
        if (tokens.isEmpty()) return;

        UUID orgId = allocation.getOrganization().getId();
        List<AllocationNameSearchToken> rows = tokens.stream()
                .map(hash -> AllocationNameSearchToken.builder()
                        .allocationId(allocation.getId())
                        .tokenHash(hash)
                        .organizationId(orgId)
                        .build())
                .collect(Collectors.toList());
        tokenRepository.saveAll(rows);
    }

    @Override
    @Transactional
    public void reindexAll(List<Allocation> allocations) {
        allocations.forEach(this::reindex);
    }
}
