package com.recoverpro.server.service.importer;

import lombok.Getter;

import java.util.List;

/**
 * Thrown by a processor when a single row cannot be imported. Carries per-column detail
 * so the failure lands in file_processing_errors the same way schema validation failures
 * do - one bad row is recorded and skipped, it never aborts the file.
 */
@Getter
public class RowValidationException extends RuntimeException {

    private final List<FieldError> fieldErrors;

    public RowValidationException(String column, String message, String rawValue) {
        this(List.of(new FieldError(column, message, rawValue)));
    }

    public RowValidationException(List<FieldError> fieldErrors) {
        super(fieldErrors.isEmpty() ? "Row validation failed" : fieldErrors.get(0).message());
        this.fieldErrors = List.copyOf(fieldErrors);
    }

    public record FieldError(String column, String message, String rawValue) {}
}
