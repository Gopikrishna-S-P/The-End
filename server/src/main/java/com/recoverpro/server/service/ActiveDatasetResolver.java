package com.recoverpro.server.service;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.repository.FileUploadRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ActiveDatasetResolver {

    private final FileUploadRepository fileUploadRepository;

    @Transactional(readOnly = true)
    public Optional<FileUpload> activeUpload(UUID organizationId) {
        return fileUploadRepository.findActiveDataset(organizationId);
    }

    @Transactional(readOnly = true)
    public Optional<UUID> activeFileId(UUID organizationId) {
        return activeUpload(organizationId).map(FileUpload::getId);
    }

    @Transactional(readOnly = true)
    public UUID requireActiveFileId(UUID organizationId) {
        return activeFileId(organizationId)
                .orElseThrow(() -> new BusinessException(
                        "No active loan book for this organization. Upload a monthly file first."));
    }
}
