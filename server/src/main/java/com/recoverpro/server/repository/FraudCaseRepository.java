package com.recoverpro.server.repository;

import com.recoverpro.server.entity.FraudCase;
import com.recoverpro.server.enums.FraudCaseStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FraudCaseRepository extends JpaRepository<FraudCase, UUID> {

    Page<FraudCase> findByOrganizationIdOrderByReportedAtDesc(UUID organizationId, Pageable pageable);

    Page<FraudCase> findByOrganizationIdAndStatusOrderByReportedAtDesc(UUID organizationId, FraudCaseStatus status, Pageable pageable);

    Optional<FraudCase> findByCaseNumber(String caseNumber);

    List<FraudCase> findByAllocationId(UUID allocationId);

    List<FraudCase> findByBorrowerId(UUID borrowerId);

    List<FraudCase> findByOrganizationIdAndStatusAndFrmsSubmittedAtIsNull(UUID organizationId, FraudCaseStatus status);

    boolean existsByCaseNumber(String caseNumber);
}
