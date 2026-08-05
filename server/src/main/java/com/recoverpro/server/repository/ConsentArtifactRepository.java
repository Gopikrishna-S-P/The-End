package com.recoverpro.server.repository;

import com.recoverpro.server.entity.ConsentArtifact;
import com.recoverpro.server.enums.ConsentPurpose;
import com.recoverpro.server.enums.ConsentScope;
import com.recoverpro.server.enums.ConsentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConsentArtifactRepository extends JpaRepository<ConsentArtifact, UUID> {

    List<ConsentArtifact> findByBorrowerIdOrderByGrantedAtDesc(UUID borrowerId);

    @Query("""
        SELECT c FROM ConsentArtifact c
        WHERE c.borrowerId = :borrowerId
          AND c.purpose = :purpose
          AND (c.scope = :scope OR c.scope = com.recoverpro.server.enums.ConsentScope.ANY)
          AND c.status = com.recoverpro.server.enums.ConsentStatus.ACTIVE
          AND (c.expiresAt IS NULL OR c.expiresAt > :now)
        ORDER BY c.grantedAt DESC
        """)
    List<ConsentArtifact> findActiveConsents(
            @Param("borrowerId") UUID borrowerId,
            @Param("purpose")   ConsentPurpose purpose,
            @Param("scope")     ConsentScope scope,
            @Param("now")       Instant now);

    Optional<ConsentArtifact> findFirstByBorrowerIdAndPurposeAndScopeAndStatusOrderByGrantedAtDesc(
            UUID borrowerId, ConsentPurpose purpose, ConsentScope scope, ConsentStatus status);
}
