package com.recoverpro.server.dto.request;

import com.recoverpro.server.enums.AllocationStatus;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AllocationFilterRequest {

    private String searchTerm;
    private AllocationStatus status;
    private UUID fileUploadId;
    private UUID organizationId;
    private UUID assignedToUserId;
    private int page;
    private int size;
    private String sortBy;
    private String sortDirection;
}
