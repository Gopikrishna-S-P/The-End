package com.recoverpro.server.repository;

import com.recoverpro.server.entity.RefreshToken;
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
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    List<RefreshToken> findByUser_IdAndRevokedFalse(UUID userId);

    @Query("SELECT rt FROM RefreshToken rt WHERE rt.tokenPrefix = :prefix AND rt.revoked = false")
    List<RefreshToken> findByTokenPrefixAndRevokedFalse(@Param("prefix") String prefix);

    @Query("SELECT rt FROM RefreshToken rt WHERE rt.tokenPrefix = :prefix")
    List<RefreshToken> findByTokenPrefix(@Param("prefix") String prefix);

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revoked = true, rt.revokedAt = :now WHERE rt.user.id = :userId AND rt.revoked = false")
    void revokeAllByUserId(@Param("userId") UUID userId, @Param("now") Instant now);

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revoked = true, rt.revokedAt = :now WHERE rt.tokenHash = :hash AND rt.revoked = false")
    int revokeIfActive(@Param("hash") String hash, @Param("now") Instant now);

    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revoked = true, rt.revokedAt = :now WHERE rt.tokenHash = :hash")
    void revokeByTokenHash(@Param("hash") String hash, @Param("now") Instant now);

    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.expiresAt < :now")
    void deleteExpiredTokens(@Param("now") Instant now);
}
