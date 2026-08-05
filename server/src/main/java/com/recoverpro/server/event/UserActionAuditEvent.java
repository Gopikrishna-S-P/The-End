package com.recoverpro.server.event;

import java.util.UUID;

public record UserActionAuditEvent(UUID userId, String action, String details) {}
