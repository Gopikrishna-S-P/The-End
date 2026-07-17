package com.recoverpro.server.repository;

import com.recoverpro.server.entity.OrgSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrgSubscriptionRepository extends JpaRepository<OrgSubscription, UUID> {

    Optional<OrgSubscription> findByOrgId(UUID orgId);

    Optional<OrgSubscription> findByStripeCustomerId(String stripeCustomerId);

    Optional<OrgSubscription> findByStripeSubscriptionId(String stripeSubscriptionId);
}
