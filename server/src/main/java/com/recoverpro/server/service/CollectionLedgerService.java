package com.recoverpro.server.service;

import com.recoverpro.server.dto.response.LedgerBalanceResponse;
import com.recoverpro.server.entity.Collection;
import com.recoverpro.server.entity.CollectionLedgerEntry;
import com.recoverpro.server.enums.LedgerEntryType;
import com.recoverpro.server.repository.CollectionLedgerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Writes double-entry journal entries for every collection state transition.
 * Each method runs in REQUIRES_NEW so a ledger write failure does not roll back
 * the business transaction, and an outer rollback does not kill the audit trail.
 *
 * Account semantics:
 *   BORROWER_OUTSTANDING   -- total amount owed by borrowers across all allocations
 *   COLLECTIONS_IN_TRANSIT -- approved by TL, in agent's hands pending bank deposit
 *   BANK_ACCOUNT           -- confirmed bank deposit
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CollectionLedgerService {

    public static final String BORROWER_OUTSTANDING   = "BORROWER_OUTSTANDING";
    public static final String COLLECTIONS_IN_TRANSIT = "COLLECTIONS_IN_TRANSIT";
    public static final String BANK_ACCOUNT           = "BANK_ACCOUNT";

    private final CollectionLedgerRepository ledgerRepository;

    /**
     * On TL approval: money moves from borrower-outstanding into agent's custody.
     * DR COLLECTIONS_IN_TRANSIT / CR BORROWER_OUTSTANDING
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordApproval(Collection c, UUID actorId) {
        if (ledgerRepository.existsByCollectionIdAndEntryType(c.getId(), LedgerEntryType.COLLECTION_APPROVED)) {
            log.warn("Ledger entry COLLECTION_APPROVED already exists for collection {}", c.getId());
            return;
        }
        save(c, LedgerEntryType.COLLECTION_APPROVED,
                COLLECTIONS_IN_TRANSIT, BORROWER_OUTSTANDING,
                actorId, c.getReceiptNumber(), "Collection approved");
        log.info("Ledger: COLLECTION_APPROVED collectionId={} amount={}", c.getId(), c.getAmount());
    }

    /**
     * On deposit confirmation: money moves from transit into bank.
     * DR BANK_ACCOUNT / CR COLLECTIONS_IN_TRANSIT
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordDeposit(Collection c, UUID actorId) {
        if (ledgerRepository.existsByCollectionIdAndEntryType(c.getId(), LedgerEntryType.COLLECTION_DEPOSITED)) {
            log.warn("Ledger entry COLLECTION_DEPOSITED already exists for collection {}", c.getId());
            return;
        }
        save(c, LedgerEntryType.COLLECTION_DEPOSITED,
                BANK_ACCOUNT, COLLECTIONS_IN_TRANSIT,
                actorId, c.getReceiptNumber(), "Collection deposited");
        log.info("Ledger: COLLECTION_DEPOSITED collectionId={} amount={}", c.getId(), c.getAmount());
    }

    /**
     * On cancellation of a previously-APPROVED collection: reverse the approval entry.
     * DR BORROWER_OUTSTANDING / CR COLLECTIONS_IN_TRANSIT
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordReversal(Collection c, UUID actorId, String reason) {
        if (ledgerRepository.existsByCollectionIdAndEntryType(c.getId(), LedgerEntryType.COLLECTION_REVERSAL)) {
            log.warn("Ledger entry COLLECTION_REVERSAL already exists for collection {}", c.getId());
            return;
        }
        save(c, LedgerEntryType.COLLECTION_REVERSAL,
                BORROWER_OUTSTANDING, COLLECTIONS_IN_TRANSIT,
                actorId, c.getId().toString(), reason);
        log.info("Ledger: COLLECTION_REVERSAL collectionId={} amount={}", c.getId(), c.getAmount());
    }

    /**
     * Raw debit/credit totals per account for an org -- not a signed "balance",
     * since this ledger only tracks collection events, not loan origination.
     */
    @Transactional(readOnly = true)
    public LedgerBalanceResponse getBalances(UUID orgId) {
        List<LedgerBalanceResponse.AccountBalance> accounts = List.of(
                accountBalance(orgId, BORROWER_OUTSTANDING),
                accountBalance(orgId, COLLECTIONS_IN_TRANSIT),
                accountBalance(orgId, BANK_ACCOUNT));
        return LedgerBalanceResponse.builder()
                .organizationId(orgId)
                .asOf(Instant.now())
                .accounts(accounts)
                .build();
    }

    private LedgerBalanceResponse.AccountBalance accountBalance(UUID orgId, String account) {
        return LedgerBalanceResponse.AccountBalance.builder()
                .account(account)
                .totalDebits(ledgerRepository.sumDebits(orgId, account))
                .totalCredits(ledgerRepository.sumCredits(orgId, account))
                .build();
    }

    private void save(Collection c, LedgerEntryType type,
                      String debit, String credit, UUID actorId,
                      String referenceId, String notes) {
        ledgerRepository.save(CollectionLedgerEntry.builder()
                .organizationId(c.getOrganizationId())
                .collectionId(c.getId())
                .allocationId(c.getAllocationId())
                .entryType(type)
                .debitAccount(debit)
                .creditAccount(credit)
                .amount(c.getAmount())
                .referenceId(referenceId)
                .actorId(actorId)
                .notes(notes)
                .build());
    }
}
