package com.recoverpro.server.mapper;

import com.recoverpro.server.dto.response.PermissionResponse;
import com.recoverpro.server.dto.response.RoleResponse;
import com.recoverpro.server.dto.response.UserResponse;
import com.recoverpro.server.entity.Permission;
import com.recoverpro.server.entity.Role;
import com.recoverpro.server.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.Set;
import java.util.stream.Collectors;

@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "roles", expression = "java(mapRoles(user.getRoles()))")
    @Mapping(target = "organizationId", source = "organizationId")
    UserResponse toResponse(User user);

    default Set<RoleResponse> mapRoles(Set<Role> roles) {
        if (roles == null) return Set.of();
        return roles.stream().map(this::toRoleResponse).collect(Collectors.toSet());
    }

    @Mapping(target = "permissions", expression = "java(mapPermissions(role.getPermissions()))")
    @Mapping(target = "systemRole", expression = "java(role.getOrganizationId() == null)")
    RoleResponse toRoleResponse(Role role);

    default Set<PermissionResponse> mapPermissions(Set<Permission> permissions) {
        if (permissions == null) return Set.of();
        return permissions.stream().map(this::toPermissionResponse).collect(Collectors.toSet());
    }

    @Mapping(target = "scope", expression = "java(permission.getScope() != null ? permission.getScope().name() : null)")
    PermissionResponse toPermissionResponse(Permission permission);
}
