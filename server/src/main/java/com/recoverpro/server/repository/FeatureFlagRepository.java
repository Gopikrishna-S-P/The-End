package com.recoverpro.server.repository;

import com.recoverpro.server.entity.FeatureFlag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FeatureFlagRepository extends JpaRepository<FeatureFlag, UUID> {

    Optional<FeatureFlag> findByOrganizationIdAndFlagKey(UUID organizationId, String flagKey);

    Optional<FeatureFlag> findByOrganizationIdIsNullAndFlagKey(String flagKey);

    @org.springframework.data.jpa.repository.Query("SELECT f FROM FeatureFlag f WHERE f.organizationId IS NULL AND f.flagKey = :flagKey")
    Optional<FeatureFlag> findGlobalByFlagKey(@org.springframework.data.repository.query.Param("flagKey") String flagKey);

    List<FeatureFlag> findByOrganizationId(UUID organizationId);

    List<FeatureFlag> findByOrganizationIdIsNull();

    void deleteByOrganizationIdAndFlagKey(UUID organizationId, String flagKey);
}
