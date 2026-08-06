package com.recoverpro.server.service.importer;

import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.Borrower;
import com.recoverpro.server.entity.Organization;
import com.recoverpro.server.enums.AllocationStatus;
import com.recoverpro.server.enums.UploadType;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.BorrowerRepository;
import com.recoverpro.server.security.encryption.LookupHashService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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

    private final AllocationRepository allocationRepository;
    private final BorrowerRepository borrowerRepository;
    private final LookupHashService lookupHashService;

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
        allocationRepository.saveAll(batch);
    }

    private Allocation buildFromRow(Map<String, String> row, int rowNumber, ImportContext context) {
        Map<String, Object> dynamicData = new LinkedHashMap<>(row);

        String loanNumber = ImportValues.find(row, LOAN_NUMBER);
        String borrowerName = ImportValues.find(row, BORROWER_NAME);
        UUID borrowerId = resolveOrCreateBorrowerId(row, context.getOrganization(), borrowerName);

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
        row.forEach(dynamicData::put);
        existing.setDynamicData(dynamicData);
        existing.setFileUpload(context.getFileUpload());

        String borrowerName = ImportValues.find(row, BORROWER_NAME);
        if (borrowerName != null && !borrowerName.isBlank()) existing.setBorrowerName(borrowerName);

        UUID borrowerId = resolveOrCreateBorrowerId(row, context.getOrganization(), borrowerName);
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
     * Upserts a Borrower keyed by CKYC id (preferred) or phone number, so the same person
     * uploaded across multiple files/months resolves to one Borrower row - without this, every
     * DPDP feature (consent, erasure, nominee) is unreachable for real data (SYSTEM-PLAN SP4).
     * Returns null when the row carries neither identifier, since there's nothing safe to dedupe on.
     */
    private UUID resolveOrCreateBorrowerId(Map<String, String> row, Organization organization, String borrowerName) {
        String ckycId = ImportValues.find(row, "ckyc_id", "ckyc", "ckycid", "ckyc number", "ckyc_number");
        String phone = ImportValues.find(row, "phone", "phone_number", "mobile", "mobile_number", "contact_number");
        String email = ImportValues.find(row, "email", "email_address");

        if (ckycId != null && !ckycId.isBlank()) {
            Optional<Borrower> byCkyc = borrowerRepository
                    .findByOrganizationIdAndCkycIdLookupHash(organization.getId(), lookupHashService.hash(ckycId));
            if (byCkyc.isPresent()) return byCkyc.get().getId();
        }

        String phoneHash = (phone != null && !phone.isBlank()) ? lookupHashService.hashPhone(phone) : null;
        if (phoneHash != null) {
            Optional<Borrower> byPhone = borrowerRepository
                    .findByOrganizationIdAndPhoneLookupHash(organization.getId(), phoneHash);
            if (byPhone.isPresent()) return byPhone.get().getId();
        }

        if ((ckycId == null || ckycId.isBlank()) && phoneHash == null) {
            // No stable identifier on this row - creating a Borrower here would risk an
            // unmatchable duplicate on the next upload, so leave the allocation unlinked.
            return null;
        }

        String emailHash = (email != null && !email.isBlank()) ? lookupHashService.hash(email) : null;
        Borrower created = Borrower.builder()
                .organizationId(organization.getId())
                .ckycId((ckycId != null && !ckycId.isBlank()) ? ckycId : null)
                .firstName(borrowerName != null && !borrowerName.isBlank() ? borrowerName : "UNKNOWN")
                .phone(phone)
                .email(email)
                .phoneLookupHash(phoneHash)
                .emailLookupHash(emailHash)
                .build();
        try {
            return borrowerRepository.save(created).getId();
        } catch (DataIntegrityViolationException e) {
            // Lost a race with a concurrent upload/row creating the same borrower - re-resolve.
            if (ckycId != null && !ckycId.isBlank()) {
                return borrowerRepository
                        .findByOrganizationIdAndCkycIdLookupHash(organization.getId(), lookupHashService.hash(ckycId))
                        .map(Borrower::getId).orElse(null);
            }
            return borrowerRepository.findByOrganizationIdAndPhoneLookupHash(organization.getId(), phoneHash)
                    .map(Borrower::getId).orElse(null);
        }
    }
}
