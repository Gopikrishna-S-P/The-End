package com.recoverpro.server.config;

import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.Permission;
import com.recoverpro.server.entity.Role;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.OrganizationType;
import com.recoverpro.server.enums.PermissionScope;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.repository.PermissionRepository;
import com.recoverpro.server.repository.RoleRepository;
import com.recoverpro.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Idempotently seeds the platform's bootstrap state on every startup:
 *   - The "RecoverPro" platform organization
 *   - The full permission catalog (ORG_*, USER_*, FILE_*, CASE_*, VISIT_*, …)
 *   - The system role catalog (PLATFORM_ADMIN, ORG_ADMIN, MANAGER, TL, FO, CALLER, TRACER)
 *   - The platform admin user with PLATFORM_ADMIN role
 *
 * Re-running the seeder never duplicates rows; every check is "find or create."
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private static final String PLATFORM_ORG_NAME      = "RecoverPro";

    private final OrganizationRepository orgRepo;
    private final PermissionRepository permRepo;
    private final RoleRepository roleRepo;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    // No hardcoded default -- an auto-generated/known bootstrap password would give
    // every reader of this source (git history included) platform-admin access to
    // whatever database this seeder ever runs against. Must be set explicitly per
    // environment (gitignored .env locally, the real deploy's own secret store in
    // production); startup refuses to create the account without it.
    @Value("${app.platform-admin.bootstrap-password:}")
    private String bootstrapPassword;

    @Override
    @Transactional
    public void run(String... args) {
        log.info("DataSeeder: starting bootstrap seed");

        Organization platformOrg = seedPlatformOrganization();
        List<Permission> allPermissions = seedPermissionCatalog();
        Map<String, Role> roles = seedRoleCatalog(allPermissions);
        seedPlatformAdmin(platformOrg, roles.get(PlatformConstants.ROLE_PLATFORM_ADMIN));

        log.info("DataSeeder: bootstrap seed complete");
    }

    // ─────────────────────────────────────────────────────────────────────────

    private Organization seedPlatformOrganization() {
        return orgRepo.findAll().stream()
                .filter(o -> PlatformConstants.PLATFORM_ORG_CODE.equalsIgnoreCase(o.getCode()))
                .findFirst()
                .orElseGet(() -> {
                    Organization o = Organization.builder()
                            .name(PLATFORM_ORG_NAME)
                            .code(PlatformConstants.PLATFORM_ORG_CODE)
                            .organizationType(OrganizationType.PLATFORM)
                            .isActive(true)
                            .build();
                    Organization saved = orgRepo.save(o);
                    log.info("DataSeeder: created platform organization id={}", saved.getId());
                    return saved;
                });
    }

    private List<Permission> seedPermissionCatalog() {
        List<PermissionDef> catalog = List.of(
                // Organization & user lifecycle (platform-scoped)
                new PermissionDef("ORG_CREATE",         "organization", "create", PermissionScope.PLATFORM),
                new PermissionDef("ORG_UPDATE",         "organization", "update", PermissionScope.PLATFORM),
                new PermissionDef("ORG_DELETE",         "organization", "delete", PermissionScope.PLATFORM),
                new PermissionDef("ORG_VIEW",           "organization", "view",   PermissionScope.PLATFORM),

                // User management (org-scoped)
                new PermissionDef("USER_CREATE",        "user", "create", PermissionScope.ORG),
                new PermissionDef("USER_UPDATE",        "user", "update", PermissionScope.ORG),
                new PermissionDef("USER_DELETE",        "user", "delete", PermissionScope.ORG),
                new PermissionDef("USER_VIEW",          "user", "view",   PermissionScope.ORG),
                new PermissionDef("ROLE_ASSIGN",        "role", "assign", PermissionScope.ORG),
                new PermissionDef("PERMISSION_ASSIGN",  "permission", "assign", PermissionScope.ORG),

                // Allocation file
                new PermissionDef("FILE_UPLOAD",        "file", "upload", PermissionScope.ORG),
                new PermissionDef("FILE_VIEW",          "file", "view",   PermissionScope.ORG),
                new PermissionDef("FILE_DELETE",        "file", "delete", PermissionScope.ORG),
                new PermissionDef("CELL_UPDATE",        "row",  "update_cell",  PermissionScope.ORG),
                new PermissionDef("ROW_CREATE",         "row",  "create", PermissionScope.ORG),
                new PermissionDef("ROW_UPDATE",         "row",  "update", PermissionScope.ORG),
                new PermissionDef("ROW_DELETE",         "row",  "delete", PermissionScope.ORG),
                new PermissionDef("COLUMN_CREATE",      "column", "create", PermissionScope.ORG),
                new PermissionDef("COLUMN_DELETE",      "column", "delete", PermissionScope.ORG),

                // Case allocation lifecycle
                new PermissionDef("CASE_VIEW",          "case", "view",     PermissionScope.ORG),
                new PermissionDef("CASE_ASSIGN",        "case", "assign",   PermissionScope.ORG),
                new PermissionDef("CASE_REASSIGN",      "case", "reassign", PermissionScope.ORG),
                new PermissionDef("CASE_VIEW_UNASSIGNED", "case", "view_unassigned", PermissionScope.ORG),

                // Daily dispatch
                new PermissionDef("DAILY_DISPATCH_CREATE", "daily_dispatch", "create", PermissionScope.ORG),
                new PermissionDef("DAILY_DISPATCH_VIEW",   "daily_dispatch", "view",   PermissionScope.ORG),

                // Visit / collection / PTP / non-contactable
                new PermissionDef("VISIT_SUBMIT",       "visit", "submit", PermissionScope.ORG),
                new PermissionDef("VISIT_VIEW",         "visit", "view",   PermissionScope.ORG),
                new PermissionDef("COLLECTION_CREATE",  "collection", "create", PermissionScope.ORG),
                new PermissionDef("COLLECTION_VIEW",    "collection", "view",   PermissionScope.ORG),
                new PermissionDef("PTP_CREATE",         "ptp", "create", PermissionScope.ORG),
                new PermissionDef("PTP_VIEW",           "ptp", "view",   PermissionScope.ORG),
                new PermissionDef("NON_CONTACTABLE_CREATE", "non_contactable", "create", PermissionScope.ORG),

                // Audit
                new PermissionDef("AUDIT_VIEW",         "audit", "view", PermissionScope.ORG),
                new PermissionDef("AUDIT_VIEW_PLATFORM","audit", "view_platform", PermissionScope.PLATFORM)
        );

        List<Permission> result = new ArrayList<>(catalog.size());
        for (PermissionDef def : catalog) {
            Permission p = permRepo.findByName(def.name).orElseGet(() -> {
                Permission np = Permission.builder()
                        .name(def.name)
                        .resource(def.resource)
                        .action(def.action)
                        .scope(def.scope)
                        .description(def.name + " -- " + def.action + " on " + def.resource)
                        .build();
                Permission saved = permRepo.save(np);
                log.info("DataSeeder: created permission {}", saved.getName());
                return saved;
            });
            result.add(p);
        }
        return result;
    }

    private Map<String, Role> seedRoleCatalog(List<Permission> all) {
        Map<String, Permission> byName = new HashMap<>();
        all.forEach(p -> byName.put(p.getName(), p));

        Set<Permission> allPerms = new HashSet<>(all);

        Set<Permission> orgAdminPerms = pick(byName,
                "USER_CREATE", "USER_UPDATE", "USER_DELETE", "USER_VIEW",
                "ROLE_ASSIGN", "PERMISSION_ASSIGN",
                "FILE_UPLOAD", "FILE_VIEW", "FILE_DELETE",
                "CELL_UPDATE", "ROW_CREATE", "ROW_UPDATE", "ROW_DELETE",
                "COLUMN_CREATE", "COLUMN_DELETE",
                "CASE_VIEW", "CASE_ASSIGN", "CASE_REASSIGN", "CASE_VIEW_UNASSIGNED",
                "DAILY_DISPATCH_CREATE", "DAILY_DISPATCH_VIEW",
                "VISIT_VIEW", "COLLECTION_VIEW", "PTP_VIEW", "AUDIT_VIEW");

        Set<Permission> managerPerms = pick(byName,
                "FILE_VIEW", "CELL_UPDATE", "ROW_CREATE", "ROW_UPDATE", "ROW_DELETE",
                "COLUMN_CREATE", "COLUMN_DELETE",
                "CASE_VIEW", "CASE_ASSIGN", "CASE_REASSIGN", "CASE_VIEW_UNASSIGNED",
                "DAILY_DISPATCH_CREATE", "DAILY_DISPATCH_VIEW",
                "VISIT_VIEW", "COLLECTION_VIEW", "PTP_VIEW", "USER_VIEW", "AUDIT_VIEW");

        Set<Permission> tlPerms = pick(byName,
                "FILE_VIEW", "CELL_UPDATE", "ROW_CREATE", "ROW_UPDATE", "ROW_DELETE",
                "CASE_VIEW", "CASE_ASSIGN", "CASE_REASSIGN", "CASE_VIEW_UNASSIGNED",
                "DAILY_DISPATCH_CREATE", "DAILY_DISPATCH_VIEW",
                "VISIT_VIEW", "COLLECTION_VIEW", "PTP_VIEW", "USER_VIEW");

        Set<Permission> foPerms = pick(byName,
                "FILE_VIEW",
                "CASE_VIEW", "CASE_VIEW_UNASSIGNED",
                "DAILY_DISPATCH_VIEW",
                "VISIT_SUBMIT", "VISIT_VIEW",
                "COLLECTION_CREATE", "PTP_CREATE", "NON_CONTACTABLE_CREATE");

        Set<Permission> callerPerms = pick(byName,
                "FILE_VIEW", "CASE_VIEW", "PTP_CREATE", "PTP_VIEW", "NON_CONTACTABLE_CREATE");

        Set<Permission> tracerPerms = pick(byName,
                "FILE_VIEW", "CASE_VIEW", "NON_CONTACTABLE_CREATE");

        Map<String, Role> map = new HashMap<>();
        map.put(PlatformConstants.ROLE_PLATFORM_ADMIN,
                ensureSystemRole(PlatformConstants.ROLE_PLATFORM_ADMIN, "Full platform superuser", allPerms));
        map.put(PlatformConstants.ROLE_ORG_ADMIN,
                ensureSystemRole(PlatformConstants.ROLE_ORG_ADMIN,     "Organization administrator", orgAdminPerms));
        map.put(PlatformConstants.ROLE_MANAGER,
                ensureSystemRole(PlatformConstants.ROLE_MANAGER,       "Operations manager",         managerPerms));
        map.put(PlatformConstants.ROLE_TL,
                ensureSystemRole(PlatformConstants.ROLE_TL,            "Team Lead",                  tlPerms));
        map.put(PlatformConstants.ROLE_FO,
                ensureSystemRole(PlatformConstants.ROLE_FO,            "Field Officer",              foPerms));
        map.put(PlatformConstants.ROLE_CALLER,
                ensureSystemRole(PlatformConstants.ROLE_CALLER,        "Caller",                     callerPerms));
        map.put(PlatformConstants.ROLE_TRACER,
                ensureSystemRole(PlatformConstants.ROLE_TRACER,        "Tracer",                     tracerPerms));
        return map;
    }

    private Role ensureSystemRole(String name, String description, Set<Permission> perms) {
        Role role = roleRepo.findByNameAndOrganizationIdIsNull(name).orElseGet(() -> {
            Role r = Role.builder()
                    .name(name)
                    .description(description)
                    .organizationId(null)
                    .permissions(new HashSet<>())
                    .build();
            Role saved = roleRepo.save(r);
            log.info("DataSeeder: created system role {}", saved.getName());
            return saved;
        });
        Set<Permission> current = role.getPermissions();
        if (current == null || !current.equals(perms)) {
            role.setPermissions(new HashSet<>(perms));
            roleRepo.save(role);
        }
        return role;
    }

    private void seedPlatformAdmin(Organization platformOrg, Role platformAdminRole) {
        userRepo.findByEmailIgnoreCase(PlatformConstants.PLATFORM_ADMIN_EMAIL).ifPresentOrElse(
                u -> {
                    boolean dirty = false;
                    if (u.getOrganizationId() == null
                            || !u.getOrganizationId().equals(platformOrg.getId())) {
                        u.setOrganizationId(platformOrg.getId());
                        dirty = true;
                    }
                    if (u.getRoles().stream().noneMatch(
                            r -> PlatformConstants.ROLE_PLATFORM_ADMIN.equals(r.getName()))) {
                        u.getRoles().add(platformAdminRole);
                        dirty = true;
                    }
                    if (dirty) {
                        userRepo.save(u);
                        log.info("DataSeeder: reconciled platform admin user");
                    }
                },
                () -> {
                    if (bootstrapPassword == null || bootstrapPassword.isBlank()) {
                        throw new IllegalStateException(
                                "No platform admin user exists yet and app.platform-admin.bootstrap-password "
                                        + "(env PLATFORM_ADMIN_BOOTSTRAP_PASSWORD) is empty. Refusing to start: "
                                        + "set that variable to create the initial platform admin account.");
                    }
                    User u = User.builder()
                            .email(PlatformConstants.PLATFORM_ADMIN_EMAIL)
                            .passwordHash(passwordEncoder.encode(bootstrapPassword))
                            .firstName("Platform")
                            .lastName("Admin")
                            .enabled(true)
                            .accountLocked(false)
                            .mfaEnabled(false)
                            .organizationId(platformOrg.getId())
                            .build();
                    u.getRoles().add(platformAdminRole);
                    userRepo.save(u);
                    log.info("DataSeeder: created platform admin user {}", PlatformConstants.PLATFORM_ADMIN_EMAIL);
                }
        );
    }

    // ─── helpers ─────────────────────────────────────────────────────────────

    private static Set<Permission> pick(Map<String, Permission> byName, String... names) {
        Set<Permission> out = new HashSet<>();
        for (String n : names) {
            Permission p = byName.get(n);
            if (p != null) out.add(p);
        }
        return out;
    }

    private record PermissionDef(String name, String resource, String action, PermissionScope scope) {
    }
}
