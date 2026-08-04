package com.recoverpro.server.repository;

import com.recoverpro.server.entity.GrievanceOfficer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface GrievanceOfficerRepository extends JpaRepository<GrievanceOfficer, UUID> {

    Optional<GrievanceOfficer> findByOrganizationId(UUID organizationId);
}
