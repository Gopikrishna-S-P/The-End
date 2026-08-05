package com.recoverpro.server.repository;

import com.recoverpro.server.entity.PaymentIntent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentIntentRepository extends JpaRepository<PaymentIntent, UUID> {

    Optional<PaymentIntent> findByIdempotencyKey(String idempotencyKey);

    Page<PaymentIntent> findByOrganizationId(UUID organizationId, Pageable pageable);

    Page<PaymentIntent> findByAllocationId(UUID allocationId, Pageable pageable);
}
