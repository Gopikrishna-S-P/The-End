package com.recoverpro.server.service.impl;

import com.recoverpro.server.dto.request.CreateBorrowerRequest;
import com.recoverpro.server.entity.Borrower;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.BorrowerRepository;
import com.recoverpro.server.repository.DataErasureRequestRepository;
import com.recoverpro.server.repository.NpaRecordRepository;
import com.recoverpro.server.repository.PtpRepository;
import com.recoverpro.server.security.OrgIsolationGuard;
import com.recoverpro.server.security.encryption.LookupHashService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * The duplicate-phone pre-check in create() must hash the phone the exact
 * same way Borrower.syncLookupHashes() does at persistence time (hashPhone,
 * which strips formatting before hashing) - otherwise a phone submitted with
 * different formatting than it was originally stored with (e.g. "+91
 * 98765-43210" vs the digits-only hash actually on the row) silently misses
 * a real duplicate.
 */
@ExtendWith(MockitoExtension.class)
class BorrowerServiceImplPhoneDedupTest {

    @Mock private BorrowerRepository borrowerRepository;
    @Mock private DataErasureRequestRepository erasureRepository;
    @Mock private AllocationRepository allocationRepository;
    @Mock private PtpRepository ptpRepository;
    @Mock private NpaRecordRepository npaRecordRepository;
    @Mock private OrgIsolationGuard orgIsolationGuard;

    private BorrowerServiceImpl service;
    private LookupHashService lookupHashService;

    @BeforeEach
    void setUp() {
        // Set hmacKey directly rather than calling init(), which would overwrite the
        // process-wide static LookupHashService.INSTANCE and poison every other test
        // (e.g. Borrower's @PrePersist hook, which reads that static) sharing this JVM.
        lookupHashService = new LookupHashService();
        ReflectionTestUtils.setField(lookupHashService, "hmacKey", new byte[32]);

        service = new BorrowerServiceImpl(borrowerRepository, erasureRepository, allocationRepository,
                ptpRepository, npaRecordRepository, lookupHashService, orgIsolationGuard);

        when(orgIsolationGuard.belongsToOrg(any())).thenReturn(true);
        when(borrowerRepository.save(any(Borrower.class))).thenAnswer(inv -> {
            Borrower b = inv.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });
    }

    @Test
    void duplicateCheck_hashesPhoneTheSameWayAsPersistence() {
        String formattedPhone = "+91 98765-43210";
        String expectedStoredHash = lookupHashService.hashPhone(formattedPhone);

        CreateBorrowerRequest request = new CreateBorrowerRequest();
        request.setOrganizationId(UUID.randomUUID());
        request.setFirstName("Test");
        request.setPhone(formattedPhone);

        when(borrowerRepository.findByOrganizationIdAndPhoneLookupHash(any(), any()))
                .thenReturn(Optional.empty());

        service.create(request);

        org.mockito.ArgumentCaptor<String> hashCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(borrowerRepository)
                .findByOrganizationIdAndPhoneLookupHash(any(), hashCaptor.capture());

        assertThat(hashCaptor.getValue())
                .as("the duplicate pre-check must hash the phone the same way the entity does at persistence time")
                .isEqualTo(expectedStoredHash);
    }
}
