package com.recoverpro.server.service.importer;

import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.UploadType;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.service.BorrowerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The original upload behaviour, unchanged: a row is an allocation, upserted by loan number.
 * Extracted from FileProcessingServiceImpl so the pipeline can dispatch by upload type.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AllocationImportProcessor implements EntityImportProcessor<Allocation> {

    private static final String[] LOAN_NUMBER = {"loan_number", "loan number", "loannumber", "loan_no"};
    private static final String[] BORROWER_NAME = {"borrower_name", "borrower name", "borrowername", "customer name", "name"};
    private static final String[] CKYC_ID = {"ckyc_id", "ckyc", "ckycid", "ckyc number", "ckyc_number"};
    private static final String[] PHONE = {"phone", "phone_number", "mobile", "mobile_number", "contact_number"};
    private static final String[] EMAIL = {"email", "email_address"};

    private final AllocationRepository allocationRepository;
    private final BorrowerService borrowerService;
    private final com.recoverpro.server.service.AllocationSearchIndexService allocationSearchIndexService;

    @Override
    public UploadType supportedType() {
        return UploadType.ALLOCATION;
    }

    /**
     * All optional on purpose. The allocation book is the schema-driven, free-form upload -
     * orgs declare their own required columns via ColumnSchema, and any unrecognised column is
     * kept as dynamic data rather than rejected. Marking anything required here would start
     * failing files that upload cleanly today. These specs exist so the template is downloadable.
     */
    @Override
    public List<ImportFieldSpec> fieldSpecs() {
        return List.of(
                ImportFieldSpec.optional("loan_number", "Loan number", "LN-000123",
                        "loan number", "loannumber", "loan_no"),
                ImportFieldSpec.optional("borrower_name", "Borrower name", "Jane Doe",
                        "borrower name", "borrowername", "customer name", "name"),
                ImportFieldSpec.optional("ckyc_id", "CKYC ID", "",
                        "ckyc", "ckycid", "ckyc number", "ckyc_number"),
                ImportFieldSpec.optional("phone", "Phone", "9876543210",
                        "phone_number", "mobile", "mobile_number", "contact_number"),
                ImportFieldSpec.optional("email", "Email", "", "email_address"),
                ImportFieldSpec.optional("total_due", "Total due", "50000",
                        "totaldue", "total amount", "total_amount"),
                ImportFieldSpec.optional("outstanding", "Outstanding", "40000",
                        "outstanding_amount", "outstandingamount", "balance",
                        "outstanding_balance", "current_balance"),
                ImportFieldSpec.optional("npa", "NPA flag", "no",
                        "npa_flagged", "npaflagged", "is_npa", "isnpa"));
    }

    /** Used for upsert, not parent resolution - an allocation row creates its own loan. */
    @Override
    public boolean requiresAllocationLookup() {
        return true;
    }

    @Override
    public boolean requiresAgentLookup() {
        return false;
    }

    @Override
    public Allocation mapRow(Map<String, String> row, int rowNumber, ImportContext context) {
        String loanNumber = ImportValues.find(row, LOAN_NUMBER);
        Allocation existing = (loanNumber != null && !loanNumber.isBlank())
                ? context.getAllocationsByLoanNumber().get(loanNumber)
                : null;

        return existing != null
                ? updateFromRow(existing, row, context)
                : buildFromRow(row, rowNumber, context);
    }

    @Override
    public void persistBatch(List<Allocation> batch, ImportContext context) {
        // Allocation.version is pre-set to 0L via @Builder.Default, so Spring Data's isNew()
        // check (which treats a non-null @Version field as "existing") routes every new
        // allocation through em.merge() instead of em.persist() -- merge() returns a *different*
        // managed instance and leaves the original object's generated id null forever. Reindexing
        // must use saveAll's returned list, not the original batch reference.
        List<Allocation> saved = allocationRepository.saveAllAndFlush(batch);
        allocationSearchIndexService.reindexAll(saved);
    }

    private Allocation buildFromRow(Map<String, String> row, int rowNumber, ImportContext context) {
        Map<String, Object> dynamicData = extraData(row);

        String loanNumber = ImportValues.find(row, LOAN_NUMBER);
        String borrowerName = ImportValues.find(row, BORROWER_NAME);
        UUID borrowerId = resolveBorrowerId(row, context.getOrganization(), borrowerName);

        BigDecimal totalDue = ImportValues.parseDecimal(
                ImportValues.find(row, "total_due", "totaldue", "total amount", "total_amount"));
        BigDecimal outstanding = ImportValues.parseDecimal(ImportValues.find(row, "outstanding",
                "outstanding_amount", "outstandingamount", "balance", "outstanding_balance", "current_balance"));
        Boolean npa = ImportValues.parseBoolean(
                ImportValues.find(row, "npa", "npa_flagged", "npaflagged", "is_npa", "isnpa"));

        return Allocation.builder()
                .fileUpload(context.getFileUpload())
                .organization(context.getOrganization())
                .loanNumber(loanNumber != null ? loanNumber : "UNKNOWN")
                .borrowerName(borrowerName != null ? borrowerName : "UNKNOWN")
                .borrowerId(borrowerId)
                .status(AllocationStatus.UNASSIGNED)
                .dynamicData(dynamicData)
                .rowNumber(rowNumber)
                .totalDue(totalDue)
                .outstandingAmount(outstanding)
                .npaFlagged(npa != null ? npa : Boolean.FALSE)
                .build();
    }

    private Allocation updateFromRow(Allocation existing, Map<String, String> row, ImportContext context) {
        Map<String, Object> dynamicData = new LinkedHashMap<>();
        if (existing.getDynamicData() != null) dynamicData.putAll(existing.getDynamicData());
        dynamicData.putAll(extraData(row));
        existing.setDynamicData(dynamicData);
        existing.setFileUpload(context.getFileUpload());

        String borrowerName = ImportValues.find(row, BORROWER_NAME);
        if (borrowerName != null && !borrowerName.isBlank()) existing.setBorrowerName(borrowerName);

        UUID borrowerId = resolveBorrowerId(row, context.getOrganization(), borrowerName);
        if (borrowerId != null) existing.setBorrowerId(borrowerId);

        BigDecimal totalDue = ImportValues.parseDecimal(
                ImportValues.find(row, "total_due", "totaldue", "total amount", "total_amount"));
        if (totalDue != null) existing.setTotalDue(totalDue);

        BigDecimal outstanding = ImportValues.parseDecimal(ImportValues.find(row, "outstanding",
                "outstanding_amount", "outstandingamount", "balance", "outstanding_balance", "current_balance"));
        if (outstanding != null) existing.setOutstandingAmount(outstanding);

        Boolean npa = ImportValues.parseBoolean(
                ImportValues.find(row, "npa", "npa_flagged", "npaflagged", "is_npa", "isnpa"));
        if (npa != null) existing.setNpaFlagged(npa);

        return existing;
    }

    /**
     * Resolves (or creates, via BorrowerService) the Borrower a row belongs to, so the same
     * person uploaded across multiple files/months resolves to one Borrower row - without this,
     * every DPDP feature (consent, erasure, nominee) is unreachable for real data
     * (SYSTEM-PLAN SP4). Returns null when the row carries no stable identifier.
     */
    private UUID resolveBorrowerId(Map<String, String> row, Organization organization, String borrowerName) {
        String ckycId = ImportValues.find(row, CKYC_ID);
        String phone = ImportValues.find(row, PHONE);
        String email = ImportValues.find(row, EMAIL);
        return borrowerService.resolveOrCreateBorrower(organization.getId(), ckycId, phone, email, borrowerName);
    }

    /**
     * Everything in the row except the columns this processor already stores in a dedicated
     * (and, for borrower_name/ckyc_id/phone/email, encrypted) field -- dynamic_data must never
     * carry a second, plaintext copy of a field that already has an encrypted home.
     */
    private Map<String, Object> extraData(Map<String, String> row) {
        return ImportValues.stripDedicatedFields(row, fieldSpecs());
    }
}
