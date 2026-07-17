package com.recoverpro.server.repository;

import java.time.LocalDate;
import java.util.UUID;

/**
 * Cluster-safe receipt sequence access for (organizationId, seqDate).
 *
 * <p>NOTE: this is a plain interface (not a Spring Data JPA repository) backed
 * by {@link ReceiptSequenceRepositoryImpl}, which issues the native upsert via
 * {@code JdbcTemplate}. The brief's original design extended
 * {@code JpaRepository<Void, Void>}, but Spring Data JPA's repository factory
 * requires the generic domain type to be a JPA-managed entity even when every
 * method is a {@code nativeQuery} — {@code Void} is not, so the app context
 * failed to start ("Not a managed type: class java.lang.Void"). This
 * interface/impl split avoids the Spring Data proxy machinery entirely while
 * keeping the exact same method contract ({@code nextValue}) that
 * {@link com.recoverpro.server.service.impl.ReceiptNumberGeneratorImpl}
 * and its tests depend on.
 */
public interface ReceiptSequenceRepository {

    /**
     * Atomically claims and returns the next value for (organizationId, seqDate)
     * in a single round-trip (upsert + increment + read via {@code RETURNING}),
     * so concurrent callers never see the same value, regardless of how many
     * app instances are running.
     */
    long nextValue(UUID organizationId, LocalDate seqDate);
}
