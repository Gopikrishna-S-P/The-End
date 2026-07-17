package com.recoverpro.server.service.impl;

import com.recoverpro.server.client.ClamAvScannerClient;
import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.entity.Collection;
import com.recoverpro.server.repository.CollectionDocumentRepository;
import com.recoverpro.server.repository.CollectionRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.service.storage.StoragePort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * SEC-PLAN S16: ClamAvScannerClient existed but was never called from any
 * upload path - wiring it into DocumentServiceImpl.uploadDocument (arbitrary
 * payment-proof documents: PDF/JPEG/PNG/HEIC/WEBP) so an infected upload
 * is rejected before it's ever written to storage.
 */
@ExtendWith(MockitoExtension.class)
class DocumentServiceImplVirusScanTest {

    @Mock private CollectionDocumentRepository documentRepository;
    @Mock private CollectionRepository collectionRepository;
    @Mock private OrgIsolationGuard orgIsolationGuard;
    @Mock private ClamAvScannerClient clamAvScannerClient;
    @Mock private StoragePort storagePort;

    private DocumentServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new DocumentServiceImpl(documentRepository, collectionRepository,
                orgIsolationGuard, clamAvScannerClient, storagePort);
    }

    @Test
    void infectedDocument_isRejectedBeforeStorage() {
        UUID collectionId = UUID.randomUUID();
        Collection collection = Collection.builder().id(collectionId).organizationId(UUID.randomUUID()).build();
        when(collectionRepository.findByIdAndIsDeletedFalse(collectionId)).thenReturn(Optional.of(collection));
        when(orgIsolationGuard.belongsToOrg(any())).thenReturn(true);
        when(clamAvScannerClient.isClean(any())).thenReturn(false);

        MockMultipartFile file = new MockMultipartFile("file", "proof.pdf",
                "application/pdf", "not-really-a-pdf".getBytes());

        assertThatThrownBy(() -> service.uploadDocument(collectionId, file, UUID.randomUUID()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("virus");

        verifyNoInteractions(documentRepository);
    }
}
