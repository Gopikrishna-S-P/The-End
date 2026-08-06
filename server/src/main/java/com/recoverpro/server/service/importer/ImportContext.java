package com.recoverpro.server.service.importer;

import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.ColumnSchema;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.User;
import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Everything a processor needs for one file, resolved once up front rather than per row.
 * The lookup maps are bulk-loaded by the dispatcher before the row loop, so a 5,000-row
 * file issues two queries instead of 10,000.
 */
@Getter
@Builder
public class ImportContext {

    private final Organization organization;
    private final FileUpload fileUpload;
    private final UUID importedByUserId;

    /**
     * When true the rows describe events that already happened, so processors must not
     * fire reminders, escalation or approval routing off the back of them.
     */
    private final boolean historicalImport;

    private final List<ColumnSchema> columnSchemas;

    /** Schema column name -> the actual header found in the file. */
    private final Map<String, String> headerMappings;

    /** Pre-resolved parent loans, keyed by loan number. Empty when the processor didn't ask. */
    @Builder.Default
    private final Map<String, Allocation> allocationsByLoanNumber = Map.of();

    /** Pre-resolved agents, keyed by lower-cased email. Empty when the processor didn't ask. */
    @Builder.Default
    private final Map<String, User> usersByEmail = Map.of();

    public UUID organizationId() {
        return organization.getId();
    }
}
