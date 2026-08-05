package com.recoverpro.server.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileUploadRequest {

    @NotNull(message = "File is required")
    private MultipartFile file;

    @NotNull(message = "Organization ID is required")
    private UUID organizationId;
}
