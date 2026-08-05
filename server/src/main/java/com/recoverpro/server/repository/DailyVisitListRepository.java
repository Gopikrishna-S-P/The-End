package com.recoverpro.server.repository;

import com.recoverpro.server.entity.DailyVisitList;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface DailyVisitListRepository extends JpaRepository<DailyVisitList, UUID> {

    List<DailyVisitList> findByAgentUserIdAndDispatchDateOrderBySequenceOrderAsc(
            UUID agentUserId, LocalDate dispatchDate);

    List<DailyVisitList> findByOrganizationIdAndAgentUserIdAndDispatchDateOrderBySequenceOrderAsc(
            UUID organizationId, UUID agentUserId, LocalDate dispatchDate);

    long countByOrganizationIdAndDispatchDate(UUID organizationId, LocalDate dispatchDate);

    @Query("SELECT COUNT(DISTINCT d.agentUserId) FROM DailyVisitList d WHERE d.organizationId = :orgId AND d.dispatchDate = :date")
    long countDistinctActiveAgentsByOrgAndDate(@Param("orgId") UUID orgId, @Param("date") LocalDate date);

    List<DailyVisitList> findByOrganizationIdAndDispatchDate(UUID organizationId, LocalDate dispatchDate);

    @Query("SELECT d.agentUserId, COUNT(d) FROM DailyVisitList d WHERE d.organizationId = :orgId AND d.dispatchDate = :date GROUP BY d.agentUserId")
    List<Object[]> countByAgentForOrgAndDate(@Param("orgId") UUID orgId, @Param("date") LocalDate date);

    @Modifying
    @Query("DELETE FROM DailyVisitList d WHERE d.organizationId = :orgId AND d.agentUserId = :agentId AND d.dispatchDate = :date")
    void deleteByOrgAndAgentAndDate(@Param("orgId") UUID orgId,
                                    @Param("agentId") UUID agentId,
                                    @Param("date") LocalDate date);

    @Modifying
    @Query("DELETE FROM DailyVisitList d WHERE d.organizationId = :orgId AND d.agentUserId = :agentId AND d.dispatchDate = :date AND d.allocationId = :allocationId")
    void deleteByOrgAndAgentAndDateAndAllocation(@Param("orgId") UUID orgId,
                                                 @Param("agentId") UUID agentId,
                                                 @Param("date") LocalDate date,
                                                 @Param("allocationId") UUID allocationId);
}
