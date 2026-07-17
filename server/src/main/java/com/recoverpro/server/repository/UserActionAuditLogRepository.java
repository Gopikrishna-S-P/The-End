package com.recoverpro.server.repository;

import com.recoverpro.server.entity.UserActionAuditLog;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserActionAuditLogRepository extends JpaRepository<UserActionAuditLog, UUID> {

    Page<UserActionAuditLog> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Page<UserActionAuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT l FROM UserActionAuditLog l WHERE l.userId = :userId ORDER BY l.createdAt DESC LIMIT 1")
    Optional<UserActionAuditLog> findLatestByUserIdForUpdate(@Param("userId") UUID userId);
}
