package com.recoverpro.server.service.impl;

import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.AssignmentStatus;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.AssignmentRepository;
import com.recoverpro.server.repository.FileUploadRepository;
import com.recoverpro.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Post-processing steps that run after a file upload's rows are saved: auto-assigning to a named
 * field officer, and cancelling assignments for loans that dropped out of the newest book.
 *
 * Kept as a separate bean (rather than methods on FileProcessingServiceImpl) so their
 * {@code @Transactional(REQUIRES_NEW)} actually applies -- calling them from
 * FileProcessingServiceImpl.processFileAsync via plain self-invocation would bypass the Spring
 * proxy and silently run them in the caller's own transaction instead (SYSTEM-PLAN SP32).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FileUploadPostProcessingService {

    private static final Set<AssignmentStatus> OPEN_ASSIGNMENT_STATUSES = Set.of(
            AssignmentStatus.PENDING,
            AssignmentStatus.IN_PROGRESS,
            AssignmentStatus.RESCHEDULED,
            AssignmentStatus.REASSIGNED);

    private final AllocationRepository allocationRepository;
    private final FileUploadRepository fileUploadRepository;
    private final UserRepository userRepository;
    private final AssignmentRepository assignmentRepository;

    /** Phase 3-C stub — auto-assign via Assignment entity deferred until Phase 3-C. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void autoAssignFromFile(UUID fileUploadId, UUID organizationId, UUID uploadedByUserId) {
        List<Allocation> allocations = allocationRepository.findAllByFileUploadId(fileUploadId);
        if (allocations.isEmpty()) return;

        List<Allocation> toAssign = new ArrayList<>();
        for (Allocation a : allocations) {
            String foName = findValueInObject(a.getDynamicData(),
                    "field executive", "field_executive", "fieldexecutive");
            if (foName == null || foName.isBlank()) continue;

            List<User> matches = userRepository.findByOrganizationIdAndRoleName(organizationId, "ROLE_FO");
            for (User fo : matches) {
                String full = ((fo.getFirstName() != null ? fo.getFirstName() : "") + " "
                        + (fo.getLastName() != null ? fo.getLastName() : "")).trim();
                if (foName.trim().equalsIgnoreCase(full)
                        || foName.trim().equalsIgnoreCase(fo.getFirstName())
                        || foName.trim().equalsIgnoreCase(fo.getEmail())) {
                    a.setStatus(AllocationStatus.ASSIGNED);
                    a.setAssignedToUserId(fo.getId());
                    a.setAssignedAt(Instant.now());
                    toAssign.add(a);
                    break;
                }
            }
        }
        if (!toAssign.isEmpty()) {
            allocationRepository.saveAll(toAssign);
            fileUploadRepository.updateAutoAssignCounts(
                    fileUploadId, toAssign.size(), (int) (allocations.stream()
                            .filter(a -> findValueInObject(a.getDynamicData(),
                                    "field executive", "field_executive", "fieldexecutive") != null)
                            .count() - toAssign.size()));
        }
    }

    private static String findValueInObject(Map<String, Object> data, String... keys) {
        if (data == null) return null;
        for (Map.Entry<String, Object> e : data.entrySet()) {
            String k = e.getKey().trim().toLowerCase();
            for (String key : keys) {
                if (k.equals(key.toLowerCase())) {
                    return e.getValue() != null ? e.getValue().toString() : null;
                }
            }
        }
        return null;
    }

    /**
     * Cancels open Assignments for allocations that were NOT part of this upload's book
     * (i.e., their Allocation.fileUpload still points at an older upload for this org) - these
     * loans dropped out of the book and must not keep showing up on an FO's active list.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void cancelDroppedLoanAssignments(UUID fileUploadId, UUID organizationId) {
        long newFileRows = allocationRepository.countByFileUploadId(fileUploadId);
        if (newFileRows == 0) {
            log.warn("Carry-over cleanup skipped: file {} has no allocations", fileUploadId);
            return;
        }
        int cancelled = assignmentRepository.cancelOpenAssignmentsForDroppedLoans(
                organizationId, fileUploadId, OPEN_ASSIGNMENT_STATUSES, AssignmentStatus.CANCELLED);
        log.info("Dropped-loan cleanup: {} assignments cancelled for org={}, newFile={}",
                cancelled, organizationId, fileUploadId);
    }
}
