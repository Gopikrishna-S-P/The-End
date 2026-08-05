package com.recoverpro.server.repository;

import com.recoverpro.server.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, UUID> {

    Optional<PaymentTransaction> findByProviderTxnId(String providerTxnId);

    Optional<PaymentTransaction> findByUtr(String utr);

    List<PaymentTransaction> findByIntentIdOrderByCreatedAtDesc(UUID intentId);
}
