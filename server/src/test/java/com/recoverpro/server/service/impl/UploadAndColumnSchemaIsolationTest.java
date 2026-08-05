package com.recoverpro.server.service.impl;

import com.recoverpro.server.AbstractIntegrationTest;
import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.ColumnSchemaRequest;
import com.recoverpro.server.entity.ColumnSchema;
import com.recoverpro.server.entity.FileUpload;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.FileUploadStatus;
import com.recoverpro.server.repository.ColumnSchemaRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.security.RlsOrgIdHolder;
import com.recoverpro.server.service.ColumnSchemaService;
import com.recoverpro.server.service.UploadDataService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UploadAndColumnSchemaIsolationTest extends AbstractIntegrationTest {

    @Autowired private UploadDataService uploadDataService;
    @Autowired private ColumnSchemaService columnSchemaService;
    @Autowired private FileUploadRepository fileUploadRepository;
    @Autowired private ColumnSchemaRepository columnSchemaRepository;

    private FileUpload uploadInOrgA;
    private ColumnSchema schemaInOrgA;
    private Organization orgA;

    @AfterEach
    void cleanup() {
        if (orgA != null) RlsOrgIdHolder.set(orgA.getId());
        if (uploadInOrgA != null) fileUploadRepository.deleteById(uploadInOrgA.getId());
        if (schemaInOrgA != null) columnSchemaRepository.deleteById(schemaInOrgA.getId());
        RlsOrgIdHolder.clear();
    }

    @Test
    void deleteColumn_crossOrg_throwsNotFound() {
        orgA = createOrg("sp16-a");
        Organization orgB = createOrg("sp16-b");

        RlsOrgIdHolder.set(orgA.getId());
        Organization managedOrgA = organizationRepository.findById(orgA.getId()).orElseThrow();
        uploadInOrgA = fileUploadRepository.save(FileUpload.builder()
                .organization(managedOrgA)
                .originalFilename("it-test.csv")
                .contentType("text/csv")
                .fileSizeBytes(100L)
                .sha256Hash("it-test-hash-" + System.nanoTime())
                .status(FileUploadStatus.COMPLETED)
                .totalRows(0)
                .build());
        RlsOrgIdHolder.clear();

        User strangerInOrgB = createUser(orgB, "ROLE_ORG_ADMIN");
        actAsUser(strangerInOrgB);
        RlsOrgIdHolder.set(orgA.getId());

        assertThatThrownBy(() -> uploadDataService.deleteColumn(uploadInOrgA.getId(), "some_column"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void updateColumnSchema_crossOrg_throwsNotFound() {
        orgA = createOrg("sp16-schema-a");
        Organization orgB = createOrg("sp16-schema-b");

        RlsOrgIdHolder.set(orgA.getId());
        Organization managedOrgA = organizationRepository.findById(orgA.getId()).orElseThrow();
        schemaInOrgA = columnSchemaRepository.save(ColumnSchema.builder()
                .organization(managedOrgA)
                .name("test_col")
                .displayName("Test Col")
                .dataType("TEXT")
                .isActive(true)
                .build());
        RlsOrgIdHolder.clear();

        User strangerInOrgB = createUser(orgB, "ROLE_ORG_ADMIN");
        actAsUser(strangerInOrgB);
        RlsOrgIdHolder.set(orgA.getId());

        ColumnSchemaRequest request = ColumnSchemaRequest.builder()
                .organizationId(orgB.getId())
                .name("test_col")
                .displayName("Hacked")
                .dataType("TEXT")
                .build();

        assertThatThrownBy(() -> columnSchemaService.updateColumnSchema(schemaInOrgA.getId(), request))
                .isInstanceOfAny(ResourceNotFoundException.class, BusinessException.class);
    }
}
