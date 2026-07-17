package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.dto.request.ColumnSchemaRequest;
import com.recoverpro.server.dto.response.ColumnSchemaResponse;
import com.recoverpro.server.service.ColumnSchemaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/column-schemas")
@RequiredArgsConstructor
public class ColumnSchemaController {

    private static final String ADMINS = "hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN')";

    private final ColumnSchemaService columnSchemaService;

    @PreAuthorize(ADMINS)
    @PostMapping
    public ResponseEntity<ApiResponse<ColumnSchemaResponse>> createColumnSchema(
            @Valid @RequestBody ColumnSchemaRequest request) {
        log.info("POST /column-schemas - name: {}, orgId: {}", request.getName(), request.getOrganizationId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.of("Column schema created successfully",
                        columnSchemaService.createColumnSchema(request)));
    }

    @PreAuthorize(ADMINS)
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ColumnSchemaResponse>> updateColumnSchema(
            @PathVariable UUID id,
            @Valid @RequestBody ColumnSchemaRequest request) {
        return ResponseEntity.ok(ApiResponse.of("Column schema updated successfully",
                columnSchemaService.updateColumnSchema(id, request)));
    }

    @PreAuthorize(ADMINS)
    @GetMapping
    public ResponseEntity<ApiResponse<List<ColumnSchemaResponse>>> getColumnSchemas(
            @RequestParam UUID organizationId) {
        return ResponseEntity.ok(ApiResponse.success(
                columnSchemaService.getColumnSchemasByOrganization(organizationId)));
    }

    @PreAuthorize(ADMINS)
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deactivateColumnSchema(@PathVariable UUID id) {
        columnSchemaService.deactivateColumnSchema(id);
        return ResponseEntity.ok(ApiResponse.of("Column schema deactivated successfully", null));
    }
}
