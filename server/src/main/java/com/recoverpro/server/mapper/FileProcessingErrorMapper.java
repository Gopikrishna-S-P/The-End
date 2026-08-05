package com.recoverpro.server.mapper;

import com.recoverpro.server.dto.response.FileProcessingErrorResponse;
import com.recoverpro.server.entity.FileProcessingError;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface FileProcessingErrorMapper {

    @Mapping(source = "fileUpload.id", target = "fileUploadId")
    FileProcessingErrorResponse toResponse(FileProcessingError error);
}
