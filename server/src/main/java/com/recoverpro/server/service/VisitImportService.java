package com.recoverpro.server.service;

import com.recoverpro.server.dto.response.VisitImportResult;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface VisitImportService {
    VisitImportResult importFromExcel(MultipartFile file, UUID organizationId, UUID importedByUserId);
}
