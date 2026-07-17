package com.recoverpro.server.repository;

import com.recoverpro.server.entity.VisitImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VisitImageRepository extends JpaRepository<VisitImage, UUID> {

    List<VisitImage> findByVisitLogIdAndIsDeletedFalseOrderBySequenceNumberAsc(UUID visitLogId);

    Optional<VisitImage> findByVisitLogIdAndSequenceNumberAndIsDeletedFalse(UUID visitLogId, int sequenceNumber);
}
