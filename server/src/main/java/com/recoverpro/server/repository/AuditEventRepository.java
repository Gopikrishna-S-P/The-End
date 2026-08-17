package com.recoverpro.server.repository;

import com.recoverpro.server.entity.AuditEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Basic persistence for {@code audit_events}. Search/filter query methods land here once
 * AuditService and the audit search API are built -- this interface is deliberately minimal for
 * now, matching this phase's scope (unified table + taxonomy, not the service/search layer yet).
 */
@Repository
public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {
}
