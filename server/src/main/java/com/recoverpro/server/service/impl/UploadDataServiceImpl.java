package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.response.UploadDataResponse;
import com.recoverpro.server.dto.response.UploadRowResponse;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.service.UploadDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class UploadDataServiceImpl implements UploadDataService {

    private final AllocationRepository allocationRepo;
    private final FileUploadRepository fileUploadRepo;
    private final OrgIsolationGuard orgIsolationGuard;
    private final com.recoverpro.server.service.AllocationSearchIndexService allocationSearchIndexService;

    @Override
    @Transactional(readOnly = true)
    public UploadDataResponse getRows(UUID uploadId, int page, int size) {
        FileUpload upload = requireUpload(uploadId);
        Page<Allocation> allocationPage = allocationRepo.findAllByFileUploadIdPaged(
                uploadId, PageRequest.of(page, size));

        List<String> stored = upload.getColumnOrder();
        List<String> columns = (stored != null && !stored.isEmpty())
                ? stored
                : allocationRepo.findColumnNamesByFileUploadId(uploadId);

        List<UploadRowResponse> rows = allocationPage.getContent().stream()
                .map(this::toRowResponse).collect(Collectors.toList());

        return UploadDataResponse.builder()
                .uploadId(uploadId)
                .filename(upload.getOriginalFilename())
                .status(upload.getStatus().name())
                .columns(columns)
                .rows(rows)
                .totalElements(allocationPage.getTotalElements())
                .totalPages(allocationPage.getTotalPages())
                .currentPage(page)
                .pageSize(size)
                .build();
    }

    @Override
    public UploadRowResponse addRow(UUID uploadId, Map<String, Object> data, UUID userId) {
        FileUpload upload = requireUpload(uploadId);

        String loanNumber = extractString(data, "loan_number", "loanNumber",
                "MAN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        String borrowerName = extractString(data, "borrower_name", "borrowerName", "New Entry");

        Integer maxRow = allocationRepo.findMaxRowNumberByFileUploadId(uploadId);
        int nextRow = (maxRow != null ? maxRow : 0) + 1;

        Allocation allocation = Allocation.builder()
                .fileUpload(upload)
                .organization(upload.getOrganization())
                .loanNumber(loanNumber)
                .borrowerName(borrowerName)
                .rowNumber(nextRow)
                .dynamicData(new HashMap<>(data))
                .build();

        // Must use save()'s returned instance, not the original `allocation` reference: Allocation's
        // @Version field is pre-set to 0L via @Builder.Default, so Spring Data's isNew() check
        // treats this new row as "existing" and routes it through em.merge() instead of
        // em.persist() -- merge() returns a different managed copy and never populates the
        // original object's generated id.
        Allocation saved = allocationRepo.saveAndFlush(allocation);
        allocationSearchIndexService.reindex(saved);
        UploadRowResponse response = toRowResponse(saved);
        upload.setTotalRows((upload.getTotalRows() != null ? upload.getTotalRows() : 0) + 1);
        fileUploadRepo.save(upload);
        return response;
    }

    @Override
    public UploadRowResponse updateRow(UUID uploadId, UUID rowId, Map<String, Object> data) {
        requireUpload(uploadId);
        Allocation allocation = allocationRepo.findByIdAndIsDeletedFalse(rowId)
                .orElseThrow(() -> new ResourceNotFoundException("Row not found: " + rowId));

        if (!allocation.getFileUpload().getId().equals(uploadId)) {
            throw new BusinessException("Row does not belong to this upload");
        }

        allocation.setDynamicData(new HashMap<>(data));

        String loanNumber = extractString(data, "loan_number", "loanNumber", null);
        if (loanNumber != null) allocation.setLoanNumber(loanNumber);

        String borrowerName = extractString(data, "borrower_name", "borrowerName", null);
        if (borrowerName != null) allocation.setBorrowerName(borrowerName);

        Allocation saved = allocationRepo.saveAndFlush(allocation);
        allocationSearchIndexService.reindex(saved);
        return toRowResponse(saved);
    }

    @Override
    public void deleteRow(UUID uploadId, UUID rowId, UUID userId) {
        FileUpload upload = requireUpload(uploadId);
        Allocation allocation = allocationRepo.findByIdAndIsDeletedFalse(rowId)
                .orElseThrow(() -> new ResourceNotFoundException("Row not found: " + rowId));

        if (!allocation.getFileUpload().getId().equals(uploadId)) {
            throw new BusinessException("Row does not belong to this upload");
        }
        allocationRepo.softDelete(rowId, userId);
        if (upload.getTotalRows() != null && upload.getTotalRows() > 0) {
            upload.setTotalRows(upload.getTotalRows() - 1);
            fileUploadRepo.save(upload);
        }
    }

    @Override
    public void addColumn(UUID uploadId, String columnName, String defaultValue) {
        requireUpload(uploadId);
        allocationRepo.addColumnToAllRows(uploadId, columnName, defaultValue != null ? defaultValue : "");
    }

    @Override
    public void deleteColumn(UUID uploadId, String columnName) {
        requireUpload(uploadId);
        allocationRepo.removeColumnFromAllRows(uploadId, columnName);
    }

    private FileUpload requireUpload(UUID uploadId) {
        FileUpload upload = fileUploadRepo.findByIdAndIsDeletedFalse(uploadId)
                .orElseThrow(() -> new ResourceNotFoundException("Upload not found: " + uploadId));
        if (!orgIsolationGuard.belongsToOrg(upload.getOrganization().getId())) {
            throw new ResourceNotFoundException("Upload not found: " + uploadId);
        }
        return upload;
    }

    private UploadRowResponse toRowResponse(Allocation a) {
        return UploadRowResponse.builder()
                .id(a.getId())
                .rowNumber(a.getRowNumber())
                .data(a.getDynamicData() != null ? a.getDynamicData() : new HashMap<>())
                .build();
    }

    private String extractString(Map<String, Object> data, String key1, String key2, String fallback) {
        Object v = data.get(key1);
        if (v == null) v = data.get(key2);
        if (v instanceof String s && !s.isBlank()) return s;
        return fallback;
    }
}
