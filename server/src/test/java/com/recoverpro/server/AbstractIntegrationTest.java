package com.recoverpro.server;

import com.recoverpro.server.config.PlatformConstants;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.Role;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.OrganizationType;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.repository.RoleRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class AbstractIntegrationTest {

    @LocalServerPort
    protected int port;

    @Autowired protected TestRestTemplate restTemplate;
    @Autowired protected OrganizationRepository organizationRepository;
    @Autowired protected UserRepository userRepository;
    @Autowired protected RoleRepository roleRepository;
    @Autowired protected PasswordEncoder passwordEncoder;
    @Autowired protected JwtTokenProvider jwtTokenProvider;

    private final List<UUID> createdUserIds = new ArrayList<>();
    private final List<UUID> createdOrgIds = new ArrayList<>();

    protected String baseUrl(String path) {
        return "http://localhost:" + port + path;
    }

    protected Organization createOrg(String namePrefix) {
        Organization org = Organization.builder()
                .name(namePrefix + "-" + UUID.randomUUID())
                .code(("T" + UUID.randomUUID().toString().replace("-", "")).substring(0, 20))
                .organizationType(OrganizationType.ORGANIZATION)
                .isActive(true)
                .lookupHashPepper(UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", ""))
                .build();
        org = organizationRepository.save(org);
        createdOrgIds.add(org.getId());
        return org;
    }

    /**
     * org == null produces a platform-admin-style user with no tenant org.
     * A DB trigger (fn_enforce_single_platform_admin) permits only one
     * ROLE_PLATFORM_ADMIN user system-wide, so requesting that role reuses
     * the V017-migration-seeded bootstrap admin instead of inserting a new one
     * — it is never added to createdUserIds and is never cleaned up.
     */
    protected String tokenFor(Organization org, String... roleNames) {
        boolean isPlatformAdmin = java.util.Arrays.asList(roleNames).contains(PlatformConstants.ROLE_PLATFORM_ADMIN);
        if (isPlatformAdmin) {
            User bootstrapAdmin = userRepository.findByEmailIgnoreCase(PlatformConstants.PLATFORM_ADMIN_EMAIL)
                    .orElseThrow(() -> new IllegalStateException("Bootstrap platform admin not seeded"));
            UserPrincipal adminPrincipal = new UserPrincipal(bootstrapAdmin);
            return jwtTokenProvider.generateAccessToken(adminPrincipal, bootstrapAdmin.getId());
        }

        Set<Role> roles = new HashSet<>();
        for (String roleName : roleNames) {
            roles.add(roleRepository.findByName(roleName)
                    .orElseThrow(() -> new IllegalStateException("Role not seeded: " + roleName)));
        }
        User user = User.builder()
                .organizationId(org == null ? null : org.getId())
                .email("it-" + UUID.randomUUID() + "@test.local")
                .passwordHash(passwordEncoder.encode("Test1234!"))
                .firstName("Integration")
                .lastName("Test")
                .enabled(true)
                .roles(roles)
                .build();
        user = userRepository.save(user);
        createdUserIds.add(user.getId());

        UserPrincipal principal = new UserPrincipal(user);
        return jwtTokenProvider.generateAccessToken(principal, user.getId());
    }

    protected HttpHeaders bearerHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return headers;
    }

    /**
     * Creates and tracks (for automatic cleanup) a user with the given roles,
     * for direct service-layer (non-HTTP) isolation tests. Pair with
     * {@link #actAsUser(User)} to authenticate as this user via
     * SecurityContextHolder/RlsOrgIdHolder without going through a real HTTP request.
     */
    protected User createUser(Organization org, String... roleNames) {
        Set<Role> roles = new HashSet<>();
        for (String roleName : roleNames) {
            roles.add(roleRepository.findByName(roleName)
                    .orElseThrow(() -> new IllegalStateException("Role not seeded: " + roleName)));
        }
        User user = User.builder()
                .organizationId(org == null ? null : org.getId())
                .email("it-" + UUID.randomUUID() + "@test.local")
                .passwordHash(passwordEncoder.encode("Test1234!"))
                .firstName("Integration")
                .lastName("Test")
                .enabled(true)
                .roles(roles)
                .build();
        user = userRepository.save(user);
        createdUserIds.add(user.getId());
        return user;
    }

    /** Sets SecurityContextHolder + RlsOrgIdHolder so service-layer code sees this user as the caller. */
    protected UserPrincipal actAsUser(User user) {
        UserPrincipal principal = new UserPrincipal(user);
        Set<org.springframework.security.core.GrantedAuthority> authorities = new HashSet<>();
        for (var role : user.getRoles()) {
            authorities.add(new SimpleGrantedAuthority(role.getName()));
        }
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, authorities));
        RlsOrgIdHolder.set(user.getOrganizationId());
        return principal;
    }

    @AfterEach
    void cleanupIntegrationTestData() {
        SecurityContextHolder.clearContext();
        RlsOrgIdHolder.clear();
        userRepository.deleteAllByIdInBatch(createdUserIds);
        organizationRepository.deleteAllByIdInBatch(createdOrgIds);
        createdUserIds.clear();
        createdOrgIds.clear();
    }
}
