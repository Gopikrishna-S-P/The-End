package com.recoverpro.server.client;

import com.recoverpro.server.port.ModelClientPort;
import com.recoverpro.server.port.ModelClientResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Adapts LlamaClient to ModelClientPort.
 * Swap this adapter (e.g. for ClaudeClientAdapter) without touching LucienAgentLoop.
 */
@Component
@RequiredArgsConstructor
public class LlamaClientAdapter implements ModelClientPort {

    private final LlamaClient llamaClient;

    @Override
    public ModelClientResponse chat(List<LlamaMessage> messages) {
        LlamaResponse response = llamaClient.chat(messages);
        String content = llamaClient.extractReply(response);
        int inputTokens  = response.getUsage() != null ? response.getUsage().getPromptTokens()     : 0;
        int outputTokens = response.getUsage() != null ? response.getUsage().getCompletionTokens() : 0;
        return new ModelClientResponse(content, inputTokens, outputTokens);
    }
}
