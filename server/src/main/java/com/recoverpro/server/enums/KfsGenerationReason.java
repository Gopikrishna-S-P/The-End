package com.recoverpro.server.enums;

/**
 * Why a Key Fact Statement was generated. RESTRUCTURING is the only reachable value this pass
 * (see docs/superpowers/specs/2026-08-04-kfs-design.md) -- the column supports future triggers
 * (e.g. settlement, origination-copy) without a schema change.
 */
public enum KfsGenerationReason {
    RESTRUCTURING
}
