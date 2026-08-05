package com.recoverpro.server.controller;

import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.response.UploadDataResponse;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.security.PlatformAdminAccessGuard;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.UploadDataService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regression coverage: file_uploads' RLS policy (V050) and allocations' (V063) both already support
 * a platform-admin bypass, but assertOwnership's "if platform admin, skip the check" early return
 * never actually activated it -- nothing in this controller called PlatformAdminAccessGuard, so
 * uploadDataService's underlying RLS-scoped queries stayed empty for a platform admin regardless.
 */
@ExtendWith(MockitoExtension.class)
class UploadDataControllerTest {

    @Mock private UploadDataService uploadDataService;
    @Mock private FileUploadRepository fileUploadRepository;
    @Mock private PlatformAdminAccessGuard platformAdminAccessGuard;

    private UploadDataController newController() {
        return new UploadDataController(uploadDataService, fileUploadRepository, platformAdminAccessGuard);
    }

    private UserPrincipal principalWithRole(String role, UUID orgId) {
        UserPrincipal p = mock(UserPrincipal.class);
        lenient().doReturn(UUID.randomUUID()).when(p).getId();
        lenient().doReturn(orgId).when(p).getOrganizationId();
        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(role));
        doReturn(authorities).when(p).getAuthorities();
        return p;
    }

    @Test
    void getRows_platformAdmin_elevatesBeforeFetching() {
        UploadDataController controller = newController();
        UUID uploadId = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);
        when(uploadDataService.getRows(uploadId, 0, 50)).thenReturn(UploadDataResponse.builder().build());

        controller.getRows(admin, uploadId, 0, 50);

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(eq(admin.getId()), eq("uploadData:" + uploadId));
        verify(fileUploadRepository, never()).findByIdAndIsDeletedFalse(any());
    }

    @Test
    void getRows_orgAdmin_ownUpload_succeedsWithoutElevating() {
        UploadDataController controller = newController();
        UUID uploadId = UUID.randomUUID();
        UUID ownOrg = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", ownOrg);
        Organization org = Organization.builder().id(ownOrg).build();
        FileUpload upload = FileUpload.builder().id(uploadId).organization(org).build();
        when(fileUploadRepository.findByIdAndIsDeletedFalse(uploadId)).thenReturn(Optional.of(upload));
        when(uploadDataService.getRows(uploadId, 0, 50)).thenReturn(UploadDataResponse.builder().build());

        controller.getRows(orgAdmin, uploadId, 0, 50);

        verify(platformAdminAccessGuard, never()).beginUnattendedCrossOrgAccess(any(), any());
    }

    @Test
    void getRows_orgAdmin_foreignUpload_throwsNotFound() {
        UploadDataController controller = newController();
        UUID uploadId = UUID.randomUUID();
        UUID ownOrg = UUID.randomUUID();
        UUID foreignOrg = UUID.randomUUID();
        UserPrincipal orgAdmin = principalWithRole("ROLE_ORG_ADMIN", ownOrg);
        Organization org = Organization.builder().id(foreignOrg).build();
        FileUpload upload = FileUpload.builder().id(uploadId).organization(org).build();
        when(fileUploadRepository.findByIdAndIsDeletedFalse(uploadId)).thenReturn(Optional.of(upload));

        assertThrows(ResourceNotFoundException.class, () -> controller.getRows(orgAdmin, uploadId, 0, 50));

        verify(uploadDataService, never()).getRows(any(), anyInt(), anyInt());
    }

    @Test
    void deleteColumn_platformAdmin_elevates() {
        UploadDataController controller = newController();
        UUID uploadId = UUID.randomUUID();
        UserPrincipal admin = principalWithRole("ROLE_PLATFORM_ADMIN", null);

        controller.deleteColumn(admin, uploadId, "phone");

        verify(platformAdminAccessGuard).beginUnattendedCrossOrgAccess(eq(admin.getId()), eq("uploadData:" + uploadId));
    }
}
