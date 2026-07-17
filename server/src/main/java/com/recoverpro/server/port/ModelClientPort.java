package com.recoverpro.server.port;

import com.recoverpro.server.client.LlamaMessage;

import java.util.List;

/**
 * Port for the AI model backend. Adapters: LlamaClientAdapter (Ollama/local).
 * Swap to Claude or GPT by providing a different adapter — LucienAgentLoop never changes.
 */
public interface ModelClientPort {

    ModelClientResponse chat(List<LlamaMessage> messages);
}
