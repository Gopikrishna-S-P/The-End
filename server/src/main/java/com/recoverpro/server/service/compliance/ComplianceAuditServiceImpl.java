package com.recoverpro.server.service.compliance;

import com.recoverpro.server.entity.ComplianceDecision;
import com.recoverpro.server.enums.GuardType;
import com.recoverpro.server.repository.ComplianceDecisionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ComplianceAuditServiceImpl implements ComplianceAuditService {

    private final ComplianceDecisionRepository complianceDecisionRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(GuardType guardType, UUID allocationId, UUID orgId, UUID actorId, String action, String reason) {
        complianceDecisionRepository.save(ComplianceDecision.builder()
                .guardType(guardType)
                .allocationId(allocationId)
                .orgId(orgId)
                .actorId(actorId)
                .action(action)
                .reason(reason)
                .build());
        log.info("Compliance denial recorded: guard={} action={} allocation={} org={} actor={}",
                guardType, action, allocationId, orgId, actorId);
    }
}
