package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.CreateRoleRequest;
import com.recoverpro.server.dto.response.PermissionResponse;
import com.recoverpro.server.dto.response.RoleResponse;

import java.util.List;
import java.util.Set;
import java.util.UUID;

public interface RoleService {
    List<RoleResponse> listRolesForCaller();
    RoleResponse getRoleById(UUID id);
    RoleResponse createRole(CreateRoleRequest request);
    RoleResponse updateRolePermissions(UUID roleId, Set<UUID> permissionIds);
    void deleteRole(UUID id);
    List<PermissionResponse> listPermissionsForCaller();
}
