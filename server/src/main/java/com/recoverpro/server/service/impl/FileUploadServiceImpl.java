package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.dto.response.PagedResponse;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.response.FileProcessingErrorResponse;
import com.recoverpro.server.dto.response.FileUploadResponse;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.mapper.FileProcessingErrorMapper;
import com.recoverpro.server.mapper.FileUploadMapper;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.FileProcessingErrorRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.service.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileUploadServiceImpl implements FileUploadService {

    private final FileUploadRepository fileUploadRepository;
    private final OrganizationRepository organizationRepository;
    private final FileProcessingErrorRepository fileProcessingErrorRepository;
    private final AllocationRepository allocationRepository;
    private final FileValidationService fileValidationService;
    private final FileProcessingService fileProcessingService;
    private final FileUploadMapper fileUploadMapper;
    private final FileProcessingErrorMapper fileProcessingErrorMapper;
    private final FileStorageService fileStorageService;
    private final UserActionAuditService auditLogService;

    @Override
    @Transactional
    public FileUploadResponse initiateUpload(MultipartFile file, UUID organizationId, UUID userId) {
        log.info("Initiating file upload for organization: {}, file: {}", organizationId, file.getOriginalFilename());

        fileValidationService.validateFile(file);
        String sha256Hash = fileValidationService.computeSha256Hash(file);

        if (fileValidationService.isDuplicateFile(sha256Hash, organizationId)) {
            return fileUploadRepository
                    .findFirstBySha256HashAndOrganizationIdAndIsDeletedFalse(sha256Hash, organizationId)
                    .map(fileUploadMapper::toResponse)
                    .orElseThrow(() -> new ResourceNotFoundException("Duplicate file record not found unexpectedly"));
        }

        Organization organization = organizationRepository.findById(organizationId)
                .filter(o -> o.isActive())
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + organizationId));

        FileUpload fileUpload = FileUpload.builder()
                .organization(organization)
                .originalFilename(file.getOriginalFilename())
                .contentType(file.getContentType())
                .fileSizeBytes(file.getSize())
                .sha256Hash(sha256Hash)
                .status(FileUploadStatus.PENDING)
                .uploadedByUserId(userId)
                .build();

        FileUpload saved = fileUploadRepository.save(fileUpload);
        log.info("Created FileUpload record with id: {}", saved.getId());

        auditLogService.logUserAction(userId, "FILE_UPLOAD_INITIATED",
                String.format("File: %s, Size: %d bytes, Org: %s",
                        file.getOriginalFilename(), file.getSize(), organizationId));

        fileStorageService.store(saved.getId(), file);
        fileUploadRepository.flush();

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                log.info("Transaction committed. Triggering async processing for fileUploadId: {}", saved.getId());
                fileProcessingService.processFileAsync(saved.getId(), organizationId);
            }
        });

        return fileUploadMapper.toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public FileUploadResponse getUploadStatus(UUID fileUploadId) {
        FileUpload fileUpload = fileUploadRepository.findByIdAndIsDeletedFalse(fileUploadId)
                .orElseThrow(() -> new ResourceNotFoundException("FileUpload not found: " + fileUploadId));
        return fileUploadMapper.toResponse(fileUpload);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<FileUploadResponse> getUploadsByOrganization(UUID organizationId, Pageable pageable) {
        Page<FileUpload> page = fileUploadRepository.findAllByOrganizationIdAndNotDeleted(organizationId, pageable);
        return PagedResponse.from(page.map(fileUploadMapper::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<FileProcessingErrorResponse> getProcessingErrors(UUID fileUploadId, Pageable pageable) {
        fileUploadRepository.findByIdAndIsDeletedFalse(fileUploadId)
                .orElseThrow(() -> new ResourceNotFoundException("FileUpload not found: " + fileUploadId));
        var page = fileProcessingErrorRepository.findAllByFileUploadId(fileUploadId, pageable);
        return PagedResponse.from(page.map(fileProcessingErrorMapper::toResponse));
    }

    @Override
    @Transactional
    public void softDeleteFileUpload(UUID fileUploadId, UUID userId) {
        log.info("Soft deleting fileUpload: {} by user: {}", fileUploadId, userId);
        fileUploadRepository.findByIdAndIsDeletedFalse(fileUploadId)
                .orElseThrow(() -> new ResourceNotFoundException("FileUpload not found: " + fileUploadId));
        allocationRepository.softDeleteAllByFileUploadId(fileUploadId, userId);
        fileUploadRepository.softDelete(fileUploadId, userId);
        fileStorageService.delete(fileUploadId);
        auditLogService.logUserAction(userId, "FILE_UPLOAD_DELETED",
                String.format("FileUpload ID: %s", fileUploadId));
        log.info("Successfully soft deleted fileUpload: {} and all associated allocations", fileUploadId);
    }
}
