package com.recoverpro.server.repository;

import com.recoverpro.server.entity.IncidentReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface IncidentReportRepository extends JpaRepository<IncidentReport, UUID> {

    Page<IncidentReport> findByOrganizationIdOrderByTriggeredAtDesc(UUID organizationId, Pageable pageable);

    Page<IncidentReport> findByOrganizationIdAndResolvedAtIsNullOrderByTriggeredAtDesc(UUID organizationId, Pageable pageable);
}
