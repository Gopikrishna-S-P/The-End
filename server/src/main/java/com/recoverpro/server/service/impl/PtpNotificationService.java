package com.recoverpro.server.service.impl;

import com.recoverpro.server.config.PlatformConstants;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.PtpRecord;
import com.recoverpro.server.enums.NotificationType;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.service.NotificationService;
import com.recoverpro.server.service.compliance.PtpEscalationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class PtpNotificationService {

    private final NotificationService notificationService;
    private final AllocationRepository allocationRepository;

    public void sendPtpReminderToAgent(PtpRecord ptp) {
        Allocation allocation = allocationRepository.findByIdAndIsDeletedFalse(ptp.getAllocationId())
                .orElse(null);
        if (allocation == null) {
            log.warn("Cannot send PTP reminder: allocation {} not found for PTP {}",
                    ptp.getAllocationId(), ptp.getId());
            return;
        }
        notificationService.create(
                ptp.getAgentId(),
                allocation.getOrganization().getId(),
                NotificationType.FO_PTP_EXPIRING_SOON,
                "PTP due tomorrow: " + ptp.getLoanNumber(),
                "Promise-to-pay for " + ptp.getBorrowerName() + " (loan " + ptp.getLoanNumber()
                        + ") of " + ptp.getPromisedAmount() + " is due on " + ptp.getPromisedDate() + ".");
        log.info("Sent PTP due-date reminder to agent id: {} for PTP id: {}, loan: {}, due: {}",
                ptp.getAgentId(), ptp.getId(), ptp.getLoanNumber(), ptp.getPromisedDate());
    }

    /** Notifies the owning agent that their own PTP broke. */
    public void notifyAgentPtpBroken(PtpRecord ptp) {
        Allocation allocation = allocationRepository.findByIdAndIsDeletedFalse(ptp.getAllocationId())
                .orElse(null);
        if (allocation == null) {
            log.warn("Cannot send PTP-broken notification: allocation {} not found for PTP {}",
                    ptp.getAllocationId(), ptp.getId());
            return;
        }
        notificationService.create(
                ptp.getAgentId(),
                allocation.getOrganization().getId(),
                NotificationType.FO_PTP_BROKEN,
                "PTP broken: " + ptp.getLoanNumber(),
                "Promise-to-pay of " + ptp.getPromisedAmount() + " for loan " + ptp.getLoanNumber()
                        + " (" + ptp.getBorrowerName() + ") was broken.");
    }

    /** Notifies org admins when a broken PTP is above the mandatory-review threshold. */
    public void notifyOrgHighValuePtpBroken(PtpRecord ptp) {
        if (ptp.getPromisedAmount() == null
                || ptp.getPromisedAmount().compareTo(PtpEscalationService.MANDATORY_REVIEW_THRESHOLD) < 0) {
            return;
        }
        Allocation allocation = allocationRepository.findByIdAndIsDeletedFalse(ptp.getAllocationId())
                .orElse(null);
        if (allocation == null) {
            log.warn("Cannot send high-value PTP-broken notification: allocation {} not found for PTP {}",
                    ptp.getAllocationId(), ptp.getId());
            return;
        }
        notificationService.createForOrgRole(
                allocation.getOrganization().getId(),
                PlatformConstants.ROLE_ORG_ADMIN,
                NotificationType.ORG_HIGH_VALUE_PTP_BROKEN,
                "High-value PTP broken: " + ptp.getLoanNumber(),
                "A promise-to-pay of " + ptp.getPromisedAmount() + " for loan " + ptp.getLoanNumber()
                        + " was broken.");
    }
}
