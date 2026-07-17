package com.recoverpro.server.service;

import com.recoverpro.server.dto.response.LedgerBalanceResponse;
import com.recoverpro.server.entity.Collection;
import com.recoverpro.server.entity.CollectionLedgerEntry;
import com.recoverpro.server.enums.LedgerEntryType;
import com.recoverpro.server.enums.PaymentMode;
import com.recoverpro.server.repository.CollectionLedgerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CollectionLedgerServiceTest {

    @Mock
    private CollectionLedgerRepository ledgerRepository;

    private CollectionLedgerService ledgerService;

    private UUID orgId;
    private UUID actorId;
    private Collection collection;

    @BeforeEach
    void setUp() {
        ledgerService = new CollectionLedgerService(ledgerRepository);
        orgId = UUID.randomUUID();
        actorId = UUID.randomUUID();
        collection = Collection.builder()
                .id(UUID.randomUUID())
                .allocationId(UUID.randomUUID())
                .organizationId(orgId)
                .amount(new BigDecimal("1500.00"))
                .receiptNumber("RCP-20260703-0001-000001")
                .paymentMode(PaymentMode.CASH)
                .build();
    }

    @Test
    void recordApproval_writesDebitTransitCreditOutstanding() {
        when(ledgerRepository.existsByCollectionIdAndEntryType(
                collection.getId(), LedgerEntryType.COLLECTION_APPROVED)).thenReturn(false);

        ledgerService.recordApproval(collection, actorId);

        ArgumentCaptor<CollectionLedgerEntry> captor = ArgumentCaptor.forClass(CollectionLedgerEntry.class);
        verify(ledgerRepository).save(captor.capture());
        CollectionLedgerEntry entry = captor.getValue();

        assertThat(entry.getEntryType()).isEqualTo(LedgerEntryType.COLLECTION_APPROVED);
        assertThat(entry.getDebitAccount()).isEqualTo(CollectionLedgerService.COLLECTIONS_IN_TRANSIT);
        assertThat(entry.getCreditAccount()).isEqualTo(CollectionLedgerService.BORROWER_OUTSTANDING);
        assertThat(entry.getAmount()).isEqualByComparingTo("1500.00");
        assertThat(entry.getOrganizationId()).isEqualTo(orgId);
        assertThat(entry.getCollectionId()).isEqualTo(collection.getId());
        assertThat(entry.getActorId()).isEqualTo(actorId);
        assertThat(entry.getReferenceId()).isEqualTo("RCP-20260703-0001-000001");
    }

    @Test
    void recordApproval_skipsWhenAlreadyRecorded() {
        when(ledgerRepository.existsByCollectionIdAndEntryType(
                collection.getId(), LedgerEntryType.COLLECTION_APPROVED)).thenReturn(true);

        ledgerService.recordApproval(collection, actorId);

        verify(ledgerRepository, never()).save(any());
    }

    @Test
    void recordDeposit_writesDebitBankCreditTransit() {
        when(ledgerRepository.existsByCollectionIdAndEntryType(
                collection.getId(), LedgerEntryType.COLLECTION_DEPOSITED)).thenReturn(false);

        ledgerService.recordDeposit(collection, actorId);

        ArgumentCaptor<CollectionLedgerEntry> captor = ArgumentCaptor.forClass(CollectionLedgerEntry.class);
        verify(ledgerRepository).save(captor.capture());
        CollectionLedgerEntry entry = captor.getValue();

        assertThat(entry.getEntryType()).isEqualTo(LedgerEntryType.COLLECTION_DEPOSITED);
        assertThat(entry.getDebitAccount()).isEqualTo(CollectionLedgerService.BANK_ACCOUNT);
        assertThat(entry.getCreditAccount()).isEqualTo(CollectionLedgerService.COLLECTIONS_IN_TRANSIT);
    }

    @Test
    void recordReversal_writesDebitOutstandingCreditTransit() {
        when(ledgerRepository.existsByCollectionIdAndEntryType(
                collection.getId(), LedgerEntryType.COLLECTION_REVERSAL)).thenReturn(false);

        ledgerService.recordReversal(collection, actorId, "Cancelled after approval");

        ArgumentCaptor<CollectionLedgerEntry> captor = ArgumentCaptor.forClass(CollectionLedgerEntry.class);
        verify(ledgerRepository).save(captor.capture());
        CollectionLedgerEntry entry = captor.getValue();

        assertThat(entry.getEntryType()).isEqualTo(LedgerEntryType.COLLECTION_REVERSAL);
        assertThat(entry.getDebitAccount()).isEqualTo(CollectionLedgerService.BORROWER_OUTSTANDING);
        assertThat(entry.getCreditAccount()).isEqualTo(CollectionLedgerService.COLLECTIONS_IN_TRANSIT);
        assertThat(entry.getNotes()).isEqualTo("Cancelled after approval");
    }

    @Test
    void recordReversal_skipsWhenAlreadyRecorded() {
        when(ledgerRepository.existsByCollectionIdAndEntryType(
                collection.getId(), LedgerEntryType.COLLECTION_REVERSAL)).thenReturn(true);

        ledgerService.recordReversal(collection, actorId, "duplicate attempt");

        verify(ledgerRepository, never()).save(any());
    }

    @Test
    void getBalances_returnsAllThreeAccountsWithDebitCreditSums() {
        when(ledgerRepository.sumDebits(orgId, CollectionLedgerService.BORROWER_OUTSTANDING))
                .thenReturn(new BigDecimal("100.00"));
        when(ledgerRepository.sumCredits(orgId, CollectionLedgerService.BORROWER_OUTSTANDING))
                .thenReturn(new BigDecimal("400.00"));
        when(ledgerRepository.sumDebits(orgId, CollectionLedgerService.COLLECTIONS_IN_TRANSIT))
                .thenReturn(new BigDecimal("400.00"));
        when(ledgerRepository.sumCredits(orgId, CollectionLedgerService.COLLECTIONS_IN_TRANSIT))
                .thenReturn(new BigDecimal("300.00"));
        when(ledgerRepository.sumDebits(orgId, CollectionLedgerService.BANK_ACCOUNT))
                .thenReturn(new BigDecimal("300.00"));
        when(ledgerRepository.sumCredits(orgId, CollectionLedgerService.BANK_ACCOUNT))
                .thenReturn(BigDecimal.ZERO);

        LedgerBalanceResponse response = ledgerService.getBalances(orgId);

        assertThat(response.getOrganizationId()).isEqualTo(orgId);
        assertThat(response.getAccounts()).hasSize(3);
        assertThat(response.getAccounts())
                .extracting(LedgerBalanceResponse.AccountBalance::getAccount)
                .containsExactly(
                        CollectionLedgerService.BORROWER_OUTSTANDING,
                        CollectionLedgerService.COLLECTIONS_IN_TRANSIT,
                        CollectionLedgerService.BANK_ACCOUNT);
        assertThat(response.getAccounts().get(2).getTotalDebits()).isEqualByComparingTo("300.00");
    }
}
