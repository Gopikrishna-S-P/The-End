package com.recoverpro.server.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class IngestStatementRequest {

    @NotNull
    private UUID organizationId;

    @NotNull
    @Size(max = 50)
    private String source;

    @NotNull
    private LocalDate asOfDate;

    @NotEmpty
    @Valid
    private List<BankStatementRowRequest> rows;

    /**
     * SHA-256 hex digest of the original statement file. When provided,
     * re-ingesting the same file returns the existing run (idempotent).
     */
    @Pattern(regexp = "[a-f0-9]{64}", message = "statementHash must be a 64-character hex SHA-256 digest")
    private String statementHash;
}