package com.recoverpro.server.service;

import com.recoverpro.server.common.dto.response.PagedResponse;
import com.recoverpro.server.dto.request.AllocationFilterRequest;
import com.recoverpro.server.dto.request.BulkAssignToFoRequest;
import com.recoverpro.server.dto.request.UpdateAllocationDispositionRequest;
import com.recoverpro.server.dto.request.UpdateAllocationStatusRequest;
import com.recoverpro.server.dto.response.AllocationResponse;

import java.util.List;
import java.util.UUID;

public interface AllocationService {

    PagedResponse<AllocationResponse> getAllocations(AllocationFilterRequest filterRequest);

    AllocationResponse getAllocationById(UUID id);

    AllocationResponse updateAllocationStatus(UUID id, UpdateAllocationStatusRequest request, UUID userId);

    AllocationResponse updateAllocationDisposition(UUID id, UpdateAllocationDispositionRequest request, UUID userId);

    void softDeleteAllocation(UUID id, UUID userId);

    void softDeleteAllocationsByFileUpload(UUID fileUploadId, UUID userId);

    List<AllocationResponse> getAllocationsForBorrower(UUID borrowerId);

    AllocationResponse linkBorrower(UUID allocationId, UUID borrowerId, UUID actingUserId);

    List<AllocationResponse> bulkAssignToFo(UUID callerOrgId, BulkAssignToFoRequest request, UUID actorId);
}
