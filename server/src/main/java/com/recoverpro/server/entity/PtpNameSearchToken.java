package com.recoverpro.server.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.util.UUID;

@Entity
@Table(name = "ptp_name_search_tokens",
        indexes = { @Index(name = "idx_ptp_name_search_tokens_hash", columnList = "token_hash") })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@IdClass(PtpNameSearchToken.Key.class)
public class PtpNameSearchToken {

    @Id
    @Column(name = "ptp_id", nullable = false, updatable = false)
    private UUID ptpId;

    @Id
    @Column(name = "token_hash", nullable = false, updatable = false, length = 64)
    private String tokenHash;

    @Column(name = "organization_id", nullable = false, updatable = false)
    private UUID organizationId;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    public static class Key implements Serializable {
        private UUID ptpId;
        private String tokenHash;
    }
}
