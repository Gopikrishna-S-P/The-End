package com.recoverpro.server.repository;

import com.recoverpro.server.entity.Payment;
import com.recoverpro.server.enums.PaymentProviderType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    Optional<Payment> findByProviderAndProviderPaymentId(PaymentProviderType provider, String providerPaymentId);

    List<Payment> findByOrganizationIdOrderByCreatedAtDesc(UUID organizationId);

    List<Payment> findByInvoiceId(UUID invoiceId);
}
