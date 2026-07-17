package com.recoverpro.server.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.recoverpro.server.enums.CollectionStatus;
import com.recoverpro.server.enums.PaymentMode;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CollectionResponse {

    private UUID id;
    private UUID allocationId;
    private UUID organizationId;
    private UUID submittedBy;
    private UUID approvedBy;
    private UUID depositedBy;
    private BigDecimal amount;
    private PaymentMode paymentMode;
    private CollectionStatus status;
    private String notes;
    private String rejectionReason;
    private String receiptNumber;
    private LocalDate collectionDate;
    private Instant approvedAt;
    private Instant depositedAt;
    private String chequeNumber;
    private LocalDate chequeDate;
    private String bankName;
    private String upiReferenceId;
    private String transactionReferenceId;
    private List<CollectionDocumentResponse> documents;
    private Instant createdAt;
    private Instant updatedAt;
}
