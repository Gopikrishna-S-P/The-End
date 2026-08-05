package com.recoverpro.server.service.compliance;

import com.recoverpro.server.entity.Assignment;
import com.recoverpro.server.enums.AssignmentStatus;
import com.recoverpro.server.enums.Priority;
import com.recoverpro.server.enums.PtpStatus;
import com.recoverpro.server.repository.AssignmentRepository;
import com.recoverpro.server.repository.PtpRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PtpEscalationService {

    private static final BigDecimal MANDATORY_REVIEW_THRESHOLD = new BigDecimal("50000");

    private final PtpRepository ptpRepository;
    private final AssignmentRepository assignmentRepository;

    @Transactional
    public void onPtpBroken(UUID allocationId, BigDecimal promisedAmount) {
        if (allocationId == null) return;
        try {
            long brokenCount = ptpRepository.findAllByAllocationIdOrderByCreatedAtDesc(allocationId)
                    .stream()
                    .filter(p -> p.getStatus() == PtpStatus.BROKEN)
                    .count();

            Priority target = decideTarget(brokenCount, promisedAmount);
            if (target == null) return;

            Assignment assignment = assignmentRepository
                    .findByAllocationIdAndIsDeletedFalseAndStatusNot(allocationId, AssignmentStatus.COMPLETED)
                    .orElse(null);
            if (assignment == null) {
                log.debug("PTP escalation skipped: no active assignment for allocation {}", allocationId);
                return;
            }

            Priority current = assignment.getPriority();
            if (rank(target) <= rank(current)) {
                log.debug("PTP escalation no-op: allocation {} already at {} (target {})", allocationId, current, target);
                return;
            }

            log.info("PTP escalation: allocation={} brokenCount={} amount={} priority {} -> {}",
                    allocationId, brokenCount, promisedAmount, current, target);
            assignment.setPriority(target);
            assignmentRepository.save(assignment);
        } catch (Exception e) {
            log.warn("PTP escalation failed for allocation {}: {}", allocationId, e.getMessage());
        }
    }

    private Priority decideTarget(long brokenCount, BigDecimal amount) {
        if (amount != null && amount.compareTo(MANDATORY_REVIEW_THRESHOLD) >= 0) return Priority.URGENT;
        if (brokenCount >= 3) return Priority.URGENT;
        if (brokenCount == 2) return Priority.HIGH;
        if (brokenCount == 1) return Priority.MEDIUM;
        return null;
    }

    private static int rank(Priority p) {
        if (p == null) return 0;
        return switch (p) {
            case LOW -> 1;
            case MEDIUM -> 2;
            case HIGH -> 3;
            case URGENT -> 4;
        };
    }
}
