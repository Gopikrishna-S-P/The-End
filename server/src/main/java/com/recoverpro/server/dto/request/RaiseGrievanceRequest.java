package com.recoverpro.server.dto.request;

import com.recoverpro.server.enums.GrievanceCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class RaiseGrievanceRequest {

    private UUID allocationId;

    @Size(max = 200)
    private String borrowerName;

    @Size(max = 255)
    private String borrowerEmail;

    @Size(max = 30)
    private String borrowerPhone;

    @NotNull
    private GrievanceCategory category;

    @NotBlank
    @Size(max = 500)
    private String subject;

    @NotBlank
    private String description;

    @Size(max = 1024)
    private String evidenceUrl;
}
