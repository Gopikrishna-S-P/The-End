package com.recoverpro.server.repository;

import com.recoverpro.server.entity.DataErasureRequest;
import com.recoverpro.server.enums.ErasureRequestStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DataErasureRequestRepository extends JpaRepository<DataErasureRequest, UUID> {

    List<DataErasureRequest> findByBorrowerIdOrderByCreatedAtDesc(UUID borrowerId);

    Page<DataErasureRequest> findByOrganizationIdAndStatus(
            UUID organizationId, ErasureRequestStatus status, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM DataErasureRequest r WHERE r.id = :id")
    Optional<DataErasureRequest> findByIdForUpdate(@Param("id") UUID id);
}
