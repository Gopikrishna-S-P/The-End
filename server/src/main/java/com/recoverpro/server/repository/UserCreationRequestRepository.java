package com.recoverpro.server.repository;

import com.recoverpro.server.entity.UserCreationRequest;
import com.recoverpro.server.entity.UserCreationRequest.RequestStatus;
import com.recoverpro.server.entity.UserCreationRequest.RequestedRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserCreationRequestRepository extends JpaRepository<UserCreationRequest, UUID> {

    Page<UserCreationRequest> findByOrganizationIdOrderByCreatedAtDesc(UUID organizationId, Pageable pageable);

    List<UserCreationRequest> findByOrganizationIdAndStatus(UUID organizationId, RequestStatus status);

    Page<UserCreationRequest> findByStatusOrderByCreatedAtDesc(RequestStatus status, Pageable pageable);

    boolean existsByRequestedEmailAndOrganizationId(String email, UUID organizationId);

    boolean existsByRequestedEmailAndStatus(String email, RequestStatus status);

    Page<UserCreationRequest> findByRequestedRoleAndStatusOrderByCreatedAtDesc(
            RequestedRole role, RequestStatus status, Pageable pageable);

    Page<UserCreationRequest> findByOrganizationIdAndRequestedRoleAndStatusOrderByCreatedAtDesc(
            UUID organizationId, RequestedRole role, RequestStatus status, Pageable pageable);

    Page<UserCreationRequest> findByRequestedByIdOrderByCreatedAtDesc(UUID requestedById, Pageable pageable);

    long countByRequestedRoleAndStatus(RequestedRole role, RequestStatus status);

    long countByOrganizationIdAndRequestedRoleAndStatus(UUID organizationId, RequestedRole role, RequestStatus status);
}
