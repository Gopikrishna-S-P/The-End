package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.ColumnSchemaRequest;
import com.recoverpro.server.dto.response.ColumnSchemaResponse;
import com.recoverpro.server.enums.UploadType;

import java.util.List;
import java.util.UUID;

public interface ColumnSchemaService {

    ColumnSchemaResponse createColumnSchema(ColumnSchemaRequest request);

    ColumnSchemaResponse updateColumnSchema(UUID id, ColumnSchemaRequest request);

    List<ColumnSchemaResponse> getColumnSchemasByOrganization(UUID organizationId);

    /** @param entityType null returns every entity's columns, preserving the original behaviour */
    List<ColumnSchemaResponse> getColumnSchemasByOrganization(UUID organizationId, UploadType entityType);

    void deactivateColumnSchema(UUID id);
}
