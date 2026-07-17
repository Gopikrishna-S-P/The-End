package com.recoverpro.server.service;

import com.recoverpro.server.client.LlamaClient;
import com.recoverpro.server.entity.RagDocument;
import com.recoverpro.server.entity.RagDocumentChunk;
import com.recoverpro.server.enums.RagDocumentStatus;
import com.recoverpro.server.repository.RagDocumentChunkRepository;
import com.recoverpro.server.repository.RagDocumentRepository;
import com.recoverpro.server.service.storage.StoragePort;
import com.recoverpro.server.util.RagDocumentChunker;
import com.recoverpro.server.util.RagDocumentTextExtractor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * Async worker: extract -> chunk -> embed -> activate. A separate bean from
 * {@code RagDocumentServiceImpl} (not a self-injected @Lazy proxy) so
 * Spring's @Async proxy actually intercepts the call -- self-invocation
 * within one class silently runs synchronously (mirrors the existing
 * FileUploadService/FileProcessingService split, and avoids the
 * self-injection anti-pattern SERVICE_DESIGN_AUDIT.md flags for
 * ReportingServiceImpl/B-10).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RagDocumentProcessingService {

    private final RagDocumentRepository ragDocumentRepository;
    private final RagDocumentChunkRepository ragDocumentChunkRepository;
    private final LlamaClient llamaClient;
    private final StoragePort storagePort;

    @Async("taskExecutor")
    public void processDocumentAsync(UUID documentId) {
        try {
            process(documentId);
        } catch (Exception e) {
            log.error("RAG document processing failed: id={}, error={}", documentId, e.getMessage(), e);
            markFailed(documentId, e.getMessage());
        }
    }

    /**
     * No @Transactional here: this is called via self-invocation from
     * processDocumentAsync() within the same bean, which the Spring AOP
     * transaction proxy would silently ignore anyway. Each repository
     * .save() call below already commits atomically on its own, which is
     * what we want -- holding one long transaction open across the
     * (possibly slow) embedding API call would be bad practice regardless.
     */
    void process(UUID documentId) throws IOException {
        RagDocument document = ragDocumentRepository.findById(documentId)
                .orElseThrow(() -> new IOException("RagDocument not found: " + documentId));

        document.setStatus(RagDocumentStatus.PROCESSING);
        ragDocumentRepository.save(document);

        byte[] fileBytes = readBytes(document.getFilePath());
        String text = RagDocumentTextExtractor.extract(fileBytes, document.getContentType());
        List<String> pieces = RagDocumentChunker.chunk(text);

        if (pieces.isEmpty()) {
            document.setStatus(RagDocumentStatus.FAILED);
            document.setErrorMessage("No extractable text found in document");
            ragDocumentRepository.save(document);
            log.warn("RAG document has no extractable text: id={}", documentId);
            return;
        }

        List<List<Float>> embeddings = llamaClient.embed(pieces);

        for (int i = 0; i < pieces.size(); i++) {
            RagDocumentChunk chunk = RagDocumentChunk.builder()
                    .documentId(documentId)
                    .chunkIndex(i)
                    .content(pieces.get(i))
                    .tokenCount(pieces.get(i).length() / 4)
                    .build();
            RagDocumentChunk saved = ragDocumentChunkRepository.save(chunk);
            ragDocumentChunkRepository.setEmbedding(saved.getId(), toVectorLiteral(embeddings.get(i)));
        }

        document.setStatus(RagDocumentStatus.ACTIVE);
        ragDocumentRepository.save(document);
        log.info("RAG document processed: id={}, chunks={}", documentId, pieces.size());
    }

    private void markFailed(UUID documentId, String errorMessage) {
        ragDocumentRepository.findById(documentId).ifPresent(document -> {
            document.setStatus(RagDocumentStatus.FAILED);
            document.setErrorMessage(errorMessage);
            ragDocumentRepository.save(document);
        });
    }

    private byte[] readBytes(String filePath) throws IOException {
        return storagePort.readBytes(filePath);
    }

    private static String toVectorLiteral(List<Float> embedding) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.size(); i++) {
            if (i > 0) sb.append(',');
            sb.append(embedding.get(i));
        }
        return sb.append(']').toString();
    }
}
