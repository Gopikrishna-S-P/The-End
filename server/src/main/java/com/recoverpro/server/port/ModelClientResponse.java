package com.recoverpro.server.port;

public record ModelClientResponse(
        String content,
        int inputTokens,
        int outputTokens
) {}
