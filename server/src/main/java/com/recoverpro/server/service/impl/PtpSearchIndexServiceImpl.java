package com.recoverpro.server.service.impl;

import com.recoverpro.server.entity.PtpNameSearchToken;
import com.recoverpro.server.entity.PtpRecord;
import com.recoverpro.server.repository.PtpNameSearchTokenRepository;
import com.recoverpro.server.security.encryption.LookupHashService;
import com.recoverpro.server.service.PtpSearchIndexService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PtpSearchIndexServiceImpl implements PtpSearchIndexService {

    private final PtpNameSearchTokenRepository tokenRepository;
    private final LookupHashService lookupHashService;

    @Override
    @Transactional
    public void reindex(PtpRecord ptp, UUID organizationId) {
        tokenRepository.deleteByPtpId(ptp.getId());
        Set<String> tokens = lookupHashService.nameSearchTokens(ptp.getBorrowerName());
        if (tokens.isEmpty()) return;

        List<PtpNameSearchToken> rows = tokens.stream()
                .map(hash -> PtpNameSearchToken.builder()
                        .ptpId(ptp.getId())
                        .tokenHash(hash)
                        .organizationId(organizationId)
                        .build())
                .collect(Collectors.toList());
        tokenRepository.saveAll(rows);
    }
}
