package com.recoverpro.server.repository;

import com.recoverpro.server.entity.Credit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CreditRepository extends JpaRepository<Credit, UUID> {

    Page<Credit> findByOrganizationIdOrderByCreatedAtDesc(UUID organizationId, Pageable pageable);
}
