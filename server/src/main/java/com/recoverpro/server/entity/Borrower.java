package com.recoverpro.server.entity;

import com.recoverpro.server.security.encryption.EncryptedStringConverter;
import com.recoverpro.server.security.encryption.LookupHashService;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "borrowers", indexes = {
        @Index(name = "idx_borrower_org",  columnList = "organization_id"),
        @Index(name = "idx_borrower_ckyc", columnList = "ckyc_id_lookup_hash")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Borrower {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "organization_id", nullable = false)
    private UUID organizationId;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "ckyc_id", length = 512)
    private String ckycId;

    @Column(name = "ckyc_id_lookup_hash", length = 64)
    private String ckycIdLookupHash;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "first_name", nullable = false, length = 512)
    private String firstName;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "last_name", length = 512)
    private String lastName;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "email", length = 512)
    private String email;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "phone", length = 256)
    private String phone;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(name = "erasure_pending", nullable = false)
    @Builder.Default
    private boolean erasurePending = false;

    @Column(name = "phone_lookup_hash", length = 64)
    private String phoneLookupHash;

    @Column(name = "email_lookup_hash", length = 64)
    private String emailLookupHash;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "nominee_name", length = 1024)
    private String nomineeName;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "nominee_relation", length = 256)
    private String nomineeRelation;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "nominee_phone", length = 256)
    private String nomineePhone;

    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "nominee_email", length = 512)
    private String nomineeEmail;

    @Column(name = "nominee_recorded_at")
    private Instant nomineeRecordedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void syncLookupHashes() {
        LookupHashService svc = LookupHashService.get();
        if (svc == null) return;
        this.phoneLookupHash = svc.hashPhone(phone);
        this.emailLookupHash = svc.hash(email);
        this.ckycIdLookupHash = svc.hash(ckycId);
    }
}
