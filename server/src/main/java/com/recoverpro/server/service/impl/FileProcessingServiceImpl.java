package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.entity.*;
import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.repository.*;
import com.recoverpro.server.security.encryption.LookupHashService;
import com.recoverpro.server.service.FileParsingService;
import com.recoverpro.server.service.FileProcessingService;
import com.recoverpro.server.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileProcessingServiceImpl implements FileProcessingService {

    private final FileUploadRepository fileUploadRepository;
    private final AllocationRepository allocationRepository;
    private final ColumnSchemaRepository columnSchemaRepository;
    private final FileProcessingErrorRepository fileProcessingErrorRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final AssignmentRepository assignmentRepository;
    private final BorrowerRepository borrowerRepository;
    private final LookupHashService lookupHashService;
    private final FileParsingService fileParsingService;
    private final FileStorageService fileStorageService;
    private final FileUploadPostProcessingService fileUploadPostProcessingService;

    @Value("${application.file.batch-size:500}")
    private int batchSize;

    @Value("${application.file.max-rows:50000}")
    private int maxRows;

    @Override
    @Async("fileProcessingExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processFileAsync(UUID fileUploadId, UUID organizationId) {
        log.info("Starting async processing for fileUploadId: {}", fileUploadId);

        FileUpload fileUpload = fileUploadRepository.findByIdAndIsDeletedFalse(fileUploadId)
                .orElseThrow(() -> new ResourceNotFoundException("FileUpload not found: " + fileUploadId));

        Organization organization = organizationRepository.findById(organizationId)
                .filter(o -> o.isActive())
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + organizationId));

        try {
            fileUpload.setStatus(FileUploadStatus.PROCESSING);
            fileUploadRepository.save(fileUpload);

            List<ColumnSchema> columnSchemas = columnSchemaRepository
                    .findAllActiveByOrganizationId(organizationId);

            log.info("Found {} column schemas for organization {}", columnSchemas.size(), organizationId);

            byte[] fileBytes = fileStorageService.retrieve(fileUploadId);
            if (fileBytes == null || fileBytes.length == 0) {
                throw new BusinessException("File bytes not found in storage for fileUploadId: " + fileUploadId);
            }

            MultipartFile multipartFile = new ByteArrayMultipartFile(
                    fileBytes, fileUpload.getOriginalFilename(), fileUpload.getContentType());

            List<Map<String, String>> allRows = fileParsingService.parseFile(multipartFile);
            log.info("Parsed {} rows from file: {}", allRows.size(), fileUpload.getOriginalFilename());

            if (!allRows.isEmpty()) {
                log.info("File headers: {}", allRows.get(0).keySet());
            }

            if (allRows.size() > maxRows) {
                throw new BusinessException("File exceeds maximum allowed rows of " + maxRows);
            }

            fileUpload.setTotalRows(allRows.size());
            fileUploadRepository.save(fileUpload);

            processRowsInBatches(fileUpload, organization, columnSchemas, allRows);

            // Phase 3-C stub: auto-assign and carry-over cleanup deferred
            fileUploadPostProcessingService.autoAssignFromFile(
                    fileUploadId, organizationId, fileUpload.getUploadedByUserId());
            fileUploadPostProcessingService.cancelDroppedLoanAssignments(fileUploadId, organizationId);

            fileStorageService.delete(fileUploadId);

        } catch (Exception e) {
            log.error("Failed to process file: {}", fileUploadId, e);
            fileUpload.setStatus(FileUploadStatus.FAILED);
            fileUpload.setErrorMessage(e.getMessage());
            fileUploadRepository.save(fileUpload);
        }
    }

    @Transactional
    public void processRowsInBatches(FileUpload fileUpload, Organization organization,
                                     List<ColumnSchema> columnSchemas,
                                     List<Map<String, String>> allRows) {
        int totalRows = allRows.size();
        if (totalRows == 0) {
            fileUpload.setStatus(FileUploadStatus.COMPLETED);
            fileUpload.setTotalRows(0);
            fileUpload.setSuccessfulRows(0);
            fileUpload.setFailedRows(0);
            fileUploadRepository.save(fileUpload);
            return;
        }
        int processedRows = 0;
        int successfulRows = 0;
        int failedRows = 0;

        List<String> columnOrder = new ArrayList<>(allRows.get(0).keySet());
        fileUpload.setColumnOrder(columnOrder);
        fileUploadRepository.save(fileUpload);

        Map<String, String> headerMappings = buildHeaderMappings(allRows.get(0).keySet(), columnSchemas);
        log.info("Header mappings: {}", headerMappings);

        List<String> fileLoanNumbers = allRows.stream()
                .map(row -> findValue(row, "loan_number", "loan number", "loannumber", "loan_no"))
                .filter(s -> s != null && !s.isBlank())
                .distinct()
                .collect(Collectors.toList());

        Map<String, Allocation> existingByLoanNumber = Collections.emptyMap();
        if (!fileLoanNumbers.isEmpty()) {
            existingByLoanNumber = allocationRepository
                    .findByOrganizationIdAndLoanNumberIn(organization.getId(), fileLoanNumbers)
                    .stream()
                    .collect(Collectors.toMap(Allocation::getLoanNumber, a -> a, (a, b) -> a));
            log.info("Found {} existing allocations to upsert", existingByLoanNumber.size());
        }

        List<Allocation> batchAllocations = new ArrayList<>();
        List<FileProcessingError> batchErrors = new ArrayList<>();

        for (int rowIndex = 0; rowIndex < totalRows; rowIndex++) {
            Map<String, String> rowData = allRows.get(rowIndex);
            int displayRowNumber = rowIndex + 2;

            try {
                List<FileProcessingError> rowErrors = validateRowDynamic(
                        rowData, columnSchemas, headerMappings, fileUpload, displayRowNumber);

                if (!rowErrors.isEmpty()) {
                    batchErrors.addAll(rowErrors);
                    failedRows++;
                } else {
                    String loanNum = findValue(rowData, "loan_number", "loan number", "loannumber", "loan_no");
                    Allocation allocation = (loanNum != null && !loanNum.isBlank()
                            && existingByLoanNumber.containsKey(loanNum))
                            ? updateAllocationFromRow(existingByLoanNumber.get(loanNum), rowData, fileUpload, organization)
                            : buildAllocationDynamic(rowData, fileUpload, organization, displayRowNumber);
                    batchAllocations.add(allocation);
                    successfulRows++;
                }
            } catch (Exception e) {
                log.warn("Error processing row {}: {}", displayRowNumber, e.getMessage());
                batchErrors.add(FileProcessingError.builder()
                        .fileUpload(fileUpload)
                        .rowNumber(displayRowNumber)
                        .errorMessage("Unexpected error: " + e.getMessage())
                        .build());
                failedRows++;
            }

            processedRows++;

            if (batchAllocations.size() >= batchSize) {
                allocationRepository.saveAll(batchAllocations);
                batchAllocations.clear();
            }
            if (batchErrors.size() >= batchSize) {
                fileProcessingErrorRepository.saveAll(batchErrors);
                batchErrors.clear();
            }
            if (processedRows % batchSize == 0) {
                updateProgress(fileUpload.getId(), processedRows, successfulRows, failedRows,
                        FileUploadStatus.PROCESSING);
                log.info("Progress: {}/{} rows processed", processedRows, totalRows);
            }
        }

        if (!batchAllocations.isEmpty()) allocationRepository.saveAll(batchAllocations);
        if (!batchErrors.isEmpty()) fileProcessingErrorRepository.saveAll(batchErrors);

        FileUploadStatus finalStatus = failedRows == 0
                ? FileUploadStatus.COMPLETED
                : (successfulRows == 0 ? FileUploadStatus.FAILED : FileUploadStatus.PARTIALLY_COMPLETED);

        updateProgress(fileUpload.getId(), totalRows, successfulRows, failedRows, finalStatus);
        log.info("Processing complete. Status: {}. Success: {}, Failed: {}", finalStatus, successfulRows, failedRows);
    }

    private Allocation updateAllocationFromRow(Allocation existing, Map<String, String> rowData,
                                               FileUpload fileUpload, Organization organization) {
        Map<String, Object> dynamicData = new LinkedHashMap<>();
        if (existing.getDynamicData() != null) dynamicData.putAll(existing.getDynamicData());
        rowData.forEach(dynamicData::put);
        existing.setDynamicData(dynamicData);
        existing.setFileUpload(fileUpload);

        String borrowerName = findValue(rowData, "borrower_name", "borrower name", "borrowername", "customer name", "name");
        if (borrowerName != null && !borrowerName.isBlank()) existing.setBorrowerName(borrowerName);

        // Phase 3-C stub: resolveOrCreateBorrowerId deferred
        UUID borrowerId = resolveOrCreateBorrowerId(rowData, organization, borrowerName);
        if (borrowerId != null) existing.setBorrowerId(borrowerId);

        BigDecimal totalDue = parseDecimal(findValue(rowData, "total_due", "totaldue", "total amount", "total_amount"));
        if (totalDue != null) existing.setTotalDue(totalDue);

        BigDecimal outstanding = parseDecimal(findValue(rowData, "outstanding", "outstanding_amount",
                "outstandingamount", "balance", "outstanding_balance", "current_balance"));
        if (outstanding != null) existing.setOutstandingAmount(outstanding);

        Boolean npa = parseBoolean(findValue(rowData, "npa", "npa_flagged", "npaflagged", "is_npa", "isnpa"));
        if (npa != null) existing.setNpaFlagged(npa);

        return existing;
    }

    private Map<String, String> buildHeaderMappings(Set<String> fileHeaders, List<ColumnSchema> schemas) {
        Map<String, String> mappings = new HashMap<>();
        for (ColumnSchema schema : schemas) {
            String schemaName = schema.getName().toLowerCase().replace("_", "").replace(" ", "");
            for (String header : fileHeaders) {
                String normalizedHeader = header.toLowerCase().replace("_", "").replace(" ", "");
                if (normalizedHeader.equals(schemaName)
                        || normalizedHeader.contains(schemaName)
                        || schemaName.contains(normalizedHeader)) {
                    mappings.put(schema.getName(), header);
                    break;
                }
            }
        }
        for (String header : fileHeaders) {
            mappings.putIfAbsent(header, header);
        }
        return mappings;
    }

    private List<FileProcessingError> validateRowDynamic(Map<String, String> rowData,
                                                         List<ColumnSchema> columnSchemas,
                                                         Map<String, String> headerMappings,
                                                         FileUpload fileUpload,
                                                         int rowNumber) {
        List<FileProcessingError> errors = new ArrayList<>();
        for (ColumnSchema schema : columnSchemas) {
            if (Boolean.TRUE.equals(schema.getIsRequired())) {
                String mappedHeader = headerMappings.get(schema.getName());
                if (mappedHeader == null) {
                    errors.add(buildError(fileUpload, rowNumber, schema.getName(),
                            "Required column '" + schema.getDisplayName() + "' not found in file", null));
                } else {
                    String value = rowData.get(mappedHeader);
                    if (value == null || value.isBlank()) {
                        errors.add(buildError(fileUpload, rowNumber, schema.getName(),
                                schema.getDisplayName() + " is required", value));
                    }
                }
            }
        }
        return errors;
    }

    private Allocation buildAllocationDynamic(Map<String, String> rowData, FileUpload fileUpload,
                                              Organization organization, int rowNumber) {
        Map<String, Object> dynamicData = new LinkedHashMap<>(rowData);

        String loanNumber = findValue(rowData, "loan_number", "loan number", "loannumber", "loan_no");
        String borrowerName = findValue(rowData, "borrower_name", "borrower name", "borrowername", "customer name", "name");

        // Phase 3-C stub: null until Borrower entities are available
        UUID borrowerId = resolveOrCreateBorrowerId(rowData, organization, borrowerName);

        BigDecimal totalDue = parseDecimal(findValue(rowData, "total_due", "totaldue", "total amount", "total_amount"));
        BigDecimal outstanding = parseDecimal(findValue(rowData, "outstanding", "outstanding_amount",
                "outstandingamount", "balance", "outstanding_balance", "current_balance"));
        Boolean npa = parseBoolean(findValue(rowData, "npa", "npa_flagged", "npaflagged", "is_npa", "isnpa"));

        return Allocation.builder()
                .fileUpload(fileUpload)
                .organization(organization)
                .loanNumber(loanNumber != null ? loanNumber : "UNKNOWN")
                .borrowerName(borrowerName != null ? borrowerName : "UNKNOWN")
                .borrowerId(borrowerId)
                .status(AllocationStatus.UNASSIGNED)
                .dynamicData(dynamicData)
                .rowNumber(rowNumber)
                .totalDue(totalDue)
                .outstandingAmount(outstanding)
                .npaFlagged(npa != null ? npa : Boolean.FALSE)
                .build();
    }

    /**
     * Upserts a Borrower keyed by CKYC id (preferred) or phone number, so the same person
     * uploaded across multiple files/months resolves to one Borrower row - without this, every
     * DPDP feature (consent, erasure, nominee) is unreachable for real data (SYSTEM-PLAN SP4).
     * Returns null when the row carries neither identifier, since there's nothing safe to dedupe on.
     */
    private UUID resolveOrCreateBorrowerId(Map<String, String> rowData,
                                           Organization organization,
                                           String borrowerName) {
        String ckycId = findValue(rowData, "ckyc_id", "ckyc", "ckycid", "ckyc number", "ckyc_number");
        String phone = findValue(rowData, "phone", "phone_number", "mobile", "mobile_number", "contact_number");
        String email = findValue(rowData, "email", "email_address");

        if (ckycId != null && !ckycId.isBlank()) {
            Optional<Borrower> byCkyc = borrowerRepository
                    .findByOrganizationIdAndCkycIdLookupHash(organization.getId(), lookupHashService.hash(ckycId));
            if (byCkyc.isPresent()) return byCkyc.get().getId();
        }

        String phoneHash = (phone != null && !phone.isBlank()) ? lookupHashService.hashPhone(phone) : null;
        if (phoneHash != null) {
            Optional<Borrower> byPhone = borrowerRepository
                    .findByOrganizationIdAndPhoneLookupHash(organization.getId(), phoneHash);
            if (byPhone.isPresent()) return byPhone.get().getId();
        }

        if ((ckycId == null || ckycId.isBlank()) && phoneHash == null) {
            // No stable identifier on this row - creating a Borrower here would risk an
            // unmatchable duplicate on the next upload, so leave the allocation unlinked.
            return null;
        }

        String emailHash = (email != null && !email.isBlank()) ? lookupHashService.hash(email) : null;
        Borrower created = Borrower.builder()
                .organizationId(organization.getId())
                .ckycId((ckycId != null && !ckycId.isBlank()) ? ckycId : null)
                .firstName(borrowerName != null && !borrowerName.isBlank() ? borrowerName : "UNKNOWN")
                .phone(phone)
                .email(email)
                .phoneLookupHash(phoneHash)
                .emailLookupHash(emailHash)
                .build();
        try {
            return borrowerRepository.save(created).getId();
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Lost a race with a concurrent upload/row creating the same borrower - re-resolve.
            if (ckycId != null && !ckycId.isBlank()) {
                return borrowerRepository
                        .findByOrganizationIdAndCkycIdLookupHash(organization.getId(), lookupHashService.hash(ckycId))
                        .map(Borrower::getId).orElse(null);
            }
            return borrowerRepository.findByOrganizationIdAndPhoneLookupHash(organization.getId(), phoneHash)
                    .map(Borrower::getId).orElse(null);
        }
    }

    @Transactional
    public void updateProgress(UUID fileUploadId, int processedRows, int successfulRows,
                               int failedRows, FileUploadStatus status) {
        fileUploadRepository.updateProgress(fileUploadId, processedRows, successfulRows, failedRows, status);
    }

    private static BigDecimal parseDecimal(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String cleaned = raw.replace("₹", "").replace(",", "").replace("Rs.", "").replace("Rs", "").trim();
        try { return new BigDecimal(cleaned); } catch (NumberFormatException e) { return null; }
    }

    private static Boolean parseBoolean(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String s = raw.trim().toLowerCase();
        if (s.equals("true") || s.equals("yes") || s.equals("y") || s.equals("1")) return Boolean.TRUE;
        if (s.equals("false") || s.equals("no") || s.equals("n") || s.equals("0")) return Boolean.FALSE;
        return null;
    }

    private String findValue(Map<String, String> rowData, String... possibleNames) {
        for (String name : possibleNames) {
            String normalized = name.toLowerCase().replace("_", "").replace(" ", "");
            for (Map.Entry<String, String> entry : rowData.entrySet()) {
                String keyNormalized = entry.getKey().toLowerCase().replace("_", "").replace(" ", "");
                if (keyNormalized.equals(normalized) || keyNormalized.contains(normalized)) {
                    return entry.getValue();
                }
            }
        }
        return null;
    }

    private FileProcessingError buildError(FileUpload fileUpload, int rowNumber,
                                           String columnName, String errorMessage, String rawValue) {
        return FileProcessingError.builder()
                .fileUpload(fileUpload)
                .rowNumber(rowNumber)
                .columnName(columnName)
                .errorMessage(errorMessage)
                .rawValue(rawValue)
                .build();
    }

    private static class ByteArrayMultipartFile implements MultipartFile {
        private final byte[] content;
        private final String originalFilename;
        private final String contentType;

        ByteArrayMultipartFile(byte[] content, String originalFilename, String contentType) {
            this.content = content;
            this.originalFilename = originalFilename;
            this.contentType = contentType;
        }

        @Override public String getName() { return "file"; }
        @Override public String getOriginalFilename() { return originalFilename; }
        @Override public String getContentType() { return contentType; }
        @Override public boolean isEmpty() { return content == null || content.length == 0; }
        @Override public long getSize() { return content.length; }
        @Override public byte[] getBytes() { return content; }
        @Override public InputStream getInputStream() { return new ByteArrayInputStream(content); }
        @Override public void transferTo(java.io.File dest) throws IOException {
            try (java.io.FileOutputStream fos = new java.io.FileOutputStream(dest)) { fos.write(content); }
        }
    }
}
