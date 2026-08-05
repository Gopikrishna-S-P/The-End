package com.recoverpro.server.repository;

import com.recoverpro.server.entity.PtpHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PtpHistoryRepository extends JpaRepository<PtpHistory, UUID> {

    List<PtpHistory> findAllByPtpIdOrderByChangedAtDesc(UUID ptpId);

    @Query("SELECT h FROM PtpHistory h WHERE h.allocationId = :allocationId ORDER BY h.changedAt DESC")
    List<PtpHistory> findFullHistoryByAllocationId(@Param("allocationId") UUID allocationId);
}
