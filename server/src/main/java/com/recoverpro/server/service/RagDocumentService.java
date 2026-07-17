package com.recoverpro.server.service;

import com.recoverpro.server.dto.response.RagDocumentResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface RagDocumentService {

    RagDocumentResponse upload(MultipartFile file, String title, String description, UUID uploadedByUserId);

    List<RagDocumentResponse> list();

    void supersede(UUID documentId);
}
