package com.recoverpro.server.service;

import com.recoverpro.server.common.exception.ResourceNotFoundException;
import com.recoverpro.server.dto.request.CreatePaymentIntentRequest;
import com.recoverpro.server.dto.request.CreatePaymentLinkRequest;
import com.recoverpro.server.entity.PaymentIntent;
import com.recoverpro.server.enums.PaymentIntentStatus;
import com.recoverpro.server.enums.PaymentRail;
import com.recoverpro.server.repository.PaymentIntentRepository;
import com.recoverpro.server.repository.PaymentLinkRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Regression coverage: createIntent took organizationId straight from the request body and
 * createLink fetched a PaymentIntent by id with no isolation check at all, in both cases relying
 * entirely on RLS (fail-closed, but createIntent's INSERT case surfaces as a raw 500 rather than a
 * clean 404 without an app-layer check first).
 */
@ExtendWith(MockitoExtension.class)
class PaymentLinkServiceIsolationTest {

    @Mock private PaymentIntentRepository intentRepository;
    @Mock private PaymentLinkRepository linkRepository;
    @Mock private OrgIsolationGuard orgIsolationGuard;

    private PaymentLinkService service;

    @BeforeEach
    void setUp() {
        service = new PaymentLinkService(intentRepository, linkRepository, orgIsolationGuard);
    }

    @Test
    void createIntent_foreignOrgId_throwsNotFoundBeforeTouchingRepository() {
        when(orgIsolationGuard.belongsToOrg(any())).thenReturn(false);
        CreatePaymentIntentRequest request = new CreatePaymentIntentRequest();
        request.setOrganizationId(UUID.randomUUID());
        request.setAllocationId(UUID.randomUUID());
        request.setAmount(BigDecimal.valueOf(500));

        assertThatThrownBy(() -> service.createIntent(request, UUID.randomUUID(), null))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void createLink_intentBelongsToForeignOrg_throwsNotFound() {
        UUID intentId = UUID.randomUUID();
        PaymentIntent foreignIntent = PaymentIntent.builder()
                .id(intentId)
                .organizationId(UUID.randomUUID())
                .status(PaymentIntentStatus.CREATED)
                .build();
        when(intentRepository.findById(intentId)).thenReturn(Optional.of(foreignIntent));
        when(orgIsolationGuard.belongsToOrg(foreignIntent.getOrganizationId())).thenReturn(false);

        CreatePaymentLinkRequest request = new CreatePaymentLinkRequest();
        request.setIntentId(intentId);
        request.setRail(PaymentRail.UPI);

        assertThatThrownBy(() -> service.createLink(request, UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
