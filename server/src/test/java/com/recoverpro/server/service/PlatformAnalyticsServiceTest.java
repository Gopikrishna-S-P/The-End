package com.recoverpro.server.service;

import com.recoverpro.server.dto.response.PlatformAnalyticsResponse;
import com.recoverpro.server.entity.OrgSubscription;
import com.recoverpro.server.entity.OrgSubscription.Plan;
import com.recoverpro.server.entity.OrgSubscription.Status;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.repository.OrgSubscriptionRepository;
import com.recoverpro.server.repository.OrganizationRepository;
import com.recoverpro.server.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlatformAnalyticsServiceTest {

    @Mock private OrgSubscriptionRepository subRepo;
    @Mock private OrganizationRepository orgRepo;
    @Mock private UserRepository userRepo;

    private PlatformAnalyticsService service;

    @BeforeEach
    void setUp() {
        service = new PlatformAnalyticsService(subRepo, orgRepo, userRepo);
        lenient().when(orgRepo.findTenantOrgs()).thenReturn(List.of());
        lenient().when(userRepo.findMonthlyUserGrowth(any(), any())).thenReturn(List.of());
    }

    @Test
    void build_usesRealPlanAmountFromStripe_notHardcodedMap() {
        OrgSubscription sub = OrgSubscription.builder()
                .orgId(UUID.randomUUID())
                .status(Status.ACTIVE)
                .plan(Plan.GROWTH)
                .planAmount(new BigDecimal("8999.00")) // real Stripe price, different from the old hardcoded 7999
                .createdAt(Instant.now())
                .build();
        when(subRepo.findAll()).thenReturn(List.of(sub));

        PlatformAnalyticsResponse response = service.build(1);

        assertThat(response.getMrr()).isEqualTo(8999L);
        assertThat(response.getArr()).isEqualTo(8999L * 12);
    }

    @Test
    void build_planAmountNull_fallsBackToDefaultListPrice() {
        OrgSubscription sub = OrgSubscription.builder()
                .orgId(UUID.randomUUID())
                .status(Status.ACTIVE)
                .plan(Plan.STARTER)
                .planAmount(null)
                .createdAt(Instant.now())
                .build();
        when(subRepo.findAll()).thenReturn(List.of(sub));

        PlatformAnalyticsResponse response = service.build(1);

        assertThat(response.getMrr()).isEqualTo(2999L);
    }

    @Test
    void build_topOrgsByUsers_usesGroupedCountNotPerOrgQuery() {
        UUID orgAId = UUID.randomUUID();
        UUID orgBId = UUID.randomUUID();
        Organization orgA = Organization.builder().id(orgAId).name("Org A").build();
        Organization orgB = Organization.builder().id(orgBId).name("Org B").build();
        when(subRepo.findAll()).thenReturn(List.of());
        when(orgRepo.findTenantOrgs()).thenReturn(List.of(orgA, orgB));
        when(userRepo.countGroupedByOrganizationIdIn(List.of(orgAId, orgBId)))
                .thenReturn(List.of(new Object[]{orgAId, 5L}, new Object[]{orgBId, 2L}));

        PlatformAnalyticsResponse response = service.build(1);

        assertThat(response.getTopOrgsByUsers()).hasSize(2);
        assertThat(response.getTopOrgsByUsers().get(0).getName()).isEqualTo("Org A");
        assertThat(response.getTopOrgsByUsers().get(0).getValue()).isEqualTo(5L);
        assertThat(response.getTopOrgsByUsers().get(1).getName()).isEqualTo("Org B");
        assertThat(response.getTopOrgsByUsers().get(1).getValue()).isEqualTo(2L);
    }
}
