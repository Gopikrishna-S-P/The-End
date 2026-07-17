package com.recoverpro.server.service.impl;

import com.recoverpro.server.client.ClamAvScannerClient;
import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.response.RagDocumentResponse;
import com.recoverpro.server.entity.RagDocument;
import com.recoverpro.server.enums.RagDocumentStatus;
import com.recoverpro.server.repository.RagDocumentRepository;
import com.recoverpro.server.service.RagDocumentProcessingService;
import com.recoverpro.server.service.RagDocumentService;
import com.recoverpro.server.service.storage.StoragePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RagDocumentServiceImpl implements RagDocumentService {

    private static final long MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024L;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain", "text/markdown"
    );

    private final RagDocumentRepository ragDocumentRepository;
    private final RagDocumentProcessingService ragDocumentProcessingService;
    private final ClamAvScannerClient clamAvScannerClient;
    private final StoragePort storagePort;

    @Value("${app.storage.base-path:./uploads/rag-documents}")
    private String storagePath;

    @Override
    @Transactional
    public RagDocumentResponse upload(MultipartFile file, String title, String description, UUID uploadedByUserId) {
        validateFile(file);

        String storedFilename = UUID.randomUUID() + "_" + sanitizeFilename(file.getOriginalFilename());
        String filePath = store(file, storedFilename);

        RagDocument document = RagDocument.builder()
                .title(title)
                .description(description)
                .contentType(file.getContentType())
                .filePath(filePath)
                .status(RagDocumentStatus.PENDING)
                .uploadedByUserId(uploadedByUserId)
                .build();

        RagDocument saved = ragDocumentRepository.save(document);
        log.info("RAG document uploaded: id={}, title={}", saved.getId(), title);

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                ragDocumentProcessingService.processDocumentAsync(saved.getId());
            }
        });

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RagDocumentResponse> list() {
        return ragDocumentRepository.findAllByOrderByCreatedAtDesc()
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void supersede(UUID documentId) {
        RagDocument document = ragDocumentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("RagDocument", documentId));
        document.setStatus(RagDocumentStatus.SUPERSEDED);
        ragDocumentRepository.save(document);
        log.info("RAG document superseded: id={}", documentId);
    }

    private String store(MultipartFile file, String storedFilename) {
        String s3Key = "rag-documents/" + storedFilename;
        Path localPath = Paths.get(storagePath).resolve(storedFilename);
        try {
            return storagePort.store(s3Key, localPath, file.getInputStream(), file.getContentType(), file.getSize());
        } catch (IOException e) {
            throw new BusinessException("Failed to store RAG document: " + e.getMessage());
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new BusinessException("File must not be empty");
        if (file.getSize() > MAX_FILE_SIZE_BYTES)
            throw new BusinessException("File size exceeds maximum allowed size of 20 MB");
        String ct = file.getContentType();
        if (ct == null || !ALLOWED_CONTENT_TYPES.contains(ct))
            throw new BusinessException("Unsupported file type: " + ct + ". Allowed: PDF, DOCX, TXT, Markdown");

        try (var is = file.getInputStream()) {
            if (!clamAvScannerClient.isClean(is)) {
                throw new BusinessException("File failed virus scan and was rejected");
            }
        } catch (IOException e) {
            throw new BusinessException("Could not read file for virus scanning: " + e.getMessage());
        }
    }

    static String sanitizeFilename(String original) {
        if (original == null || original.isBlank()) return "document";
        String basename = original;
        int lastSlash = Math.max(basename.lastIndexOf('/'), basename.lastIndexOf('\\'));
        if (lastSlash >= 0) basename = basename.substring(lastSlash + 1);
        if (basename.isBlank()) basename = "document";
        return basename.replaceAll("[^a-zA-Z0-9._-]", "_").replace("..", "_");
    }

    private RagDocumentResponse toResponse(RagDocument d) {
        return RagDocumentResponse.builder()
                .id(d.getId())
                .title(d.getTitle())
                .description(d.getDescription())
                .contentType(d.getContentType())
                .status(d.getStatus())
                .errorMessage(d.getErrorMessage())
                .uploadedByUserId(d.getUploadedByUserId())
                .supersedesDocumentId(d.getSupersedesDocumentId())
                .createdAt(d.getCreatedAt())
                .updatedAt(d.getUpdatedAt())
                .build();
    }
}
