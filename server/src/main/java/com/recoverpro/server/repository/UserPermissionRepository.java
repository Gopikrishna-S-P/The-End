package com.recoverpro.server.repository;

import com.recoverpro.server.entity.UserPermission;
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
public interface UserPermissionRepository extends JpaRepository<UserPermission, UUID> {

    List<UserPermission> findByUserId(UUID userId);

    Optional<UserPermission> findByUserIdAndPermissionId(UUID userId, UUID permissionId);

    @Query("SELECT up FROM UserPermission up JOIN FETCH up.permission " +
           "WHERE up.user.id = :userId AND up.isGranted = true " +
           "AND (up.expiresAt IS NULL OR up.expiresAt > :now)")
    List<UserPermission> findActiveGrantsByUserId(@Param("userId") UUID userId,
                                                  @Param("now") Instant now);

    @Modifying
    @Query("DELETE FROM UserPermission up WHERE up.user.id = :userId AND up.permission.id = :permissionId")
    void deleteByUserIdAndPermissionId(@Param("userId") UUID userId,
                                       @Param("permissionId") UUID permissionId);
}
