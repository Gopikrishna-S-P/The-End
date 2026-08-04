package com.recoverpro.server.repository;

import com.recoverpro.server.entity.KeyFactStatement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface KeyFactStatementRepository extends JpaRepository<KeyFactStatement, UUID> {

    Optional<KeyFactStatement> findByRestructureProposalId(UUID restructureProposalId);
}
