package com.recoverpro.server.service;

import com.recoverpro.server.dto.response.UserActionAuditResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Generic user-action audit trail (login, password change, admin actions, etc.) -- split out of
 * {@link AuditLogService} which previously mixed this with assignment-lifecycle audit
 * (SYSTEM-PLAN SP42).
 */
public interface UserActionAuditService {

    void logUserAction(UUID userId, String action, String details);

    Page<UserActionAuditResponse> getUserActionLogs(UUID userId, Pageable pageable);

    Page<UserActionAuditResponse> getAllUserActionLogs(Pageable pageable);
}
