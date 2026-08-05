package com.recoverpro.server.enums;

public enum SafetyDecision {
    ALLOWED,
    BLOCKED_PII,
    BLOCKED_OFF_TOPIC,
    BLOCKED_HARMFUL;

    public boolean isAllowed() { return this == ALLOWED; }
}
