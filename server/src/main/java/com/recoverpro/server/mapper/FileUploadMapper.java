package com.recoverpro.server.mapper;

import com.recoverpro.server.dto.response.FileUploadResponse;
import com.recoverpro.server.entity.FileUpload;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(componentModel = "spring")
public interface FileUploadMapper {

    @Mapping(source = "organization.id", target = "organizationId")
    @Mapping(source = ".", target = "progressPercentage", qualifiedByName = "computeProgress")
    FileUploadResponse toResponse(FileUpload fileUpload);

    @Named("computeProgress")
    default Double computeProgress(FileUpload fileUpload) {
        if (fileUpload.getTotalRows() == null || fileUpload.getTotalRows() == 0) {
            return 0.0;
        }
        return (fileUpload.getProcessedRows() * 100.0) / fileUpload.getTotalRows();
    }
}
