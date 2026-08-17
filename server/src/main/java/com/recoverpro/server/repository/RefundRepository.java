package com.recoverpro.server.repository;

import com.recoverpro.server.entity.Refund;
import com.recoverpro.server.enums.RefundStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RefundRepository extends JpaRepository<Refund, UUID> {

    List<Refund> findByInvoiceId(UUID invoiceId);

    List<Refund> findByInvoiceIdAndStatus(UUID invoiceId, RefundStatus status);
}
