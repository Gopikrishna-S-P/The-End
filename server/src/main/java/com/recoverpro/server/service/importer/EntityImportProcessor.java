package com.recoverpro.server.service.importer;

import com.recoverpro.server.enums.UploadType;

import java.util.List;
import java.util.Map;

/**
 * Turns parsed file rows into one domain entity. Implementations are stateless singletons;
 * all per-file state lives in {@link ImportContext}.
 *
 * <p>The dispatcher owns parsing, schema validation, batching, progress and error recording.
 * A processor only decides what a row means and how a batch is persisted.
 *
 * @param <T> the entity this processor produces
 */
public interface EntityImportProcessor<T> {

    UploadType supportedType();

    /**
     * Every column this processor understands, in template order. Drives the downloadable
     * template and the upfront header check, so it must stay in step with {@link #mapRow}.
     */
    List<ImportFieldSpec> fieldSpecs();

    /**
     * Whether the dispatcher should bulk-resolve loan numbers to allocations before the
     * row loop. Collections, visits and PTPs all hang off an existing loan; the allocation
     * importer creates them and so needs no lookup.
     */
    default boolean requiresAllocationLookup() {
        return true;
    }

    /** Whether the dispatcher should bulk-resolve agent emails to users before the row loop. */
    default boolean requiresAgentLookup() {
        return true;
    }

    /**
     * @param rowNumber 1-based spreadsheet row as the user sees it (header is row 1)
     * @return the entity to persist, or null to skip the row without counting it as a failure
     *         (used for rows already present from an earlier upload)
     * @throws RowValidationException when the row is unusable; recorded per-column and skipped
     */
    T mapRow(Map<String, String> row, int rowNumber, ImportContext context) throws RowValidationException;

    void persistBatch(List<T> batch, ImportContext context);
}
