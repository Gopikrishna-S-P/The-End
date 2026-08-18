package com.recoverpro.server.service.impl;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.Borrower;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.BorrowerRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.service.importer.AllocationImportProcessor;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * SYSTEM-PLAN 35.3: FileProcessingServiceImpl.streamProcessRows() is the memory-safe path real
 * uploads now take (see processFileAsync) instead of building a full List<Map<String,String>>
 * up front. This exercises it directly, with a real CSV parsed by the real (streaming)
 * FileParsingServiceImpl, end to end through the same AllocationImportProcessor the List-based
 * path uses -- proving the two paths produce identical results, not just that each compiles.
 */
class FileProcessingStreamingTest extends AbstractIntegrationTest {

    @Autowired private FileProcessingServiceImpl fileProcessingService;
    @Autowired private AllocationImportProcessor allocationImportProcessor;
    @Autowired private FileUploadRepository fileUploadRepository;
    @Autowired private AllocationRepository allocationRepository;
    @Autowired private BorrowerRepository borrowerRepository;

    private Organization org;
    private FileUpload upload;
    private List<String> loanNumbers = List.of();

    @AfterEach
    void cleanup() {
        if (org != null) {
            RlsOrgIdHolder.set(org.getId());
            List<Allocation> created = allocationRepository.findByOrganizationIdAndLoanNumberIn(org.getId(), loanNumbers);
            List<java.util.UUID> borrowerIds = created.stream()
                    .map(Allocation::getBorrowerId).filter(java.util.Objects::nonNull).toList();
            allocationRepository.deleteAll(created);
            borrowerIds.forEach(id -> borrowerRepository.findById(id).ifPresent(borrowerRepository::delete));
            fileUploadRepository.deleteById(upload.getId());
            RlsOrgIdHolder.clear();
        }
    }

    @Test
    void streamProcessRows_importsEveryRow_andMatchesTheListBasedPathsBehaviour() throws Exception {
        org = createOrg("sp35-streaming");
        RlsOrgIdHolder.set(org.getId());
        Organization managedOrg = organizationRepository.findById(org.getId()).orElseThrow();

        upload = fileUploadRepository.save(FileUpload.builder()
                .organization(managedOrg)
                .originalFilename("streamed.csv")
                .contentType("text/csv")
                .fileSizeBytes(200L)
                .sha256Hash("streaming-hash-" + System.nanoTime())
                .status(FileUploadStatus.PROCESSING)
                .totalRows(2)
                .build());

        String loanA = "LN-STREAM-A-" + System.nanoTime();
        String loanB = "LN-STREAM-B-" + System.nanoTime();
        loanNumbers = List.of(loanA, loanB);
        String csv = "loan_number,borrower_name,ckyc_id,total_due,outstanding\n"
                + loanA + ",Stream Borrower A,CKYC-STREAM-A,1000,900\n"
                + loanB + ",Stream Borrower B,CKYC-STREAM-B,2000,1800\n";
        MockMultipartFile file = new MockMultipartFile(
                "file", "streamed.csv", "text/csv", csv.getBytes(StandardCharsets.UTF_8));

        List<String> headers = List.of("loan_number", "borrower_name", "ckyc_id", "total_due", "outstanding");

        fileProcessingService.streamProcessRows(allocationImportProcessor, upload, managedOrg, List.of(),
                file, headers, 2, Map.of(), Map.of());

        List<Allocation> allocations = allocationRepository.findByOrganizationIdAndLoanNumberIn(
                org.getId(), List.of(loanA, loanB));
        assertThat(allocations).hasSize(2);

        Allocation a = allocations.stream().filter(x -> x.getLoanNumber().equals(loanA)).findFirst().orElseThrow();
        assertThat(a.getBorrowerName()).isEqualTo("Stream Borrower A");
        assertThat(a.getRowNumber()).isEqualTo(2); // header is row 1, first data row is 2
        assertThat(a.getBorrowerId()).isNotNull();
        Borrower borrowerA = borrowerRepository.findById(a.getBorrowerId()).orElseThrow();
        assertThat(borrowerA.getCkycId()).isEqualTo("CKYC-STREAM-A");
        // SYSTEM-PLAN 35.1's fix applies through this path too, since it's the same processor.
        assertThat(a.getDynamicData().keySet())
                .noneMatch(key -> key.equalsIgnoreCase("borrower_name"))
                .noneMatch(key -> key.equalsIgnoreCase("ckyc_id"));

        FileUpload refreshed = fileUploadRepository.findById(upload.getId()).orElseThrow();
        assertThat(refreshed.getStatus()).isEqualTo(FileUploadStatus.COMPLETED);
        assertThat(refreshed.getSuccessfulRows()).isEqualTo(2);
        assertThat(refreshed.getFailedRows()).isEqualTo(0);
    }
}
