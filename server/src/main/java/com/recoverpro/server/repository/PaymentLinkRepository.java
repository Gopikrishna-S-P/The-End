package com.recoverpro.server.repository;

import com.recoverpro.server.entity.PaymentLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentLinkRepository extends JpaRepository<PaymentLink, UUID> {

    Optional<PaymentLink> findByToken(String token);

    boolean existsByToken(String token);

    List<PaymentLink> findByIntentIdOrderByCreatedAtDesc(UUID intentId);

    @Modifying
    @Query("UPDATE PaymentLink l SET l.consumedAt = :now " +
           "WHERE l.token = :token AND l.consumedAt IS NULL AND l.expiresAt > :now")
    int atomicConsume(@Param("token") String token, @Param("now") Instant now);
}
