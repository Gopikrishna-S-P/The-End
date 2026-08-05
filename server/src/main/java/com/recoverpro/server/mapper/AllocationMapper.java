package com.recoverpro.server.mapper;

import com.recoverpro.server.dto.response.AllocationResponse;
import com.recoverpro.server.entity.Allocation;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AllocationMapper {

    @Mapping(source = "fileUpload.id", target = "fileUploadId")
    @Mapping(source = "organization.id", target = "organizationId")
    AllocationResponse toResponse(Allocation allocation);
}
