package com.recoverpro.server.repository;

import com.recoverpro.server.entity.PaymentSplit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentSplitRepository extends JpaRepository<PaymentSplit, UUID> {

    List<PaymentSplit> findByTxnIdOrderByBucketAsc(UUID txnId);
}
