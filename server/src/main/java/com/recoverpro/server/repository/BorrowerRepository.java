package com.recoverpro.server.repository;

import com.recoverpro.server.entity.Borrower;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface BorrowerRepository extends JpaRepository<Borrower, UUID> {

    Optional<Borrower> findByOrganizationIdAndCkycIdLookupHash(UUID organizationId, String ckycIdLookupHash);

    Page<Borrower> findByOrganizationId(UUID organizationId, Pageable pageable);

    Optional<Borrower> findByOrganizationIdAndPhoneLookupHash(UUID organizationId, String phoneLookupHash);

    Optional<Borrower> findByOrganizationIdAndEmailLookupHash(UUID organizationId, String emailLookupHash);
}
