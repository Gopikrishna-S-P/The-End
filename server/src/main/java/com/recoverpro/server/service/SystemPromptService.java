package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.UpdateSystemPromptRequest;
import com.recoverpro.server.dto.response.SystemPromptResponse;

import java.util.UUID;

public interface SystemPromptService {

    SystemPromptResponse getActivePrompt(String promptKey);

    SystemPromptResponse updatePrompt(String promptKey, UpdateSystemPromptRequest request, UUID updatedBy);

    void deletePrompt(String promptKey);

    String resolveActiveTemplate(String promptKey);
}
