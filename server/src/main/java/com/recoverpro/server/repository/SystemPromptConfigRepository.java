package com.recoverpro.server.repository;

import com.recoverpro.server.entity.SystemPromptConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SystemPromptConfigRepository extends JpaRepository<SystemPromptConfig, UUID> {

    Optional<SystemPromptConfig> findByPromptKeyAndIsActiveTrue(String promptKey);

    List<SystemPromptConfig> findAllByIsActiveTrueOrderByPromptKeyAsc();

    Optional<SystemPromptConfig> findByPromptKey(String promptKey);

    boolean existsByPromptKey(String promptKey);
}
