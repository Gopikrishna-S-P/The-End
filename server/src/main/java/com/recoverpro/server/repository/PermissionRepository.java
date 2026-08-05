package com.recoverpro.server.repository;

import com.recoverpro.server.entity.Permission;
import com.recoverpro.server.enums.PermissionScope;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, UUID> {

    Optional<Permission> findByName(String name);

    List<Permission> findByScope(PermissionScope scope);

    Set<Permission> findByScopeIn(Collection<PermissionScope> scopes);

    Set<Permission> findByIdInAndScopeIn(Collection<UUID> ids, Collection<PermissionScope> scopes);
}
