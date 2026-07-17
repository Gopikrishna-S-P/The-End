package com.recoverpro.server.repository;

import com.recoverpro.server.entity.MessageTemplate;
import com.recoverpro.server.enums.Channel;
import com.recoverpro.server.enums.MessageTemplateStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MessageTemplateRepository extends JpaRepository<MessageTemplate, UUID> {

    Page<MessageTemplate> findByOrganizationIdOrderByTemplateKeyAsc(UUID organizationId, Pageable pageable);

    Optional<MessageTemplate> findByOrganizationIdAndTemplateKeyAndVersion(
            UUID organizationId, String templateKey, String version);

    List<MessageTemplate> findByOrganizationIdAndStatusAndChannel(
            UUID organizationId, MessageTemplateStatus status, Channel channel);

    List<MessageTemplate> findByOrganizationIdAndTemplateKeyOrderByVersionDesc(
            UUID organizationId, String templateKey);
}
