package com.recoverpro.server.repository;

import com.recoverpro.server.entity.InvoiceLineItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface InvoiceLineItemRepository extends JpaRepository<InvoiceLineItem, UUID> {

    List<InvoiceLineItem> findByInvoiceId(UUID invoiceId);
}
