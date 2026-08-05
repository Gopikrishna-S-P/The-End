package com.recoverpro.server.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
public class LedgerBalanceResponse {

    private UUID organizationId;
    private Instant asOf;
    private List<AccountBalance> accounts;

    @Getter
    @Builder
    public static class AccountBalance {
        private String account;
        private BigDecimal totalDebits;
        private BigDecimal totalCredits;
    }
}
