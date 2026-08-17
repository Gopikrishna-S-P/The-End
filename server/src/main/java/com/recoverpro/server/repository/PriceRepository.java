package com.recoverpro.server.repository;

import com.recoverpro.server.entity.OrgSubscription;
import com.recoverpro.server.entity.Price;
import com.recoverpro.server.enums.BillingInterval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PriceRepository extends JpaRepository<Price, UUID> {

    Optional<Price> findByPlanAndBillingIntervalAndCurrencyAndActiveTrue(
            OrgSubscription.Plan plan, BillingInterval billingInterval, String currency);

    List<Price> findByPlanOrderByEffectiveFromDesc(OrgSubscription.Plan plan);

    Optional<Price> findByStripePriceId(String stripePriceId);

    Optional<Price> findByRazorpayPlanId(String razorpayPlanId);
}
