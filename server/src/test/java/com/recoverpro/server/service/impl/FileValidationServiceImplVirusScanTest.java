package com.recoverpro.server.service.impl;

import com.recoverpro.server.client.ClamAvScannerClient;
import com.recoverpro.server.exception.InvalidFileException;
import com.recoverpro.server.repository.FileUploadRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * SEC-PLAN S16: ClamAvScannerClient existed but was never called from any
 * upload path - wiring it into FileValidationServiceImpl (the shared
 * loan-book file validator) so an infected upload is actually rejected.
 */
@ExtendWith(MockitoExtension.class)
class FileValidationServiceImplVirusScanTest {

    @Mock private FileUploadRepository fileUploadRepository;
    @Mock private ClamAvScannerClient clamAvScannerClient;

    private FileValidationServiceImpl service;

    private static final byte[] XLSX_MAGIC = {0x50, 0x4B, 0x03, 0x04, 0, 0, 0, 0};

    @BeforeEach
    void setUp() {
        service = new FileValidationServiceImpl(fileUploadRepository, clamAvScannerClient);
        ReflectionTestUtils.setField(service, "allowedTypes",
                List.of("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        ReflectionTestUtils.setField(service, "maxSizeBytes", 20_000_000L);
    }

    @Test
    void infectedFile_isRejected() {
        when(clamAvScannerClient.isClean(any())).thenReturn(false);
        MockMultipartFile file = new MockMultipartFile("file", "loans.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", XLSX_MAGIC);

        assertThatThrownBy(() -> service.validateFile(file))
                .isInstanceOf(InvalidFileException.class)
                .hasMessageContaining("virus");
    }

    @Test
    void cleanFile_passesValidation() {
        when(clamAvScannerClient.isClean(any())).thenReturn(true);
        MockMultipartFile file = new MockMultipartFile("file", "loans.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", XLSX_MAGIC);

        assertThatCode(() -> service.validateFile(file)).doesNotThrowAnyException();
    }
}
