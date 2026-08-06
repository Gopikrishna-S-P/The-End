package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.entity.*;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.enums.UploadType;
import com.recoverpro.server.repository.*;
import com.recoverpro.server.service.FileParsingService;
import com.recoverpro.server.service.FileProcessingService;
import com.recoverpro.server.service.FileStorageService;
import com.recoverpro.server.service.importer.EntityImportProcessor;
import com.recoverpro.server.service.importer.ImportContext;
import com.recoverpro.server.service.importer.ImportFieldSpec;
import com.recoverpro.server.service.importer.ImportValues;
import com.recoverpro.server.service.importer.RowValidationException;
import jakarta.annotation.PostConstruct;
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
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FileProcessingServiceImpl implements FileProcessingService {

    private static final String[] LOAN_NUMBER_ALIASES = {"loan_number", "loan number", "loannumber", "loan_no"};
    private static final String[] AGENT_EMAIL_ALIASES = {"agent_email", "agent email", "agentemail", "email"};

    private final FileUploadRepository fileUploadRepository;
    private final AllocationRepository allocationRepository;
    private final ColumnSchemaRepository columnSchemaRepository;
    private final FileProcessingErrorRepository fileProcessingErrorRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final FileParsingService fileParsingService;
    private final FileStorageService fileStorageService;
    private final FileUploadPostProcessingService fileUploadPostProcessingService;
    private final List<EntityImportProcessor<?>> importProcessors;

    private Map<UploadType, EntityImportProcessor<?>> processorsByType;

    @Value("${application.file.batch-size:500}")
    private int batchSize;

    @Value("${application.file.max-rows:50000}")
    private int maxRows;

    @PostConstruct
    void indexProcessors() {
        processorsByType = importProcessors.stream()
                .collect(Collectors.toMap(EntityImportProcessor::supportedType, Function.identity()));
        log.info("Registered {} import processors: {}", processorsByType.size(), processorsByType.keySet());
    }

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

        UploadType uploadType = fileUpload.getUploadType();
        EntityImportProcessor<?> processor = processorsByType.get(uploadType);
        if (processor == null) {
            throw new BusinessException("No import processor registered for upload type: " + uploadType);
        }

        try {
            fileUpload.setStatus(FileUploadStatus.PROCESSING);
            fileUploadRepository.save(fileUpload);

            List<ColumnSchema> columnSchemas = columnSchemaRepository
                    .findAllActiveByOrganizationIdAndEntityType(organizationId, uploadType);

            log.info("Found {} column schemas for organization {} and type {}",
                    columnSchemas.size(), organizationId, uploadType);

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

            if (!allRows.isEmpty()) {
                assertRequiredHeadersPresent(processor, allRows.get(0).keySet());
            }

            fileUpload.setTotalRows(allRows.size());
            fileUploadRepository.save(fileUpload);

            processRows(processor, fileUpload, organization, columnSchemas, allRows);

            // Auto-assignment and carry-over cleanup are allocation-book operations. Running
            // cancelDroppedLoanAssignments after, say, a collections import would cancel every
            // assignment whose loan simply isn't mentioned in that file.
            if (uploadType == UploadType.ALLOCATION) {
                fileUploadPostProcessingService.autoAssignFromFile(
                        fileUploadId, organizationId, fileUpload.getUploadedByUserId());
                fileUploadPostProcessingService.cancelDroppedLoanAssignments(fileUploadId, organizationId);
            }

            fileStorageService.delete(fileUploadId);

        } catch (Exception e) {
            log.error("Failed to process file: {}", fileUploadId, e);
            fileUpload.setStatus(FileUploadStatus.FAILED);
            fileUpload.setErrorMessage(e.getMessage());
            fileUploadRepository.save(fileUpload);
        }
    }

    @SuppressWarnings("unchecked")
    private void processRows(EntityImportProcessor<?> processor, FileUpload fileUpload, Organization organization,
                             List<ColumnSchema> columnSchemas, List<Map<String, String>> allRows) {
        processRowsInBatches((EntityImportProcessor<Object>) processor,
                fileUpload, organization, columnSchemas, allRows);
    }

    @Transactional
    public <T> void processRowsInBatches(EntityImportProcessor<T> processor,
                                         FileUpload fileUpload,
                                         Organization organization,
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
        int skippedRows = 0;

        List<String> columnOrder = new ArrayList<>(allRows.get(0).keySet());
        fileUpload.setColumnOrder(columnOrder);
        fileUploadRepository.save(fileUpload);

        Map<String, String> headerMappings = buildHeaderMappings(allRows.get(0).keySet(), columnSchemas);
        log.info("Header mappings: {}", headerMappings);

        ImportContext context = ImportContext.builder()
                .organization(organization)
                .fileUpload(fileUpload)
                .importedByUserId(fileUpload.getUploadedByUserId())
                .historicalImport(Boolean.TRUE.equals(fileUpload.getIsHistoricalImport()))
                .columnSchemas(columnSchemas)
                .headerMappings(headerMappings)
                .allocationsByLoanNumber(processor.requiresAllocationLookup()
                        ? prefetchAllocations(organization.getId(), allRows) : Map.of())
                .usersByEmail(processor.requiresAgentLookup()
                        ? prefetchAgents(allRows) : Map.of())
                .build();

        List<T> batch = new ArrayList<>();
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
                    T entity = processor.mapRow(rowData, displayRowNumber, context);
                    if (entity == null) {
                        // Already imported by an earlier upload - not an error, just nothing to do.
                        skippedRows++;
                        successfulRows++;
                    } else {
                        batch.add(entity);
                        successfulRows++;
                    }
                }
            } catch (RowValidationException e) {
                for (RowValidationException.FieldError fe : e.getFieldErrors()) {
                    batchErrors.add(buildError(fileUpload, displayRowNumber,
                            fe.column(), fe.message(), fe.rawValue()));
                }
                failedRows++;
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

            if (batch.size() >= batchSize) {
                processor.persistBatch(batch, context);
                batch.clear();
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

        if (!batch.isEmpty()) processor.persistBatch(batch, context);
        if (!batchErrors.isEmpty()) fileProcessingErrorRepository.saveAll(batchErrors);

        FileUploadStatus finalStatus = failedRows == 0
                ? FileUploadStatus.COMPLETED
                : (successfulRows == 0 ? FileUploadStatus.FAILED : FileUploadStatus.PARTIALLY_COMPLETED);

        updateProgress(fileUpload.getId(), totalRows, successfulRows, failedRows, finalStatus);
        log.info("Processing complete for {}. Status: {}. Success: {}, Failed: {}, Skipped as duplicate: {}",
                fileUpload.getUploadType(), finalStatus, successfulRows, failedRows, skippedRows);
    }

    /**
     * Rejects the file before any row is touched when a required column is missing entirely.
     * Per-row validation would otherwise emit the same "column not found" error thousands of
     * times over, burying the one fact the user needs: which header to add.
     */
    private void assertRequiredHeadersPresent(EntityImportProcessor<?> processor, Set<String> headers) {
        List<String> missing = processor.fieldSpecs().stream()
                .filter(ImportFieldSpec::required)
                .filter(spec -> !ImportValues.hasColumn(headers, spec))
                .map(spec -> spec.label() + " (" + spec.name() + ")")
                .collect(Collectors.toList());

        if (!missing.isEmpty()) {
            throw new BusinessException("This file is missing required column(s): "
                    + String.join(", ", missing)
                    + ". Download the " + processor.supportedType() + " template for the expected format.");
        }
    }

    private Map<String, Allocation> prefetchAllocations(UUID organizationId, List<Map<String, String>> allRows) {
        List<String> loanNumbers = allRows.stream()
                .map(row -> ImportValues.find(row, LOAN_NUMBER_ALIASES))
                .filter(s -> s != null && !s.isBlank())
                .map(String::trim)
                .distinct()
                .collect(Collectors.toList());

        if (loanNumbers.isEmpty()) return Map.of();

        Map<String, Allocation> byLoanNumber = allocationRepository
                .findByOrganizationIdAndLoanNumberIn(organizationId, loanNumbers)
                .stream()
                .collect(Collectors.toMap(Allocation::getLoanNumber, a -> a, (a, b) -> a));
        log.info("Resolved {} of {} referenced loan numbers", byLoanNumber.size(), loanNumbers.size());
        return byLoanNumber;
    }

    private Map<String, User> prefetchAgents(List<Map<String, String>> allRows) {
        List<String> emails = allRows.stream()
                .map(row -> ImportValues.find(row, AGENT_EMAIL_ALIASES))
                .filter(s -> s != null && !s.isBlank())
                .map(s -> s.trim().toLowerCase())
                .distinct()
                .collect(Collectors.toList());

        if (emails.isEmpty()) return Map.of();

        return userRepository.findByEmailIgnoreCaseIn(emails).stream()
                .collect(Collectors.toMap(u -> u.getEmail().toLowerCase(), u -> u, (a, b) -> a));
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

    @Transactional
    public void updateProgress(UUID fileUploadId, int processedRows, int successfulRows,
                               int failedRows, FileUploadStatus status) {
        fileUploadRepository.updateProgress(fileUploadId, processedRows, successfulRows, failedRows, status);
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
