package com.recoverpro.server.repository;

import com.recoverpro.server.entity.PtpAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface PtpAuditLogRepository extends JpaRepository<PtpAuditLog, UUID> {
}
