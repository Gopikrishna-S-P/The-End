package com.recoverpro.server.service;

import com.recoverpro.server.dto.request.ApprovalRequest;
import com.recoverpro.server.dto.request.DepositRequest;
import com.recoverpro.server.dto.request.SubmitCollectionRequest;
import com.recoverpro.server.dto.response.AgentCollectionReport;
import com.recoverpro.server.dto.response.CollectionResponse;
import com.recoverpro.server.enums.CollectionStatus;
import com.recoverpro.server.enums.PaymentMode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface CollectionService {

    CollectionResponse submit(SubmitCollectionRequest request, UUID submittedBy);

    CollectionResponse approve(UUID collectionId, ApprovalRequest request, UUID approvedBy);

    CollectionResponse markDeposited(UUID collectionId, DepositRequest request, UUID depositedBy);

    CollectionResponse getById(UUID id);

    Page<CollectionResponse> getCollections(UUID orgId, UUID agentId, CollectionStatus status,
                                            PaymentMode paymentMode, LocalDate fromDate,
                                            LocalDate toDate, Pageable pageable);

    List<CollectionResponse> getByAllocationId(UUID allocationId);

    List<CollectionResponse> getByAllocationIds(List<UUID> allocationIds);

    AgentCollectionReport getDailyReport(UUID agentId, LocalDate date);

    AgentCollectionReport getAllTimeReport(UUID agentId);

    void cancelCollection(UUID collectionId, UUID cancelledBy);
}
