package com.recoverpro.server.dto.response;

import lombok.Builder;
import lombok.Data;

/** Matches web/src/api/platformApi.ts's InvoiceRow exactly. */
@Data
@Builder
public class InvoiceResponse {
    private String id;
    private String number;
    private String status;
    private long amountPaid;
    private String currency;
    private String date;
    private String pdfUrl;
    private String hostedUrl;
}
