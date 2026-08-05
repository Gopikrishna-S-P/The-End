package com.recoverpro.server.service.impl;

import com.recoverpro.server.common.exception.BusinessException;
import com.recoverpro.server.dto.response.VisitImportResult;
import com.recoverpro.server.entity.Allocation;
import com.recoverpro.server.entity.User;
import com.recoverpro.server.entity.VisitLog;
import com.recoverpro.server.enums.*;
import com.recoverpro.server.repository.AllocationRepository;
import com.recoverpro.server.repository.UserRepository;
import com.recoverpro.server.repository.VisitLogRepository;
import com.recoverpro.server.service.VisitImportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class VisitImportServiceImpl implements VisitImportService {

    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");

    private static final List<DateTimeFormatter> DATE_FORMATS = List.of(
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("d/M/yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy")
    );

    private static final Map<String, String> HEADER_ALIASES = Map.of(
            "loan number",  "loanNumber",
            "loan no",      "loanNumber",
            "loan_number",  "loanNumber",
            "agent email",  "agentEmail",
            "agent_email",  "agentEmail",
            "email",        "agentEmail",
            "visit date",   "visitDate",
            "visit_date",   "visitDate",
            "date",         "visitDate"
    );

    private static final Map<String, String> HEADER_ALIASES_2 = Map.of(
            "disposition",      "disp",
            "disp",             "disp",
            "contactability",   "contactability",
            "contact person",   "contactPerson",
            "contact_person",   "contactPerson",
            "contact number",   "contactNumber",
            "contact_number",   "contactNumber",
            "amount collected", "amountCollected",
            "amount_collected", "amountCollected",
            "visit notes",      "visitNotes"
    );

    private final AllocationRepository allocationRepository;
    private final UserRepository userRepository;
    private final VisitLogRepository visitLogRepository;

    @Override
    @Transactional
    public VisitImportResult importFromExcel(MultipartFile file, UUID organizationId, UUID importedByUserId) {
        List<VisitImportResult.RowError> errors = new ArrayList<>();
        List<VisitLog> toSave = new ArrayList<>();

        try (Workbook workbook = openWorkbook(file)) {
            Sheet sheet = workbook.getSheetAt(0);
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                return VisitImportResult.builder().total(0).imported(0).failed(0).errors(List.of()).build();
            }

            Map<String, Integer> colIndex = buildColumnIndex(headerRow);
            int dataRows = 0;

            Set<String> loanNumbers = new HashSet<>();
            Set<String> agentEmails = new HashSet<>();
            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (isBlankRow(row)) continue;
                String loanNumber = cell(row, colIndex, "loanNumber").trim();
                String agentEmail = cell(row, colIndex, "agentEmail").trim();
                if (!loanNumber.isBlank()) loanNumbers.add(loanNumber);
                if (!agentEmail.isBlank()) agentEmails.add(agentEmail);
            }
            Map<String, Allocation> allocByLoanNumber = allocationRepository
                    .findByOrganizationIdAndLoanNumberIn(organizationId, new ArrayList<>(loanNumbers)).stream()
                    .collect(Collectors.toMap(Allocation::getLoanNumber, a -> a, (a, b) -> a));
            Map<String, User> agentByEmail = userRepository
                    .findByEmailIgnoreCaseIn(new ArrayList<>(agentEmails)).stream()
                    .collect(Collectors.toMap(u -> u.getEmail().toLowerCase(), u -> u, (a, b) -> a));

            for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (isBlankRow(row)) continue;
                dataRows++;

                String loanNumber   = cell(row, colIndex, "loanNumber");
                String agentEmail   = cell(row, colIndex, "agentEmail");
                String visitDateStr = cell(row, colIndex, "visitDate");

                if (loanNumber.isBlank()) {
                    errors.add(rowErr(r + 1, loanNumber, agentEmail, "Loan Number is required"));
                    continue;
                }
                if (agentEmail.isBlank()) {
                    errors.add(rowErr(r + 1, loanNumber, agentEmail, "Agent Email is required"));
                    continue;
                }
                if (visitDateStr.isBlank()) {
                    errors.add(rowErr(r + 1, loanNumber, agentEmail, "Visit Date is required"));
                    continue;
                }

                Optional<Allocation> allocOpt = Optional.ofNullable(allocByLoanNumber.get(loanNumber.trim()));
                if (allocOpt.isEmpty()) {
                    errors.add(rowErr(r + 1, loanNumber, agentEmail,
                            "Loan number '" + loanNumber + "' not found in this organization"));
                    continue;
                }
                Allocation alloc = allocOpt.get();

                Optional<User> agentOpt = Optional.ofNullable(agentByEmail.get(agentEmail.trim().toLowerCase()));
                if (agentOpt.isEmpty()) {
                    errors.add(rowErr(r + 1, loanNumber, agentEmail,
                            "No user found with email '" + agentEmail + "'"));
                    continue;
                }
                User agent = agentOpt.get();
                if (!organizationId.equals(agent.getOrganizationId())) {
                    errors.add(rowErr(r + 1, loanNumber, agentEmail,
                            "Agent '" + agentEmail + "' does not belong to this organization"));
                    continue;
                }

                LocalDate visitDate = parseDate(visitDateStr.trim());
                if (visitDate == null) {
                    errors.add(rowErr(r + 1, loanNumber, agentEmail,
                            "Cannot parse date '" + visitDateStr + "'. Use dd/MM/yyyy"));
                    continue;
                }

                Disp disp                     = parseEnum(Disp.class, cell(row, colIndex, "disp"));
                Contactability contactability  = parseEnum(Contactability.class, cell(row, colIndex, "contactability"));
                String contactPerson          = cell(row, colIndex, "contactPerson");
                String contactNumber          = cell(row, colIndex, "contactNumber");
                BigDecimal amountCollected    = parseBigDecimal(cell(row, colIndex, "amountCollected"));
                String visitNotes             = cell(row, colIndex, "visitNotes");

                // Convert visitDate to start-of-day Instant in IST
                Instant visitTimeInstant = visitDate.atStartOfDay(IST).toInstant();

                VisitLog visit = VisitLog.builder()
                        .allocationId(alloc.getId())
                        .loanNumber(alloc.getLoanNumber())
                        .agentId(agent.getId())
                        .organizationId(organizationId)
                        .visitDate(visitDate)
                        .visitTime(visitTimeInstant)
                        .contactability(contactability)
                        .contactPerson(contactPerson.isBlank() ? null : contactPerson)
                        .contactNumber(contactNumber.isBlank() ? null : contactNumber)
                        .disp(disp)
                        .amountCollected(amountCollected)
                        .visitNotes(visitNotes.isBlank() ? null : visitNotes)
                        .latitude(0.0)
                        .longitude(0.0)
                        .visitStatus(VisitStatus.GPS_UNAVAILABLE)
                        .mockLocationDetected(false)
                        .approvalStatus(ApprovalStatus.APPROVED)
                        .approvedBy(importedByUserId)
                        .approvedAt(Instant.now())
                        .approvalRemarks("Imported from historical data upload")
                        .createdBy(importedByUserId)
                        .updatedBy(importedByUserId)
                        .build();

                toSave.add(visit);
            }

            visitLogRepository.saveAll(toSave);
            log.info("Visit import: org={} total={} imported={} failed={}",
                    organizationId, dataRows, toSave.size(), errors.size());

            return VisitImportResult.builder()
                    .total(dataRows).imported(toSave.size()).failed(errors.size()).errors(errors)
                    .build();

        } catch (IOException e) {
            log.error("Failed to parse visit import file", e);
            throw new BusinessException("Could not read the uploaded file. Ensure it is a valid .xlsx or .xls file.");
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Workbook openWorkbook(MultipartFile file) throws IOException {
        String name = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        if (name.endsWith(".xls")) return new HSSFWorkbook(file.getInputStream());
        return new XSSFWorkbook(file.getInputStream());
    }

    private Map<String, Integer> buildColumnIndex(Row headerRow) {
        Map<String, Integer> index = new HashMap<>();
        for (int c = 0; c <= headerRow.getLastCellNum(); c++) {
            Cell cell = headerRow.getCell(c);
            if (cell == null) continue;
            String header    = cell.getStringCellValue().trim().toLowerCase();
            String canonical = HEADER_ALIASES.getOrDefault(header, HEADER_ALIASES_2.get(header));
            if (canonical != null) index.put(canonical, c);
        }
        return index;
    }

    private String cell(Row row, Map<String, Integer> idx, String key) {
        Integer col = idx.get(key);
        if (col == null || row == null) return "";
        Cell cell = row.getCell(col);
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    yield DateTimeFormatter.ofPattern("dd/MM/yyyy").format(
                            cell.getLocalDateTimeCellValue().toLocalDate());
                }
                double d = cell.getNumericCellValue();
                yield d == Math.floor(d) ? String.valueOf((long) d) : String.valueOf(d);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default      -> "";
        };
    }

    private boolean isBlankRow(Row row) {
        if (row == null) return true;
        for (int c = row.getFirstCellNum(); c < row.getLastCellNum(); c++) {
            Cell cell = row.getCell(c);
            if (cell != null && cell.getCellType() != CellType.BLANK
                    && !cell.toString().trim().isEmpty()) return false;
        }
        return true;
    }

    private LocalDate parseDate(String s) {
        for (DateTimeFormatter fmt : DATE_FORMATS) {
            try { return LocalDate.parse(s, fmt); } catch (DateTimeParseException ignored) {}
        }
        return null;
    }

    private <E extends Enum<E>> E parseEnum(Class<E> clazz, String value) {
        if (value == null || value.isBlank()) return null;
        try { return Enum.valueOf(clazz, value.trim().toUpperCase().replace(' ', '_')); }
        catch (IllegalArgumentException e) { return null; }
    }

    private BigDecimal parseBigDecimal(String s) {
        if (s == null || s.isBlank()) return null;
        try { return new BigDecimal(s.replaceAll("[^0-9.]", "")); }
        catch (NumberFormatException e) { return null; }
    }

    private VisitImportResult.RowError rowErr(int row, String loan, String email, String reason) {
        return VisitImportResult.RowError.builder()
                .row(row).loanNumber(loan).agentEmail(email).reason(reason).build();
    }
}
