package com.recoverpro.server.service.impl;

import com.recoverpro.server.client.ClamAvScannerClient;
import com.recoverpro.server.dto.response.CollectionDocumentResponse;
import com.recoverpro.server.entity.CollectionDocument;
import com.recoverpro.server.repository.CollectionDocumentRepository;
import com.recoverpro.server.repository.CollectionRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.service.storage.StoragePort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocumentServiceImplTest {

    @Mock private CollectionDocumentRepository documentRepository;
    @Mock private CollectionRepository collectionRepository;
    @Mock private OrgIsolationGuard orgIsolationGuard;
    @Mock private ClamAvScannerClient clamAvScannerClient;
    @Mock private StoragePort storagePort;

    private DocumentServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new DocumentServiceImpl(documentRepository, collectionRepository, orgIsolationGuard,
                clamAvScannerClient, storagePort);
    }

    @Test
    void getDocumentsByCollectionIds_batchesIntoSingleQuery_groupedByCollection() {
        UUID collectionA = UUID.randomUUID();
        UUID collectionB = UUID.randomUUID();

        CollectionDocument docA = CollectionDocument.builder()
                .id(UUID.randomUUID()).collectionId(collectionA).originalFilename("a.pdf").build();
        CollectionDocument docB1 = CollectionDocument.builder()
                .id(UUID.randomUUID()).collectionId(collectionB).originalFilename("b1.pdf").build();
        CollectionDocument docB2 = CollectionDocument.builder()
                .id(UUID.randomUUID()).collectionId(collectionB).originalFilename("b2.pdf").build();

        when(documentRepository.findByCollectionIdInAndIsDeletedFalseOrderByCreatedAtAsc(
                List.of(collectionA, collectionB)))
                .thenReturn(List.of(docA, docB1, docB2));

        Map<UUID, List<CollectionDocumentResponse>> result =
                service.getDocumentsByCollectionIds(List.of(collectionA, collectionB));

        assertThat(result.get(collectionA)).hasSize(1);
        assertThat(result.get(collectionB)).hasSize(2);
    }

    @Test
    void getDocumentsByCollectionIds_emptyInput_returnsEmptyMapWithoutQuerying() {
        Map<UUID, List<CollectionDocumentResponse>> result = service.getDocumentsByCollectionIds(List.of());

        assertThat(result).isEmpty();
    }
}
