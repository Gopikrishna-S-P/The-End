package com.recoverpro.server.controller.admin;

import com.recoverpro.server.dto.request.UpdateRagDocumentRequest;
import com.recoverpro.server.dto.response.RagDocumentResponse;
import com.recoverpro.server.security.UserPrincipal;
import com.recoverpro.server.service.RagDocumentService;
import com.recoverpro.server.service.UserActionAuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regression coverage: upload/updateMetadata/supersede are the platform-admin write actions on the
 * compliance document library (RBI circulars, DLG guidelines) that had no UserActionAuditService
 * call at all -- the same gap PlatformSubscriptionControllerTest covers for grantComp/revokeComp/
 * changePlan/backfillInvoices. "Who uploaded or deactivated this compliance document, and when" is
 * exactly the kind of record a regulated lending platform needs to keep.
 */
@ExtendWith(MockitoExtension.class)
class RagDocumentAdminControllerTest {

    @Mock private RagDocumentService ragDocumentService;
    @Mock private UserActionAuditService userActionAuditService;

    private RagDocumentAdminController controller;
    private UserPrincipal principal;
    private UUID docId;

    @BeforeEach
    void setUp() {
        controller = new RagDocumentAdminController(ragDocumentService, userActionAuditService);
        docId = UUID.randomUUID();
        principal = mock(UserPrincipal.class);
        lenient().when(principal.getId()).thenReturn(UUID.randomUUID());
    }

    @Test
    void upload_writesAuditLogEntry() {
        MockMultipartFile file = new MockMultipartFile("file", "circular.pdf", "application/pdf", new byte[]{1, 2, 3});
        when(ragDocumentService.upload(any(), eq("RBI Circular"), any(), any()))
                .thenReturn(RagDocumentResponse.builder().id(docId).title("RBI Circular").build());

        controller.upload(file, "RBI Circular", "desc", principal);

        verify(userActionAuditService).logUserAction(eq(principal.getId()), eq("RAG_DOCUMENT_UPLOADED"), contains("RBI Circular"));
    }

    @Test
    void updateMetadata_writesAuditLogEntry() {
        UpdateRagDocumentRequest req = UpdateRagDocumentRequest.builder().title("Updated Title").build();
        when(ragDocumentService.updateMetadata(eq(docId), eq("Updated Title"), any()))
                .thenReturn(RagDocumentResponse.builder().id(docId).title("Updated Title").build());

        controller.updateMetadata(docId, req, principal);

        verify(userActionAuditService).logUserAction(eq(principal.getId()), eq("RAG_DOCUMENT_UPDATED"), contains("Updated Title"));
    }

    @Test
    void supersede_writesAuditLogEntry() {
        controller.supersede(docId, principal);

        verify(userActionAuditService).logUserAction(eq(principal.getId()), eq("RAG_DOCUMENT_SUPERSEDED"), anyString());
    }
}
