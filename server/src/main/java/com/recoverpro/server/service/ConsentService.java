package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.GrantConsentRequest;
import com.recoverpro.server.dto.response.ConsentArtifactResponse;
import com.recoverpro.server.enums.ConsentPurpose;
import com.recoverpro.server.enums.ConsentScope;

import java.util.List;
import java.util.UUID;

public interface ConsentService {

    ConsentArtifactResponse grant(UUID borrowerId, GrantConsentRequest request, UUID actingUserId);

    void revoke(UUID borrowerId, ConsentPurpose purpose, ConsentScope scope, String reason);

    List<ConsentArtifactResponse> listForBorrower(UUID borrowerId);

    boolean hasActiveConsent(UUID borrowerId, ConsentPurpose purpose, ConsentScope scope);
}
