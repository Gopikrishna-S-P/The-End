package com.recoverpro.server.repository;

import com.recoverpro.server.entity.AppNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AppNotificationRepository extends JpaRepository<AppNotification, UUID> {

    Page<AppNotification> findByRecipientIdAndDismissedFalseOrderByCreatedAtDesc(UUID recipientId, Pageable pageable);

    long countByRecipientIdAndReadAtIsNullAndDismissedFalse(UUID recipientId);

    @Query("SELECT n FROM AppNotification n WHERE n.recipientId = :userId AND n.organizationId = :orgId " +
           "AND n.readAt IS NULL AND n.dismissed = false " +
           "AND (n.snoozedUntil IS NULL OR n.snoozedUntil <= CURRENT_TIMESTAMP) " +
           "ORDER BY n.createdAt DESC")
    List<AppNotification> findUnreadByUserAndOrg(
            @Param("userId") UUID userId, @Param("orgId") UUID orgId, Pageable pageable);

    @Query("SELECT COUNT(n) FROM AppNotification n WHERE n.recipientId = :userId AND n.organizationId = :orgId " +
           "AND n.readAt IS NULL AND n.dismissed = false " +
           "AND (n.snoozedUntil IS NULL OR n.snoozedUntil <= CURRENT_TIMESTAMP)")
    long countUnreadByUserAndOrg(@Param("userId") UUID userId, @Param("orgId") UUID orgId);

    @Modifying
    @Query("UPDATE AppNotification n SET n.readAt = CURRENT_TIMESTAMP WHERE n.recipientId = :userId AND n.organizationId = :orgId AND n.readAt IS NULL")
    void markAllReadForUser(@Param("userId") UUID userId, @Param("orgId") UUID orgId);

    @Modifying
    @Query("UPDATE AppNotification n SET n.readAt = CURRENT_TIMESTAMP WHERE n.recipientId = :recipientId AND n.readAt IS NULL")
    void markAllReadByRecipient(@Param("recipientId") UUID recipientId);
}
