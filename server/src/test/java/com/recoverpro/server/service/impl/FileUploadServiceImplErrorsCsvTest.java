package com.recoverpro.server.service.impl;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.entity.FileProcessingError;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.repository.FileProcessingErrorRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.service.FileUploadService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * SYSTEM-PLAN 35.2: the per-row error API was JSON-paginated only -- no single downloadable
 * artifact naming every failed row, which is what the tasklist's own acceptance check asks for
 * ("a file with 10 bad rows out of 1,000 ... produces a downloadable report naming all 10").
 */
class FileUploadServiceImplErrorsCsvTest extends AbstractIntegrationTest {

    @Autowired private FileUploadService fileUploadService;
    @Autowired private FileUploadRepository fileUploadRepository;
    @Autowired private FileProcessingErrorRepository fileProcessingErrorRepository;

    private Organization org;
    private FileUpload upload;

    @AfterEach
    void cleanup() {
        if (org != null) {
            RlsOrgIdHolder.set(org.getId());
            if (upload != null) {
                // deleteAllByFileUploadId is a derived query method with no @Modifying/@Query of
                // its own, so it doesn't self-transact the way base CrudRepository methods
                // (deleteAll(Iterable), deleteById) do -- fetch-then-deleteAll uses only base
                // methods, each of which carries its own @Transactional on SimpleJpaRepository.
                fileProcessingErrorRepository.deleteAll(
                        fileProcessingErrorRepository.findAllByFileUploadIdOrderByRowNumberAsc(upload.getId()));
                fileUploadRepository.deleteById(upload.getId());
            }
            RlsOrgIdHolder.clear();
        }
    }

    @Test
    void buildProcessingErrorsCsv_namesEveryFailedRow_notJustOnePage() {
        org = createOrg("sp35-errors-csv");
        RlsOrgIdHolder.set(org.getId());
        Organization managedOrg = organizationRepository.findById(org.getId()).orElseThrow();

        upload = fileUploadRepository.save(FileUpload.builder()
                .organization(managedOrg)
                .originalFilename("bad-rows.csv")
                .contentType("text/csv")
                .fileSizeBytes(10L)
                .sha256Hash("errors-csv-hash-" + System.nanoTime())
                .status(FileUploadStatus.PARTIALLY_COMPLETED)
                .totalRows(1000)
                .successfulRows(990)
                .failedRows(10)
                .build());

        for (int i = 1; i <= 10; i++) {
            fileProcessingErrorRepository.save(FileProcessingError.builder()
                    .fileUpload(upload)
                    .rowNumber(i + 1)
                    .columnName("loan_number")
                    .errorMessage("Loan number is required")
                    .rawValue("")
                    .build());
        }

        String csv = fileUploadService.buildProcessingErrorsCsv(upload.getId());

        assertThat(csv).startsWith("Row,Column,Error,Raw Value\n");
        String[] lines = csv.split("\n");
        assertThat(lines).hasSize(11); // header + all 10 errors, not just the first page
        for (int i = 1; i <= 10; i++) {
            assertThat(csv).contains((i + 1) + ",loan_number,Loan number is required,");
        }
    }
}
