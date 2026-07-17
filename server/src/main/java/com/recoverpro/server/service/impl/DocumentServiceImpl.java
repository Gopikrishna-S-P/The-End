package com.recoverpro.server.service.impl;

import com.recoverpro.server.client.ClamAvScannerClient;
import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.response.CollectionDocumentResponse;
import com.recoverpro.server.entity.Collection;
import com.recoverpro.server.entity.CollectionDocument;
import com.recoverpro.server.repository.CollectionDocumentRepository;
import com.recoverpro.server.repository.CollectionRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.service.DocumentService;
import com.recoverpro.server.service.storage.StoragePort;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
public class DocumentServiceImpl implements DocumentService {

    private final CollectionDocumentRepository documentRepository;
    private final CollectionRepository collectionRepository;
    private final OrgIsolationGuard orgIsolationGuard;
    private final ClamAvScannerClient clamAvScannerClient;
    private final StoragePort storagePort;

    @Value("${aws.s3.signed-url-duration-hours:24}")
    private long signedUrlDurationHours;

    @Value("${app.storage.base-path:./uploads/collections}")
    private String storagePath;

    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024L;
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/jpg",
            "application/pdf", "image/heic", "image/webp"
    );

    public DocumentServiceImpl(CollectionDocumentRepository documentRepository,
                               CollectionRepository collectionRepository,
                               OrgIsolationGuard orgIsolationGuard,
                               ClamAvScannerClient clamAvScannerClient,
                               StoragePort storagePort) {
        this.documentRepository = documentRepository;
        this.collectionRepository = collectionRepository;
        this.orgIsolationGuard = orgIsolationGuard;
        this.clamAvScannerClient = clamAvScannerClient;
        this.storagePort = storagePort;
    }

    @Override
    @Transactional
    public CollectionDocumentResponse uploadDocument(UUID collectionId, MultipartFile file, UUID uploadedBy) {
        Collection collection = requireCollectionInCallerOrg(collectionId);
        validateFile(file);

        String storedFilename = UUID.randomUUID() + "_" + sanitizeFilename(file.getOriginalFilename());
        String s3Key = "collections/" + collection.getId() + "/" + storedFilename;
        Path localPath = Paths.get(storagePath, String.valueOf(collection.getId())).resolve(storedFilename);
        String filePath;
        try {
            filePath = storagePort.store(s3Key, localPath, file.getInputStream(), file.getContentType(), file.getSize());
        } catch (IOException e) {
            throw new BusinessException("Failed to store document: " + e.getMessage());
        }

        CollectionDocument document = CollectionDocument.builder()
                .collectionId(collection.getId())
                .originalFilename(file.getOriginalFilename())
                .storedFilename(storedFilename)
                .filePath(filePath)
                .contentType(file.getContentType())
                .fileSizeBytes(file.getSize())
                .uploadedBy(uploadedBy)
                .isDeleted(false)
                .build();

        CollectionDocument saved = documentRepository.save(document);
        log.info("Document record saved: docId={}", saved.getId());
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Resource downloadDocument(UUID collectionId, UUID documentId, UUID requestedBy) {
        CollectionDocument document = requireDocumentInCallerOrg(collectionId, documentId);

        if (storagePort.isS3Enabled()) {
            String url = generateViewUrl(document);
            try {
                return new UrlResource(url);
            } catch (MalformedURLException e) {
                throw new BusinessException("Could not generate S3 URL for document: " + documentId);
            }
        }

        try {
            Path filePath = Paths.get(document.getFilePath());
            Resource resource = new UrlResource(filePath.toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new BusinessException("Document file is not accessible: " + documentId);
            }
            return resource;
        } catch (MalformedURLException e) {
            throw new BusinessException("Invalid document path for id: " + documentId);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<CollectionDocumentResponse> getDocumentsByCollection(UUID collectionId) {
        requireCollectionInCallerOrg(collectionId);
        return documentRepository
                .findByCollectionIdAndIsDeletedFalseOrderByCreatedAtAsc(collectionId)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public Map<UUID, List<CollectionDocumentResponse>> getDocumentsByCollectionIds(List<UUID> collectionIds) {
        if (collectionIds.isEmpty()) return Map.of();
        return documentRepository
                .findByCollectionIdInAndIsDeletedFalseOrderByCreatedAtAsc(collectionIds)
                .stream()
                .collect(Collectors.groupingBy(
                        CollectionDocument::getCollectionId,
                        Collectors.mapping(this::toResponse, Collectors.toList())));
    }

    @Override
    @Transactional
    public void deleteDocument(UUID collectionId, UUID documentId, UUID deletedBy) {
        CollectionDocument document = requireDocumentInCallerOrg(collectionId, documentId);
        documentRepository.softDeleteById(documentId);
        log.info("Document soft-deleted: docId={}, deletedBy={}", documentId, deletedBy);
        storagePort.delete(document.getFilePath());
    }

    @Override
    @Transactional(readOnly = true)
    public int getDocumentCount(UUID collectionId) {
        requireCollectionInCallerOrg(collectionId);
        return documentRepository.countByCollectionIdAndIsDeletedFalse(collectionId);
    }

    @Override
    @Transactional(readOnly = true)
    public CollectionDocument getDocumentForDownload(UUID collectionId, UUID documentId) {
        return requireDocumentInCallerOrg(collectionId, documentId);
    }

    private Collection requireCollectionInCallerOrg(UUID collectionId) {
        Collection collection = collectionRepository.findByIdAndIsDeletedFalse(collectionId)
                .orElseThrow(() -> new ResourceNotFoundException("Collection", collectionId));
        if (!orgIsolationGuard.belongsToOrg(collection.getOrganizationId())) {
            throw new ResourceNotFoundException("Collection", collectionId);
        }
        return collection;
    }

    private CollectionDocument requireDocumentInCallerOrg(UUID collectionId, UUID documentId) {
        CollectionDocument document = documentRepository.findByIdAndIsDeletedFalse(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document", documentId));
        if (!document.getCollectionId().equals(collectionId)) {
            throw new ResourceNotFoundException("Document not found in collection: " + documentId);
        }
        requireCollectionInCallerOrg(collectionId);
        return document;
    }

    private String generateViewUrl(CollectionDocument doc) {
        return storagePort.presignedUrl(doc.getFilePath(), Duration.ofHours(signedUrlDurationHours));
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new BusinessException("File must not be empty");
        if (file.getSize() > MAX_FILE_SIZE_BYTES)
            throw new BusinessException("File size exceeds maximum allowed size of 10 MB");
        String ct = file.getContentType();
        if (ct == null || !ALLOWED_CONTENT_TYPES.contains(ct.toLowerCase()))
            throw new BusinessException("Unsupported file type: " + ct + ". Allowed: JPEG, PNG, PDF, HEIC, WEBP");

        try (InputStream is = file.getInputStream()) {
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
        String sanitized = basename.replaceAll("[^a-zA-Z0-9._-]", "_").replace("..", "_")
                .replaceAll("^\\.+", "");
        if (sanitized.isBlank() || !sanitized.matches(".*[a-zA-Z0-9].*")) sanitized = "document";
        if (sanitized.length() > 200) sanitized = sanitized.substring(0, 200);
        return sanitized;
    }

    private CollectionDocumentResponse toResponse(CollectionDocument doc) {
        return CollectionDocumentResponse.builder()
                .id(doc.getId())
                .fileName(doc.getOriginalFilename())
                .documentType(doc.getContentType())
                .fileUrl(generateViewUrl(doc))
                .uploadedAt(doc.getCreatedAt())
                .build();
    }
}
