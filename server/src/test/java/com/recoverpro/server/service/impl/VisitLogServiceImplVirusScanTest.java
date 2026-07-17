package com.recoverpro.server.service.impl;

import com.recoverpro.server.client.ClamAvScannerClient;
import com.recoverpro.server.entity.VisitLog;
import com.recoverpro.server.mapper.VisitLogMapper;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.repository.VisitImageRepository;
import com.recoverpro.server.repository.VisitLogRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.service.UserActionAuditService;
import com.recoverpro.server.service.CallingHoursGuard;
import com.recoverpro.server.service.compliance.ComplianceAuditService;
import com.recoverpro.server.service.storage.S3OrLocalStoragePort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import java.lang.reflect.Method;
import java.nio.file.Path;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * SEC-PLAN S16 follow-up: field-uploaded visit photos went straight to
 * storage with no virus scan at all (unlike DocumentServiceImpl and
 * RagDocumentServiceImpl, fixed in the main S16 pass). Wire the same
 * ClamAvScannerClient check into VisitLogServiceImpl's private attachImage.
 */
@ExtendWith(MockitoExtension.class)
class VisitLogServiceImplVirusScanTest {

    @Mock private VisitLogRepository visitLogRepository;
    @Mock private VisitLogMapper visitLogMapper;
    @Mock private AllocationRepository allocationRepository;
    @Mock private UserRepository userRepository;
    @Mock private VisitImageRepository visitImageRepository;
    @Mock private CallingHoursGuard callingHoursGuard;
    @Mock private UserActionAuditService auditLogService;
    @Mock private OrgIsolationGuard orgIsolationGuard;
    @Mock private ClamAvScannerClient clamAvScannerClient;
    @Mock private ComplianceAuditService complianceAuditService;

    private VisitLogServiceImpl service;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() {
        service = new VisitLogServiceImpl(visitLogRepository, visitLogMapper, allocationRepository,
                userRepository, visitImageRepository, callingHoursGuard, auditLogService,
                orgIsolationGuard, clamAvScannerClient, complianceAuditService, new S3OrLocalStoragePort());
        ReflectionTestUtils.setField(service, "storagePath", tempDir.toString());
    }

    @Test
    void infectedImage_isRejectedNotStored() throws Exception {
        when(clamAvScannerClient.isClean(any())).thenReturn(false);
        VisitLog visitLog = VisitLog.builder().build();
        MultipartFile file = new MockMultipartFile("image1", "visit.jpg", "image/jpeg", "not-really-an-image".getBytes());

        invokeAttachImage(visitLog, file, 1, UUID.randomUUID());

        assertThat(visitLog.getImages()).hasSize(1);
        assertThat(visitLog.getImages().get(0).getUploadStatus()).isEqualTo("REJECTED_INFECTED");
        assertThat(visitLog.getImages().get(0).getImagePath()).isNull();
        assertThat(tempDir.toFile().listFiles()).isNullOrEmpty();
    }

    @Test
    void cleanImage_isStoredNormally() throws Exception {
        when(clamAvScannerClient.isClean(any())).thenReturn(true);
        VisitLog visitLog = VisitLog.builder().build();
        MultipartFile file = new MockMultipartFile("image1", "visit.jpg", "image/jpeg", "real-image-bytes".getBytes());

        invokeAttachImage(visitLog, file, 1, UUID.randomUUID());

        assertThat(visitLog.getImages()).hasSize(1);
        assertThat(visitLog.getImages().get(0).getUploadStatus()).isEqualTo("UPLOADED");
        assertThat(visitLog.getImages().get(0).getImagePath()).isNotNull();
    }

    private void invokeAttachImage(VisitLog visitLog, MultipartFile file, int sequenceNumber, UUID uploadedBy)
            throws Exception {
        Method method = VisitLogServiceImpl.class.getDeclaredMethod(
                "attachImage", VisitLog.class, MultipartFile.class, int.class, UUID.class);
        method.setAccessible(true);
        method.invoke(service, visitLog, file, sequenceNumber, uploadedBy);
    }
}
