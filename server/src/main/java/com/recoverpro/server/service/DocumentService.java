package com.recoverpro.server.service;

import com.recoverpro.server.dto.response.CollectionDocumentResponse;
import com.recoverpro.server.entity.CollectionDocument;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface DocumentService {

    CollectionDocumentResponse uploadDocument(UUID collectionId, MultipartFile file, UUID uploadedBy);

    Resource downloadDocument(UUID collectionId, UUID documentId, UUID requestedBy);

    List<CollectionDocumentResponse> getDocumentsByCollection(UUID collectionId);

    Map<UUID, List<CollectionDocumentResponse>> getDocumentsByCollectionIds(List<UUID> collectionIds);

    void deleteDocument(UUID collectionId, UUID documentId, UUID deletedBy);

    int getDocumentCount(UUID collectionId);

    CollectionDocument getDocumentForDownload(UUID collectionId, UUID documentId);
}
