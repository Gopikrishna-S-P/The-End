package com.recoverpro.server.repository;

import com.recoverpro.server.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoleRepository extends JpaRepository<Role, UUID> {

    Optional<Role> findByName(String name);

    boolean existsByName(String name);

    Optional<Role> findByNameAndOrganizationIdIsNull(String name);

    Optional<Role> findByNameAndOrganizationId(String name, UUID organizationId);

    boolean existsByNameAndOrganizationIdIsNull(String name);

    boolean existsByNameAndOrganizationId(String name, UUID organizationId);

    List<Role> findByOrganizationIdIsNull();

    /** System roles (no org scope) + custom roles for this org */
    List<Role> findByOrganizationIdIsNullOrOrganizationId(UUID organizationId);
}
