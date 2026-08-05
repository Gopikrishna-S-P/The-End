package com.recoverpro.server.repository;

import com.recoverpro.server.entity.MonthlyLoanBookSnapshot;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MonthlyLoanBookSnapshotRepository extends JpaRepository<MonthlyLoanBookSnapshot, UUID> {

    Optional<MonthlyLoanBookSnapshot> findByOrganizationIdAndSnapshotMonth(UUID orgId, LocalDate snapshotMonth);

    boolean existsByOrganizationIdAndSnapshotMonth(UUID orgId, LocalDate snapshotMonth);

    Page<MonthlyLoanBookSnapshot> findByOrganizationIdOrderBySnapshotMonthDesc(UUID orgId, Pageable pageable);
}
