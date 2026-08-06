package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.request.ColumnSchemaRequest;
import com.recoverpro.server.dto.response.ColumnSchemaResponse;
import com.recoverpro.server.entity.ColumnSchema;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.enums.UploadType;
import com.recoverpro.server.exception.DuplicateResourceException;
import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.mapper.ColumnSchemaMapper;
import com.recoverpro.server.repository.ColumnSchemaRepository;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.service.ColumnSchemaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ColumnSchemaServiceImpl implements ColumnSchemaService {

    private final ColumnSchemaRepository columnSchemaRepository;
    private final OrganizationRepository organizationRepository;
    private final ColumnSchemaMapper columnSchemaMapper;
    private final OrgIsolationGuard orgIsolationGuard;

    @Override
    @Transactional
    public ColumnSchemaResponse createColumnSchema(ColumnSchemaRequest request) {
        if (!orgIsolationGuard.belongsToOrg(request.getOrganizationId())) {
            throw new BusinessException("Access denied: organization mismatch");
        }
        UploadType entityType = request.getEntityType() != null ? request.getEntityType() : UploadType.ALLOCATION;

        // Scoped by entity: "amount" must be definable separately for collections and PTPs.
        if (columnSchemaRepository.existsByOrganizationIdAndEntityTypeAndName(
                request.getOrganizationId(), entityType, request.getName())) {
            throw new DuplicateResourceException("Column schema with name '" + request.getName()
                    + "' already exists for " + entityType + " in this organization");
        }

        Organization organization = organizationRepository.findById(request.getOrganizationId())
                .filter(o -> o.isActive())
                .orElseThrow(() -> new ResourceNotFoundException("Organization not found: " + request.getOrganizationId()));

        ColumnSchema schema = ColumnSchema.builder()
                .organization(organization)
                .entityType(entityType)
                .name(request.getName())
                .displayName(request.getDisplayName())
                .dataType(request.getDataType())
                .isRequired(request.getIsRequired() != null ? request.getIsRequired() : false)
                .isSearchable(request.getIsSearchable() != null ? request.getIsSearchable() : false)
                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0)
                .validationRules(request.getValidationRules())
                .build();

        return columnSchemaMapper.toResponse(columnSchemaRepository.save(schema));
    }

    @Override
    @Transactional
    public ColumnSchemaResponse updateColumnSchema(UUID id, ColumnSchemaRequest request) {
        ColumnSchema schema = columnSchemaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Column schema not found: " + id));
        if (!orgIsolationGuard.belongsToOrg(schema.getOrganization().getId())) {
            throw new ResourceNotFoundException("Column schema not found: " + id);
        }

        schema.setDisplayName(request.getDisplayName());
        schema.setDataType(request.getDataType());
        if (request.getIsRequired() != null) schema.setIsRequired(request.getIsRequired());
        if (request.getIsSearchable() != null) schema.setIsSearchable(request.getIsSearchable());
        if (request.getSortOrder() != null) schema.setSortOrder(request.getSortOrder());
        if (request.getValidationRules() != null) schema.setValidationRules(request.getValidationRules());

        return columnSchemaMapper.toResponse(columnSchemaRepository.save(schema));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ColumnSchemaResponse> getColumnSchemasByOrganization(UUID organizationId) {
        return getColumnSchemasByOrganization(organizationId, null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ColumnSchemaResponse> getColumnSchemasByOrganization(UUID organizationId, UploadType entityType) {
        if (!orgIsolationGuard.belongsToOrg(organizationId)) {
            throw new BusinessException("Access denied: organization mismatch");
        }
        List<ColumnSchema> schemas = entityType == null
                ? columnSchemaRepository.findAllActiveByOrganizationId(organizationId)
                : columnSchemaRepository.findAllActiveByOrganizationIdAndEntityType(organizationId, entityType);
        return schemas.stream().map(columnSchemaMapper::toResponse).toList();
    }

    @Override
    @Transactional
    public void deactivateColumnSchema(UUID id) {
        ColumnSchema schema = columnSchemaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Column schema not found: " + id));
        if (!orgIsolationGuard.belongsToOrg(schema.getOrganization().getId())) {
            throw new ResourceNotFoundException("Column schema not found: " + id);
        }
        schema.setIsActive(false);
        columnSchemaRepository.save(schema);
    }
}
