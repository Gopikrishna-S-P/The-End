package com.recoverpro.server.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Date;
import java.time.LocalDate;
import java.util.UUID;

/**
 * JdbcTemplate-backed implementation of {@link ReceiptSequenceRepository}.
 * See that interface's javadoc for why this isn't a Spring Data JPA repository.
 */
@Repository
@RequiredArgsConstructor
public class ReceiptSequenceRepositoryImpl implements ReceiptSequenceRepository {

    private final JdbcTemplate jdbcTemplate;

    @Override
    @Transactional
    public long nextValue(UUID organizationId, LocalDate seqDate) {
        Long value = jdbcTemplate.queryForObject("""
                INSERT INTO receipt_sequences (organization_id, seq_date, last_value)
                VALUES (?, ?, 1)
                ON CONFLICT (organization_id, seq_date)
                DO UPDATE SET last_value = receipt_sequences.last_value + 1
                RETURNING last_value
                """, Long.class, organizationId, Date.valueOf(seqDate));
        return value != null ? value : 0L;
    }
}
