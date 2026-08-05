package com.recoverpro.server.mapper;

import com.recoverpro.server.dto.request.CreatePtpRequest;
import com.recoverpro.server.dto.response.PtpHistoryResponse;
import com.recoverpro.server.dto.response.PtpResponse;
import com.recoverpro.server.entity.PtpHistory;
import com.recoverpro.server.entity.PtpRecord;
import com.recoverpro.server.enums.PtpStatus;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Component
public class PtpMapper {

    public PtpRecord toEntity(CreatePtpRequest request, UUID createdBy) {
        return PtpRecord.builder()
                .allocationId(request.getAllocationId())
                .agentId(request.getAgentId())
                .agentName(request.getAgentName())
                .loanNumber(request.getLoanNumber())
                .borrowerName(request.getBorrowerName())
                .promisedDate(request.getPromisedDate())
                .promisedAmount(request.getPromisedAmount())
                .collectedAmount(BigDecimal.ZERO)
                .status(PtpStatus.PENDING)
                .contactNotes(request.getContactNotes())
                .reminderSent(false)
                .createdBy(createdBy)
                .isDeleted(false)
                .build();
    }

    public PtpResponse toResponse(PtpRecord entity) {
        BigDecimal fulfillmentPct = BigDecimal.ZERO;
        if (entity.getPromisedAmount() != null && entity.getPromisedAmount().compareTo(BigDecimal.ZERO) > 0
                && entity.getCollectedAmount() != null) {
            fulfillmentPct = entity.getCollectedAmount()
                    .multiply(BigDecimal.valueOf(100))
                    .divide(entity.getPromisedAmount(), 2, RoundingMode.HALF_UP);
        }

        return PtpResponse.builder()
                .id(entity.getId())
                .allocationId(entity.getAllocationId())
                .agentId(entity.getAgentId())
                .agentName(entity.getAgentName())
                .loanNumber(entity.getLoanNumber())
                .borrowerName(entity.getBorrowerName())
                .promisedDate(entity.getPromisedDate())
                .promisedAmount(entity.getPromisedAmount())
                .collectedAmount(entity.getCollectedAmount())
                .status(entity.getStatus())
                .contactNotes(entity.getContactNotes())
                .cancellationReason(entity.getCancellationReason())
                .brokenReason(entity.getBrokenReason())
                .reminderSent(entity.getReminderSent())
                .reminderSentAt(entity.getReminderSentAt())
                .fulfilledAt(entity.getFulfilledAt())
                .brokenAt(entity.getBrokenAt())
                .createdBy(entity.getCreatedBy())
                .updatedBy(entity.getUpdatedBy())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .fulfillmentPercentage(fulfillmentPct)
                .build();
    }

    public PtpHistoryResponse toHistoryResponse(PtpHistory history) {
        return PtpHistoryResponse.builder()
                .id(history.getId())
                .ptpId(history.getPtpId())
                .allocationId(history.getAllocationId())
                .previousStatus(history.getPreviousStatus())
                .newStatus(history.getNewStatus())
                .collectedAmountSnapshot(history.getCollectedAmountSnapshot())
                .changeReason(history.getChangeReason())
                .changedBy(history.getChangedBy())
                .changedByName(history.getChangedByName())
                .changedAt(history.getChangedAt())
                .build();
    }
}
