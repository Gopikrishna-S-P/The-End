package com.recoverpro.server.repository;

import com.recoverpro.server.entity.Grievance;
import com.recoverpro.server.enums.GrievanceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GrievanceRepository extends JpaRepository<Grievance, UUID> {

    Page<Grievance> findByOrganizationIdOrderByCreatedAtDesc(UUID organizationId, Pageable pageable);

    Page<Grievance> findByOrganizationIdAndStatusOrderByCreatedAtDesc(
            UUID organizationId, GrievanceStatus status, Pageable pageable);

    List<Grievance> findByAllocationIdOrderByCreatedAtDesc(UUID allocationId);

    boolean existsByTicketNumber(String ticketNumber);
}
