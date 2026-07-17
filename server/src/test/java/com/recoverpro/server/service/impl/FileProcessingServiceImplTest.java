package com.recoverpro.server.service.impl;

import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.AssignmentRepository;
import com.recoverpro.server.repository.BorrowerRepository;
import com.recoverpro.server.repository.ColumnSchemaRepository;
import com.recoverpro.server.repository.FileProcessingErrorRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.security.encryption.LookupHashService;
import com.recoverpro.server.service.FileParsingService;
import com.recoverpro.server.service.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * SYSTEM-PLAN SP32: processFileAsync used to call autoAssignFromFile/cancelDroppedLoanAssignments
 * via plain self-invocation (this.method()), which bypasses the Spring proxy so their
 * @Transactional(REQUIRES_NEW) was silently ignored -- they ran in processFileAsync's own
 * transaction instead of a fresh one. Both were moved to FileUploadPostProcessingService, a
 * separate bean, so the call goes through the proxy and REQUIRES_NEW actually applies.
 */
@ExtendWith(MockitoExtension.class)
class FileProcessingServiceImplTest {

    @Mock private FileUploadRepository fileUploadRepository;
    @Mock private AllocationRepository allocationRepository;
    @Mock private ColumnSchemaRepository columnSchemaRepository;
    @Mock private FileProcessingErrorRepository fileProcessingErrorRepository;
    @Mock private OrganizationRepository organizationRepository;
    @Mock private UserRepository userRepository;
    @Mock private AssignmentRepository assignmentRepository;
    @Mock private BorrowerRepository borrowerRepository;
    @Mock private LookupHashService lookupHashService;
    @Mock private FileParsingService fileParsingService;
    @Mock private FileStorageService fileStorageService;
    @Mock private FileUploadPostProcessingService fileUploadPostProcessingService;

    private FileProcessingServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new FileProcessingServiceImpl(fileUploadRepository, allocationRepository,
                columnSchemaRepository, fileProcessingErrorRepository, organizationRepository,
                userRepository, assignmentRepository, borrowerRepository, lookupHashService,
                fileParsingService, fileStorageService, fileUploadPostProcessingService);
    }

    @Test
    void processFileAsync_delegatesAutoAssignAndDroppedLoanCleanup_toSeparateBean() throws Exception {
        UUID fileUploadId = UUID.randomUUID();
        UUID orgId = UUID.randomUUID();
        UUID uploadedBy = UUID.randomUUID();

        Organization org = new Organization();
        org.setId(orgId);
        org.setActive(true);

        FileUpload fileUpload = FileUpload.builder()
                .id(fileUploadId).organization(org).originalFilename("book.csv")
                .contentType("text/csv").uploadedByUserId(uploadedBy)
                .status(FileUploadStatus.PENDING)
                .build();

        when(fileUploadRepository.findByIdAndIsDeletedFalse(fileUploadId)).thenReturn(Optional.of(fileUpload));
        when(organizationRepository.findById(orgId)).thenReturn(Optional.of(org));
        when(columnSchemaRepository.findAllActiveByOrganizationId(orgId)).thenReturn(List.of());
        when(fileStorageService.retrieve(fileUploadId)).thenReturn("data".getBytes());
        when(fileParsingService.parseFile(any())).thenReturn(List.of());

        service.processFileAsync(fileUploadId, orgId);

        verify(fileUploadPostProcessingService).autoAssignFromFile(fileUploadId, orgId, uploadedBy);
        verify(fileUploadPostProcessingService).cancelDroppedLoanAssignments(fileUploadId, orgId);
    }
}
