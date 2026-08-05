package com.recoverpro.server.service;

import com.recoverpro.server.dto.response.KeyFactStatementResponse;

import java.util.UUID;

public interface KfsService {

    KeyFactStatementResponse generate(UUID restructureProposalId, UUID actingUserId);

    KeyFactStatementResponse getById(UUID id);

    KeyFactStatementResponse getByRestructureProposalId(UUID restructureProposalId);

    byte[] downloadPdf(UUID id);
}
