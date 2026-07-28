package com.recoverpro.server.controller;

import com.recoverpro.server.common.dto.response.ApiResponse;
import com.recoverpro.server.dto.request.CreateRoleRequest;
import com.recoverpro.server.dto.response.PermissionResponse;
import com.recoverpro.server.dto.response.RoleResponse;
import com.recoverpro.server.service.RoleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
public class RoleController {

    private static final String ADMIN_ROLES = "hasAnyRole('PLATFORM_ADMIN','ORG_ADMIN')";
    // A custom role granted ROLE_ASSIGN via Role Management can edit role permissions without
    // needing ORG_ADMIN/PLATFORM_ADMIN — see UserController's matching CAN_CREATE_USER.
    private static final String CAN_ASSIGN_ROLE = ADMIN_ROLES + " or hasAuthority('ROLE_ASSIGN')";

    private final RoleService roleService;

    @GetMapping
    @PreAuthorize(CAN_ASSIGN_ROLE)
    public ResponseEntity<ApiResponse<List<RoleResponse>>> listRoles() {
        return ResponseEntity.ok(ApiResponse.success(roleService.listRolesForCaller()));
    }

    @GetMapping("/{id}")
    @PreAuthorize(CAN_ASSIGN_ROLE)
    public ResponseEntity<ApiResponse<RoleResponse>> getRole(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(roleService.getRoleById(id)));
    }

    @PostMapping
    @PreAuthorize(ADMIN_ROLES)
    public ResponseEntity<ApiResponse<RoleResponse>> createRole(
            @Valid @RequestBody CreateRoleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(roleService.createRole(request)));
    }

    @PatchMapping("/{id}/permissions")
    @PreAuthorize(CAN_ASSIGN_ROLE)
    public ResponseEntity<ApiResponse<RoleResponse>> updatePermissions(
            @PathVariable UUID id,
            @RequestBody Set<UUID> permissionIds) {
        return ResponseEntity.ok(ApiResponse.success(roleService.updateRolePermissions(id, permissionIds)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(ADMIN_ROLES)
    public ResponseEntity<ApiResponse<Void>> deleteRole(@PathVariable UUID id) {
        roleService.deleteRole(id);
        return ResponseEntity.ok(ApiResponse.of("Role deleted", null));
    }

    @GetMapping("/permissions")
    @PreAuthorize(ADMIN_ROLES)
    public ResponseEntity<ApiResponse<List<PermissionResponse>>> listPermissions() {
        return ResponseEntity.ok(ApiResponse.success(roleService.listPermissionsForCaller()));
    }
}
