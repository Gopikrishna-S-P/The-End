package com.recoverpro.server.mapper;

import com.recoverpro.server.dto.response.CollectionResponse;
import com.recoverpro.server.entity.Collection;
import org.springframework.stereotype.Component;

@Component
public class CollectionMapper {

    public CollectionResponse toResponse(Collection c) {
        if (c == null) return null;
        return CollectionResponse.builder()
                .id(c.getId())
                .allocationId(c.getAllocationId())
                .organizationId(c.getOrganizationId())
                .submittedBy(c.getSubmittedBy())
                .approvedBy(c.getApprovedBy())
                .depositedBy(c.getDepositedBy())
                .amount(c.getAmount())
                .paymentMode(c.getPaymentMode())
                .status(c.getStatus())
                .notes(c.getNotes())
                .rejectionReason(c.getRejectionReason())
                .receiptNumber(c.getReceiptNumber())
                .collectionDate(c.getCollectionDate())
                .approvedAt(c.getApprovedAt())
                .depositedAt(c.getDepositedAt())
                .chequeNumber(c.getChequeNumber())
                .chequeDate(c.getChequeDate())
                .bankName(c.getBankName())
                .upiReferenceId(c.getUpiReferenceId())
                .transactionReferenceId(c.getTransactionReferenceId())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
