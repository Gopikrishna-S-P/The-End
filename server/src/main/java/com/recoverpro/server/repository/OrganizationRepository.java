package com.recoverpro.server.repository;

import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.enums.OrganizationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

    Optional<Organization> findByCode(String code);

    boolean existsByCode(String code);

    boolean existsByName(String name);

    List<Organization> findByIsActiveTrue();

    List<Organization> findByOrganizationType(OrganizationType organizationType);

    @Query("SELECT COUNT(o) FROM Organization o WHERE o.organizationType <> com.recoverpro.server.enums.OrganizationType.PLATFORM")
    long countTenantOrgs();

    @Query("SELECT COUNT(o) FROM Organization o WHERE o.organizationType <> com.recoverpro.server.enums.OrganizationType.PLATFORM AND o.isActive = true")
    long countActiveTenantOrgs();

    @Query("SELECT o FROM Organization o WHERE o.organizationType <> com.recoverpro.server.enums.OrganizationType.PLATFORM")
    List<Organization> findTenantOrgs();
}
