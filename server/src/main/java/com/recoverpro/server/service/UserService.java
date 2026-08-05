package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.AssignRoleRequest;
import com.recoverpro.server.dto.request.CreateUserRequest;
import com.recoverpro.server.dto.request.UpdateUserRequest;
import com.recoverpro.server.dto.response.PageResponse;
import com.recoverpro.server.dto.response.UserPermissionsResponse;
import com.recoverpro.server.dto.response.UserResponse;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface UserService {

    UserResponse getUserById(UUID id);

    UserResponse getCurrentUser(UUID userId);

    PageResponse<UserResponse> listUsers(UUID callerOrgId, Pageable pageable);

    UserResponse getOrgUser(UUID callerOrgId, UUID targetUserId);

    UserResponse createUser(UUID callerOrgId, CreateUserRequest request);

    UserResponse updateUser(UUID callerOrgId, UUID targetUserId, UpdateUserRequest request);

    UserResponse assignRole(UUID callerOrgId, UUID targetUserId, AssignRoleRequest request);

    UserResponse removeRole(UUID callerOrgId, UUID targetUserId, String roleName);

    void enableUser(UUID callerOrgId, UUID targetUserId);

    void disableUser(UUID callerOrgId, UUID targetUserId);

    void deleteUser(UUID callerOrgId, UUID targetUserId);

    List<UserResponse> listUsersByRole(UUID callerOrgId, String roleName);

    UserPermissionsResponse getUserPermissions(UUID callerOrgId, UUID targetUserId);

    UserPermissionsResponse grantDirectPermission(UUID callerOrgId, UUID targetUserId,
                                                   String permissionName, UUID grantedByUserId);

    UserPermissionsResponse revokeDirectPermission(UUID callerOrgId, UUID targetUserId,
                                                    String permissionName);
}
