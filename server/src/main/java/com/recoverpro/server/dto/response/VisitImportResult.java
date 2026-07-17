package com.recoverpro.server.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class VisitImportResult {

    private int total;
    private int imported;
    private int failed;
    private List<RowError> errors;

    @Getter
    @Builder
    public static class RowError {
        private int row;
        private String loanNumber;
        private String agentEmail;
        private String reason;
    }
}
