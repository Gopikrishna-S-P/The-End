package com.recoverpro.server.repository;

import com.recoverpro.server.entity.AllocationNameSearchToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface AllocationNameSearchTokenRepository
        extends JpaRepository<AllocationNameSearchToken, AllocationNameSearchToken.Key> {

    @Modifying
    @Query("DELETE FROM AllocationNameSearchToken t WHERE t.allocationId = :allocationId")
    void deleteByAllocationId(@Param("allocationId") UUID allocationId);
}
