package com.recoverpro.server.service;

import com.recoverpro.server.dto.response.UploadDataResponse;
import com.recoverpro.server.dto.response.UploadRowResponse;

import java.util.Map;
import java.util.UUID;

public interface UploadDataService {
    UploadDataResponse getRows(UUID uploadId, int page, int size);
    UploadRowResponse addRow(UUID uploadId, Map<String, Object> data, UUID userId);
    UploadRowResponse updateRow(UUID uploadId, UUID rowId, Map<String, Object> data);
    void deleteRow(UUID uploadId, UUID rowId, UUID userId);
    void addColumn(UUID uploadId, String columnName, String defaultValue);
    void deleteColumn(UUID uploadId, String columnName);
}
