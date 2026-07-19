package com.recoverpro.server.repository;

import com.recoverpro.server.entity.MessageTemplate;
import com.recoverpro.server.enums.Channel;
import com.recoverpro.server.enums.MessageTemplateStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MessageTemplateRepository extends JpaRepository<MessageTemplate, UUID> {

    Page<MessageTemplate> findByOrganizationIdOrderByTemplateKeyAsc(UUID organizationId, Pageable pageable);

    @Query("SELECT t FROM MessageTemplate t WHERE t.organizationId = :organizationId " +
           "AND (:status IS NULL OR t.status = :status) " +
           "AND (:channel IS NULL OR t.channel = :channel) " +
           "ORDER BY t.templateKey ASC")
    Page<MessageTemplate> findWithFilters(
            @Param("organizationId") UUID organizationId,
            @Param("status") MessageTemplateStatus status,
            @Param("channel") Channel channel,
            Pageable pageable);

    Optional<MessageTemplate> findByIdAndOrganizationId(UUID id, UUID organizationId);

    Optional<MessageTemplate> findByOrganizationIdAndTemplateKeyAndVersion(
            UUID organizationId, String templateKey, String version);

    List<MessageTemplate> findByOrganizationIdAndStatusAndChannel(
            UUID organizationId, MessageTemplateStatus status, Channel channel);

    List<MessageTemplate> findByOrganizationIdAndTemplateKeyOrderByVersionDesc(
            UUID organizationId, String templateKey);
}
