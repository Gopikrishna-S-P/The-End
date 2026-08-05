package com.recoverpro.server.service;

import com.recoverpro.server.client.LlamaClient;
import com.recoverpro.server.entity.RagDocument;
import com.recoverpro.server.entity.RagDocumentChunk;
import com.recoverpro.server.enums.RagDocumentStatus;
import com.recoverpro.server.repository.RagDocumentChunkRepository;
import com.recoverpro.server.repository.RagDocumentRepository;
import com.recoverpro.server.service.storage.StoragePort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RagDocumentProcessingServiceTest {

    @Mock private RagDocumentRepository ragDocumentRepository;
    @Mock private RagDocumentChunkRepository ragDocumentChunkRepository;
    @Mock private LlamaClient llamaClient;
    @Mock private StoragePort storagePort;

    private RagDocumentProcessingService service;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() throws IOException {
        service = new RagDocumentProcessingService(
                ragDocumentRepository, ragDocumentChunkRepository, llamaClient, storagePort);
        lenient().when(storagePort.readBytes(anyString()))
                .thenAnswer(inv -> Files.readAllBytes(Path.of(inv.getArgument(0, String.class))));
    }

    @Test
    void process_textDocument_chunksEmbedsAndActivates() throws IOException {
        UUID documentId = UUID.randomUUID();
        Path file = tempDir.resolve("policy.txt");
        Files.writeString(file, "Cash handling requires supervisor sign-off above the daily limit.",
                StandardCharsets.UTF_8);

        RagDocument document = RagDocument.builder()
                .id(documentId)
                .title("Cash Policy")
                .contentType("text/plain")
                .filePath(file.toString())
                .status(RagDocumentStatus.PENDING)
                .build();
        when(ragDocumentRepository.findById(documentId)).thenReturn(Optional.of(document));
        when(ragDocumentRepository.save(any(RagDocument.class))).thenAnswer(inv -> inv.getArgument(0));
        when(ragDocumentChunkRepository.save(any(RagDocumentChunk.class)))
                .thenAnswer(inv -> {
                    RagDocumentChunk c = inv.getArgument(0);
                    c.setId(UUID.randomUUID());
                    return c;
                });
        when(llamaClient.embed(any())).thenReturn(List.of(List.of(0.1f, 0.2f, 0.3f)));

        service.process(documentId);

        assertThat(document.getStatus()).isEqualTo(RagDocumentStatus.ACTIVE);
        verify(ragDocumentChunkRepository).save(any(RagDocumentChunk.class));
        verify(ragDocumentChunkRepository).setEmbedding(any(UUID.class), eq("[0.1,0.2,0.3]"));
    }

    @Test
    void process_documentMissingFile_marksFailedWithErrorMessage() {
        // Calling processDocumentAsync() directly (no Spring proxy in a plain
        // unit test) runs synchronously -- @Async only applies through the
        // Spring AOP proxy, which isn't present here.
        UUID documentId = UUID.randomUUID();
        RagDocument document = RagDocument.builder()
                .id(documentId)
                .contentType("text/plain")
                .filePath(tempDir.resolve("does-not-exist.txt").toString())
                .status(RagDocumentStatus.PENDING)
                .build();
        when(ragDocumentRepository.findById(documentId)).thenReturn(Optional.of(document));
        when(ragDocumentRepository.save(any(RagDocument.class))).thenAnswer(inv -> inv.getArgument(0));

        service.processDocumentAsync(documentId);

        assertThat(document.getStatus()).isEqualTo(RagDocumentStatus.FAILED);
        assertThat(document.getErrorMessage()).isNotBlank();
        verifyNoInteractions(llamaClient);
    }

    @Test
    void process_documentNotFound_throwsIOException() {
        UUID documentId = UUID.randomUUID();
        when(ragDocumentRepository.findById(documentId)).thenReturn(Optional.empty());

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> service.process(documentId))
                .isInstanceOf(IOException.class);
    }

    @Test
    void process_noExtractableText_marksFailedWithoutCallingEmbeddings() throws IOException {
        UUID documentId = UUID.randomUUID();
        Path file = tempDir.resolve("blank.txt");
        Files.writeString(file, "   ", StandardCharsets.UTF_8);

        RagDocument document = RagDocument.builder()
                .id(documentId)
                .contentType("text/plain")
                .filePath(file.toString())
                .status(RagDocumentStatus.PENDING)
                .build();
        when(ragDocumentRepository.findById(documentId)).thenReturn(Optional.of(document));
        when(ragDocumentRepository.save(any(RagDocument.class))).thenAnswer(inv -> inv.getArgument(0));

        service.process(documentId);

        assertThat(document.getStatus()).isEqualTo(RagDocumentStatus.FAILED);
        assertThat(document.getErrorMessage()).contains("No extractable text");
        verifyNoInteractions(llamaClient);
    }

}
