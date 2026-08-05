package com.recoverpro.server.service.impl;

import com.recoverpro.server.client.ClamAvScannerClient;
import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.response.RagDocumentResponse;
import com.recoverpro.server.entity.RagDocument;
import com.recoverpro.server.enums.RagDocumentStatus;
import com.recoverpro.server.repository.RagDocumentRepository;
import com.recoverpro.server.service.RagDocumentProcessingService;
import com.recoverpro.server.service.storage.StoragePort;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RagDocumentServiceImplTest {

    @Mock private RagDocumentRepository ragDocumentRepository;
    @Mock private RagDocumentProcessingService ragDocumentProcessingService;
    @Mock private ClamAvScannerClient clamAvScannerClient;
    @Mock private StoragePort storagePort;

    private RagDocumentServiceImpl service;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() throws Exception {
        service = new RagDocumentServiceImpl(
                ragDocumentRepository, ragDocumentProcessingService, clamAvScannerClient, storagePort);
        var field = RagDocumentServiceImpl.class.getDeclaredField("storagePath");
        field.setAccessible(true);
        field.set(service, tempDir.toString());

        lenient().when(ragDocumentRepository.save(any(RagDocument.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        lenient().when(clamAvScannerClient.isClean(any())).thenReturn(true);
        lenient().when(storagePort.store(any(), any(), any(), any(), anyLong()))
                .thenReturn(tempDir.resolve("stored-file").toString());

        TransactionSynchronizationManager.initSynchronization();
    }

    @AfterEach
    void tearDown() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void upload_validPdf_savesAsPendingAndStoresFile() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "policy.pdf", "application/pdf", "dummy pdf bytes".getBytes());

        UUID uploadedBy = UUID.randomUUID();
        RagDocumentResponse response = service.upload(file, "Cash Handling Policy", "RBI DLG", uploadedBy);

        assertThat(response.getTitle()).isEqualTo("Cash Handling Policy");
        assertThat(response.getStatus()).isEqualTo(RagDocumentStatus.PENDING);
        assertThat(response.getUploadedByUserId()).isEqualTo(uploadedBy);
        assertThat(response.getContentType()).isEqualTo("application/pdf");
    }

    @Test
    void upload_emptyFile_throwsBusinessException() {
        MockMultipartFile file = new MockMultipartFile("file", "empty.pdf", "application/pdf", new byte[0]);

        assertThatThrownBy(() -> service.upload(file, "Empty", null, UUID.randomUUID()))
                .isInstanceOf(BusinessException.class);
        verifyNoInteractions(ragDocumentRepository);
    }

    @Test
    void upload_unsupportedContentType_throwsBusinessException() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "image.png", "image/png", "bytes".getBytes());

        assertThatThrownBy(() -> service.upload(file, "Bad type", null, UUID.randomUUID()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Unsupported file type");
    }

    @Test
    void upload_infectedFile_isRejectedBeforeStorage() {
        when(clamAvScannerClient.isClean(any())).thenReturn(false);
        MockMultipartFile file = new MockMultipartFile(
                "file", "policy.pdf", "application/pdf", "dummy pdf bytes".getBytes());

        assertThatThrownBy(() -> service.upload(file, "Infected", null, UUID.randomUUID()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("virus");
        verifyNoInteractions(ragDocumentRepository);
    }

    @Test
    void upload_oversizedFile_throwsBusinessException() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "big.txt", "text/plain", new byte[21 * 1024 * 1024]);

        assertThatThrownBy(() -> service.upload(file, "Too big", null, UUID.randomUUID()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("exceeds maximum");
    }

    @Test
    void list_returnsAllDocumentsMappedToResponses() {
        RagDocument doc = RagDocument.builder()
                .id(UUID.randomUUID())
                .title("SOP")
                .status(RagDocumentStatus.ACTIVE)
                .build();
        when(ragDocumentRepository.findAllByOrderByCreatedAtDesc()).thenReturn(List.of(doc));

        List<RagDocumentResponse> result = service.list();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitle()).isEqualTo("SOP");
    }

    @Test
    void updateMetadata_savesNewTitleAndDescription() {
        UUID id = UUID.randomUUID();
        RagDocument doc = RagDocument.builder().id(id).title("Old title").description("Old desc").build();
        when(ragDocumentRepository.findById(id)).thenReturn(Optional.of(doc));

        RagDocumentResponse response = service.updateMetadata(id, "New title", "New desc");

        assertThat(doc.getTitle()).isEqualTo("New title");
        assertThat(doc.getDescription()).isEqualTo("New desc");
        assertThat(response.getTitle()).isEqualTo("New title");
        assertThat(response.getDescription()).isEqualTo("New desc");
        verify(ragDocumentRepository).save(doc);
    }

    @Test
    void updateMetadata_notFound_throwsResourceNotFoundException() {
        UUID id = UUID.randomUUID();
        when(ragDocumentRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateMetadata(id, "New title", null))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void supersede_marksDocumentSuperseded() {
        UUID id = UUID.randomUUID();
        RagDocument doc = RagDocument.builder().id(id).status(RagDocumentStatus.ACTIVE).build();
        when(ragDocumentRepository.findById(id)).thenReturn(Optional.of(doc));

        service.supersede(id);

        assertThat(doc.getStatus()).isEqualTo(RagDocumentStatus.SUPERSEDED);
        verify(ragDocumentRepository).save(doc);
    }

    @Test
    void supersede_notFound_throwsResourceNotFoundException() {
        UUID id = UUID.randomUUID();
        when(ragDocumentRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.supersede(id))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
