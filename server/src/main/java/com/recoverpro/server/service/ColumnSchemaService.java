package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.ColumnSchemaRequest;
import com.recoverpro.server.dto.response.ColumnSchemaResponse;

import java.util.List;
import java.util.UUID;

public interface ColumnSchemaService {

    ColumnSchemaResponse createColumnSchema(ColumnSchemaRequest request);

    ColumnSchemaResponse updateColumnSchema(UUID id, ColumnSchemaRequest request);

    List<ColumnSchemaResponse> getColumnSchemasByOrganization(UUID organizationId);

    void deactivateColumnSchema(UUID id);
}
