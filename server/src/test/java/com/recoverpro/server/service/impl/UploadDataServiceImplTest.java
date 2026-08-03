package com.recoverpro.server.service.impl;

import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Covers the FileUpload.totalRows drift bug found during the API audit: the row-editing grid
 * (addRow/deleteRow) never kept this field in sync, so the File Uploads list page's summary count
 * went stale the moment a row was added or removed outside the original CSV import.
 */
@ExtendWith(MockitoExtension.class)
class UploadDataServiceImplTest {

    @Mock private AllocationRepository allocationRepo;
    @Mock private FileUploadRepository fileUploadRepo;
    @Mock private OrgIsolationGuard orgIsolationGuard;

    private UploadDataServiceImpl service;
    private UUID uploadId;
    private FileUpload upload;

    @BeforeEach
    void setUp() {
        service = new UploadDataServiceImpl(allocationRepo, fileUploadRepo, orgIsolationGuard);
        uploadId = UUID.randomUUID();
        Organization org = new Organization();
        org.setId(UUID.randomUUID());
        upload = FileUpload.builder().id(uploadId).organization(org).totalRows(3).build();

        lenient().when(fileUploadRepo.findByIdAndIsDeletedFalse(uploadId)).thenReturn(Optional.of(upload));
        lenient().when(orgIsolationGuard.belongsToOrg(org.getId())).thenReturn(true);
    }

    @Test
    void addRow_incrementsTotalRows() {
        when(allocationRepo.findMaxRowNumberByFileUploadId(uploadId)).thenReturn(3);
        when(allocationRepo.save(any(Allocation.class))).thenAnswer(inv -> inv.getArgument(0));

        service.addRow(uploadId, Map.of("loan_number", "LN-1"), UUID.randomUUID());

        ArgumentCaptor<FileUpload> captor = ArgumentCaptor.forClass(FileUpload.class);
        verify(fileUploadRepo).save(captor.capture());
        assertThat(captor.getValue().getTotalRows()).isEqualTo(4);
    }

    @Test
    void addRow_nullTotalRows_startsFromOne() {
        upload.setTotalRows(null);
        when(allocationRepo.findMaxRowNumberByFileUploadId(uploadId)).thenReturn(null);
        when(allocationRepo.save(any(Allocation.class))).thenAnswer(inv -> inv.getArgument(0));

        service.addRow(uploadId, Map.of(), UUID.randomUUID());

        ArgumentCaptor<FileUpload> captor = ArgumentCaptor.forClass(FileUpload.class);
        verify(fileUploadRepo).save(captor.capture());
        assertThat(captor.getValue().getTotalRows()).isEqualTo(1);
    }

    @Test
    void deleteRow_decrementsTotalRows() {
        UUID rowId = UUID.randomUUID();
        Allocation row = Allocation.builder().id(rowId).fileUpload(upload).build();
        when(allocationRepo.findByIdAndIsDeletedFalse(rowId)).thenReturn(Optional.of(row));

        service.deleteRow(uploadId, rowId, UUID.randomUUID());

        verify(allocationRepo).softDelete(eq(rowId), any());
        ArgumentCaptor<FileUpload> captor = ArgumentCaptor.forClass(FileUpload.class);
        verify(fileUploadRepo).save(captor.capture());
        assertThat(captor.getValue().getTotalRows()).isEqualTo(2);
    }

    @Test
    void deleteRow_totalRowsAlreadyZero_doesNotGoNegative() {
        upload.setTotalRows(0);
        UUID rowId = UUID.randomUUID();
        Allocation row = Allocation.builder().id(rowId).fileUpload(upload).build();
        when(allocationRepo.findByIdAndIsDeletedFalse(rowId)).thenReturn(Optional.of(row));

        service.deleteRow(uploadId, rowId, UUID.randomUUID());

        verify(fileUploadRepo, never()).save(any());
        assertThat(upload.getTotalRows()).isZero();
    }
}
