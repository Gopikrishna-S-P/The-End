package com.recoverpro.server.service;

import com.recoverpro.server.dto.response.AgentContextDto;
import java.util.UUID;

public interface AgentContextService {
    AgentContextDto buildContext(String sessionId, UUID agentId, String agentFirstName);
}