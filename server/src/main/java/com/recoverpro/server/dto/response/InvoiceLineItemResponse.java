package com.recoverpro.server.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class InvoiceLineItemResponse {
    private UUID id;
    private UUID invoiceId;
    private String description;
    private long unitAmount;
    private Integer taxRateBps;
    private long cgstAmount;
    private long sgstAmount;
    private long igstAmount;
    private String placeOfSupplyStateCode;
    private long lineTotal;
    private String currency;
}
