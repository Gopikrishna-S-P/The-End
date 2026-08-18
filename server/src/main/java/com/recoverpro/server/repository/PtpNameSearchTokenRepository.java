package com.recoverpro.server.repository;

import com.recoverpro.server.entity.PtpNameSearchToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PtpNameSearchTokenRepository
        extends JpaRepository<PtpNameSearchToken, PtpNameSearchToken.Key> {

    List<PtpNameSearchToken> findByPtpId(UUID ptpId);

    @Modifying
    @Query("DELETE FROM PtpNameSearchToken t WHERE t.ptpId = :ptpId")
    void deleteByPtpId(@Param("ptpId") UUID ptpId);
}
