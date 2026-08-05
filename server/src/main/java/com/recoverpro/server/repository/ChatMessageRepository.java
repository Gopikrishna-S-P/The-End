package com.recoverpro.server.repository;

import com.recoverpro.server.entity.ChatMessage;
import com.recoverpro.server.enums.ChatRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(String sessionId);

    List<ChatMessage> findBySessionIdAndRoleOrderByCreatedAtAsc(String sessionId, ChatRole role);

    long countBySessionId(String sessionId);

    @Query("SELECT m FROM ChatMessage m WHERE m.session.id = :sessionId ORDER BY m.createdAt ASC")
    List<ChatMessage> findAllBySessionIdOrderByCreatedAtAsc(@Param("sessionId") String sessionId);

    @Query("SELECT m FROM ChatMessage m WHERE m.session.id = :sessionId AND m.wasBlocked = false ORDER BY m.createdAt ASC")
    List<ChatMessage> findUnblockedBySessionId(@Param("sessionId") String sessionId);

    @Query("SELECT m FROM ChatMessage m WHERE m.session.id = :sessionId ORDER BY m.createdAt DESC FETCH FIRST :limit ROWS ONLY")
    List<ChatMessage> findRecentBySessionId(@Param("sessionId") String sessionId, @Param("limit") int limit);

    @Modifying
    @Query("DELETE FROM ChatMessage m WHERE m.session.id = :sessionId")
    int deleteBySessionId(@Param("sessionId") String sessionId);

    @Modifying
    @Query("DELETE FROM ChatMessage m WHERE m.session.id IN (SELECT s.id FROM ChatSession s WHERE s.createdAt < :cutoff)")
    int deleteMessagesForSessionsOlderThan(@Param("cutoff") Instant cutoff);
}
