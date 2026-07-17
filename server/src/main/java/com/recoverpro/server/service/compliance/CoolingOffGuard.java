package com.recoverpro.server.service.compliance;

import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.enums.GuardType;
import com.recoverpro.server.repository.AllocationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CoolingOffGuard {

    private final AllocationRepository allocationRepository;
    private final ComplianceAuditService complianceAuditService;

    public boolean isBlocked(UUID allocationId) {
        if (allocationId == null) return true;
        Allocation a = allocationRepository.findById(allocationId).orElse(null);
        if (a == null) {
            log.warn("Cooling-off check on unknown allocation {} -- denying", allocationId);
            return true;
        }
        return a.isInCoolingOff();
    }

    public void enforce(UUID allocationId, UUID orgId, UUID actorId) {
        Allocation a = allocationRepository.findById(allocationId).orElse(null);
        if (a == null) {
            throw new CoolingOffActiveException(
                    "Cooling-off check failed: allocation " + allocationId + " not found");
        }
        if (a.isInCoolingOff()) {
            Instant expiry = a.getCoolingOffUntil();
            log.info("Recovery action denied for allocation {} (cooling-off until {})", allocationId, expiry);
            String reason = "Allocation is in RBI-mandated cooling-off period until " + expiry;
            complianceAuditService.record(GuardType.COOLING_OFF, allocationId, orgId, actorId, "CREATE_PTP", reason);
            throw new CoolingOffActiveException(reason);
        }
    }
}
