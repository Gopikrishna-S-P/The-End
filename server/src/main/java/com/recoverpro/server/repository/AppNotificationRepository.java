package com.recoverpro.server.repository;

import com.recoverpro.server.entity.AppNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface AppNotificationRepository extends JpaRepository<AppNotification, UUID> {

    Page<AppNotification> findByRecipientIdAndDismissedFalseOrderByCreatedAtDesc(UUID recipientId, Pageable pageable);

    /**
     * Retention sweep. markRead/dismiss are soft — they only stamp readAt /
     * set dismissed so the list and unread count can filter — so nothing ever
     * removed a row and app_notifications grew without bound. Only settled
     * rows (read or dismissed) are eligible; unread notifications are kept
     * however old, since deleting one destroys an unseen alert.
     */
    @Modifying
    @Query("DELETE FROM AppNotification n WHERE n.createdAt < :cutoff " +
           "AND (n.readAt IS NOT NULL OR n.dismissed = true)")
    int deleteSettledOlderThan(@Param("cutoff") Instant cutoff);

    long countByRecipientIdAndReadAtIsNullAndDismissedFalse(UUID recipientId);

    /**
     * :orgId is null for platform admins (they have no organization). A plain
     * "n.organizationId = :orgId" never matches in that case -- SQL's NULL = NULL is
     * UNKNOWN, not true -- so platform-scoped notifications (organizationId also null)
     * would be invisible to them. The explicit null/null branch fixes that.
     */
    @Query("SELECT n FROM AppNotification n WHERE n.recipientId = :userId " +
           "AND ((:orgId IS NULL AND n.organizationId IS NULL) OR n.organizationId = :orgId) " +
           "AND n.readAt IS NULL AND n.dismissed = false " +
           "AND (n.snoozedUntil IS NULL OR n.snoozedUntil <= CURRENT_TIMESTAMP) " +
           "ORDER BY n.createdAt DESC")
    List<AppNotification> findUnreadByUserAndOrg(
            @Param("userId") UUID userId, @Param("orgId") UUID orgId, Pageable pageable);

    @Query("SELECT COUNT(n) FROM AppNotification n WHERE n.recipientId = :userId " +
           "AND ((:orgId IS NULL AND n.organizationId IS NULL) OR n.organizationId = :orgId) " +
           "AND n.readAt IS NULL AND n.dismissed = false " +
           "AND (n.snoozedUntil IS NULL OR n.snoozedUntil <= CURRENT_TIMESTAMP)")
    long countUnreadByUserAndOrg(@Param("userId") UUID userId, @Param("orgId") UUID orgId);

    @Modifying
    @Query("UPDATE AppNotification n SET n.readAt = CURRENT_TIMESTAMP WHERE n.recipientId = :userId " +
           "AND ((:orgId IS NULL AND n.organizationId IS NULL) OR n.organizationId = :orgId) AND n.readAt IS NULL")
    void markAllReadForUser(@Param("userId") UUID userId, @Param("orgId") UUID orgId);

    @Modifying
    @Query("UPDATE AppNotification n SET n.readAt = CURRENT_TIMESTAMP WHERE n.recipientId = :recipientId AND n.readAt IS NULL")
    void markAllReadByRecipient(@Param("recipientId") UUID recipientId);
}
