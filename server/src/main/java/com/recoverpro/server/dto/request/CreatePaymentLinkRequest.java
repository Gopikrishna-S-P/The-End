package com.recoverpro.server.dto.request;

import com.recoverpro.server.enums.Channel;
import com.recoverpro.server.enums.PaymentRail;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
public class CreatePaymentLinkRequest {

    @NotNull
    private UUID intentId;

    @NotNull
    private PaymentRail rail;

    private Channel issuedViaChannel;

    private Instant expiresAt;
}
