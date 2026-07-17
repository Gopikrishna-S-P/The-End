package com.recoverpro.server.service;

import com.recoverpro.server.dto.response.BorrowerRiskScoreResponse;

import java.util.Map;
import java.util.UUID;

public interface RiskScoringService {

    BorrowerRiskScoreResponse scoreBorrower(UUID borrowerId, UUID callerOrgId);

    BorrowerRiskScoreResponse scoreWithFeatures(UUID borrowerId, Map<String, Object> features, UUID callerOrgId);

    BorrowerRiskScoreResponse getLatest(UUID borrowerId);
}
