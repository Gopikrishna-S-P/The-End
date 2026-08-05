package com.recoverpro.server.mapper;

import com.recoverpro.server.dto.response.ColumnSchemaResponse;
import com.recoverpro.server.entity.ColumnSchema;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ColumnSchemaMapper {

    @Mapping(source = "organization.id", target = "organizationId")
    ColumnSchemaResponse toResponse(ColumnSchema columnSchema);
}
