package com.recoverpro.server.dto.response;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadDataResponse {
    private UUID uploadId;
    private String filename;
    private String status;
    private List<String> columns;
    private List<UploadRowResponse> rows;
    private long totalElements;
    private int totalPages;
    private int currentPage;
    private int pageSize;
}
