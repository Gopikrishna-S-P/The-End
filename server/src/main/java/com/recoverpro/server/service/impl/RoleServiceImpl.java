package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.config.PlatformConstants;
import com.recoverpro.server.dto.request.CreateRoleRequest;
import com.recoverpro.server.dto.response.PermissionResponse;
import com.recoverpro.server.dto.response.RoleResponse;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.Permission;
import com.recoverpro.server.entity.Role;
import com.recoverpro.server.enums.PermissionScope;
import com.recoverpro.server.exception.RoleAlreadyExistsException;
import com.recoverpro.server.mapper.UserMapper;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.repository.PermissionRepository;
import com.recoverpro.server.repository.RoleRepository;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.RoleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final OrganizationRepository organizationRepository;
    private final UserMapper userMapper;

    @Override
    @Transactional(readOnly = true)
    public List<RoleResponse> listRolesForCaller() {
        UserPrincipal principal = currentPrincipal();
        List<Role> roles;
        if (isPlatformAdmin(principal)) {
            roles = roleRepository.findAll();
        } else {
            UUID orgId = principal.getOrganizationId();
            roles = orgId != null
                    ? roleRepository.findByOrganizationIdIsNullOrOrganizationId(orgId)
                    : roleRepository.findByOrganizationIdIsNull();
        }
        return enrichWithOrgNames(roles);
    }

    @Override
    @Transactional(readOnly = true)
    public RoleResponse getRoleById(UUID id) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + id));
        assertCanAccessRole(role);
        return enrichWithOrgName(role);
    }

    @Override
    public RoleResponse createRole(CreateRoleRequest request) {
        UserPrincipal principal = currentPrincipal();
        UUID organizationId = isPlatformAdmin(principal) ? null : principal.getOrganizationId();
        String roleName = request.getName().toUpperCase();

        if (organizationId == null) {
            if (roleRepository.existsByNameAndOrganizationIdIsNull(roleName))
                throw new RoleAlreadyExistsException("System role already exists: " + roleName);
        } else {
            if (roleRepository.existsByNameAndOrganizationId(roleName, organizationId))
                throw new RoleAlreadyExistsException("Role already exists in your organization: " + roleName);
        }

        Set<PermissionScope> allowedScopes = allowedScopesFor(principal);
        Set<Permission> permissions = request.getPermissionIds() != null && !request.getPermissionIds().isEmpty()
                ? permissionRepository.findByIdInAndScopeIn(request.getPermissionIds(), allowedScopes)
                : new HashSet<>();
        permissions = filterToCallerHeld(principal, permissions);

        Role saved = roleRepository.save(Role.builder()
                .name(roleName)
                .description(request.getDescription())
                .organizationId(organizationId)
                .permissions(permissions)
                .build());

        log.info("Created role: {} (org={})", saved.getName(), organizationId);
        return enrichWithOrgName(saved);
    }

    @Override
    public RoleResponse updateRolePermissions(UUID roleId, Set<UUID> permissionIds) {
        UserPrincipal principal = currentPrincipal();
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + roleId));

        assertCanModifyRole(principal, role);

        Set<PermissionScope> allowedScopes = allowedScopesFor(principal);
        Set<Permission> permissions = permissionIds != null && !permissionIds.isEmpty()
                ? permissionRepository.findByIdInAndScopeIn(permissionIds, allowedScopes)
                : new HashSet<>();
        role.setPermissions(filterToCallerHeld(principal, permissions));

        Role saved = roleRepository.save(role);
        return enrichWithOrgName(saved);
    }

    @Override
    public void deleteRole(UUID id) {
        UserPrincipal principal = currentPrincipal();
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + id));

        assertCanModifyRole(principal, role);
        if (role.getOrganizationId() == null) {
            throw new IllegalArgumentException("Cannot delete system roles");
        }
        roleRepository.delete(role);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PermissionResponse> listPermissionsForCaller() {
        UserPrincipal principal = currentPrincipal();
        Set<Permission> assignable = filterToCallerHeld(principal,
                new HashSet<>(permissionRepository.findByScopeIn(allowedScopesFor(principal))));
        return assignable.stream()
                .sorted(Comparator.comparing(Permission::getName))
                .map(userMapper::toPermissionResponse)
                .collect(Collectors.toList());
    }

    // ─── helpers ─────────────────────────────────────────────────────────────

    private UserPrincipal currentPrincipal() {
        return (UserPrincipal) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    private boolean isPlatformAdmin(UserPrincipal p) {
        return p.getAuthorities().stream()
                .anyMatch(a -> PlatformConstants.ROLE_PLATFORM_ADMIN.equals(a.getAuthority()));
    }

    private Set<PermissionScope> allowedScopesFor(UserPrincipal p) {
        return isPlatformAdmin(p) ? EnumSet.allOf(PermissionScope.class) : EnumSet.of(PermissionScope.ORG);
    }

    private Set<Permission> filterToCallerHeld(UserPrincipal p, Set<Permission> requested) {
        if (isPlatformAdmin(p)) return requested;
        Set<String> held = p.getAuthorities().stream()
                .map(org.springframework.security.core.GrantedAuthority::getAuthority)
                .filter(a -> !a.startsWith("ROLE_"))
                .collect(Collectors.toSet());
        return requested.stream()
                .filter(perm -> held.contains(perm.getName()))
                .collect(Collectors.toSet());
    }

    private void assertCanAccessRole(Role role) {
        UserPrincipal p = currentPrincipal();
        if (isPlatformAdmin(p)) return;
        if (role.getOrganizationId() != null && !role.getOrganizationId().equals(p.getOrganizationId())) {
            throw new AccessDeniedException("Access denied to role in another organization");
        }
    }

    private void assertCanModifyRole(UserPrincipal p, Role role) {
        if (isPlatformAdmin(p)) return;
        if (role.getOrganizationId() == null) throw new AccessDeniedException("Cannot modify system roles");
        if (!role.getOrganizationId().equals(p.getOrganizationId()))
            throw new AccessDeniedException("Cannot modify roles from another organization");
    }

    private RoleResponse enrichWithOrgName(Role role) {
        RoleResponse resp = userMapper.toRoleResponse(role);
        if (role.getOrganizationId() != null) {
            organizationRepository.findById(role.getOrganizationId())
                    .map(Organization::getName).ifPresent(resp::setOrganizationName);
        }
        return resp;
    }

    private List<RoleResponse> enrichWithOrgNames(List<Role> roles) {
        Set<UUID> orgIds = roles.stream()
                .filter(r -> r.getOrganizationId() != null)
                .map(Role::getOrganizationId).collect(Collectors.toSet());
        Map<UUID, String> orgNames = orgIds.isEmpty() ? Map.of()
                : organizationRepository.findAllById(orgIds).stream()
                        .collect(Collectors.toMap(Organization::getId, Organization::getName));
        return roles.stream().map(r -> {
            RoleResponse resp = userMapper.toRoleResponse(r);
            if (r.getOrganizationId() != null)
                resp.setOrganizationName(orgNames.getOrDefault(r.getOrganizationId(), null));
            return resp;
        }).collect(Collectors.toList());
    }
}
