package com.recoverpro.server.config;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.entity.FileProcessingError;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.repository.FileProcessingErrorRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * file_processing_errors stores raw_value -- the verbatim failing cell from a tenant's uploaded
 * loan book (borrower mobile numbers, loan account numbers, names). The table carries no
 * organization_id of its own, so isolation has to come from its file_upload_id FK.
 */
class FileProcessingErrorRlsIsolationTest extends AbstractIntegrationTest {

    @Autowired private FileUploadRepository fileUploadRepository;
    @Autowired private FileProcessingErrorRepository errorRepository;

    private Organization orgA;
    private FileUpload uploadInOrgA;
    private FileProcessingError errorInOrgA;

    @AfterEach
    void cleanup() {
        if (orgA != null) RlsOrgIdHolder.set(orgA.getId());
        if (errorInOrgA != null) errorRepository.deleteById(errorInOrgA.getId());
        if (uploadInOrgA != null) fileUploadRepository.deleteById(uploadInOrgA.getId());
        RlsOrgIdHolder.clear();
    }

    @Test
    void rawCellValuesAreNotVisibleToAnotherOrg() {
        orgA = createOrg("fpe-a");
        Organization orgB = createOrg("fpe-b");

        RlsOrgIdHolder.set(orgA.getId());
        Organization managedOrgA = organizationRepository.findById(orgA.getId()).orElseThrow();
        uploadInOrgA = fileUploadRepository.save(FileUpload.builder()
                .organization(managedOrgA)
                .originalFilename("loan-book.csv")
                .contentType("text/csv")
                .fileSizeBytes(100L)
                .sha256Hash("it-test-hash-" + System.nanoTime())
                .status(FileUploadStatus.COMPLETED)
                .totalRows(1)
                .build());
        errorInOrgA = errorRepository.save(FileProcessingError.builder()
                .fileUpload(uploadInOrgA)
                .rowNumber(1)
                .columnName("mobile_number")
                .errorMessage("invalid mobile number")
                .rawValue("9876543210")
                .build());

        // Org B's context must not see org A's raw cell value.
        RlsOrgIdHolder.set(orgB.getId());
        Optional<FileProcessingError> asOrgB = errorRepository.findById(errorInOrgA.getId());
        assertThat(asOrgB).isEmpty();

        // Org A's own context must still see it -- isolation, not a blanket denial.
        RlsOrgIdHolder.set(orgA.getId());
        assertThat(errorRepository.findById(errorInOrgA.getId())).isPresent();

        // No org context at all must fail closed, matching every other RLS'd table since V040.
        RlsOrgIdHolder.clear();
        assertThat(errorRepository.findById(errorInOrgA.getId())).isEmpty();
    }
}
