package com.recoverpro.server.service.export;

import com.recoverpro.server.dto.response.*;
import com.recoverpro.server.enums.ReportType;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.*;

import java.util.List;

import static com.recoverpro.server.service.export.ReportFormatUtils.*;

/** Builds the branded Excel workbook for each report type (SYSTEM-PLAN SP40 — split out of the
 * 666-line ExportServiceImpl). Stateless; safe to share across requests. */
public class ExcelReportBuilder {

    // ── Brand colours ────────────────────────────────────────────────────────
    private static final byte[] COL_NAVY   = hex("#1F3864");
    private static final byte[] COL_BLUE   = hex("#2D5F8A");
    private static final byte[] COL_LBLUE  = hex("#DCE6F1");
    private static final byte[] COL_STRIPE = hex("#F5F9FF");
    private static final byte[] COL_WHITE  = hex("#FFFFFF");
    private static final byte[] COL_TOTALS = hex("#BDD7EE");

    public void build(XSSFWorkbook wb, ReportType type, Object reportData) {
        switch (type) {
            case AGENT_PERFORMANCE         -> buildAgentPerformanceExcel(wb, (TeamPerformanceResponse) reportData);
            case DAILY_VISIT_COMPLETION,
                 MONTHLY_VISIT_COMPLETION  -> buildVisitCompletionExcel(wb, (DailyVisitCompletionResponse) reportData, type);
            case COLLECTION_EFFICIENCY     -> buildCollectionEfficiencyExcel(wb, (CollectionEfficiencyResponse) reportData);
            case MONTHLY_LOAN_BOOK_SNAPSHOT -> buildLoanBookExcel(wb, (MonthlyLoanBookResponse) reportData);
            default                        -> buildGenericExcel(wb, type.name());
        }
    }

    private void buildAgentPerformanceExcel(XSSFWorkbook wb, TeamPerformanceResponse d) {
        XSSFSheet sheet = wb.createSheet("Agent Performance");
        StyleKit sk = new StyleKit(wb);
        int row = 0;
        row = writeTitleBlock(sheet, sk, "AGENT PERFORMANCE REPORT",
                "Organisation: " + d.getOrganizationId(),
                "Period: " + fmt(d.getFromDate()) + "  –  " + fmt(d.getToDate()), row);
        row++;
        row = writeSectionHeader(sheet, sk, "SUMMARY", row, 9);
        row = writeKpiRow(sheet, sk, row,
                kv("Total Agents",       str(d.getTotalAgents())),
                kv("Total Assigned",     str(d.getTotalAssigned())),
                kv("Total Visited",      str(d.getTotalVisited())),
                kv("Total Collections",  str(d.getTotalCollected())),
                kv("Amount Collected",   cur(d.getTotalAmountCollected())),
                kv("Amount Outstanding", cur(d.getTotalAmountOutstanding())),
                kv("Avg Visit Rate",     pct(d.getAvgVisitCompletionRate())),
                kv("Avg Collection Eff", pct(d.getAvgCollectionEfficiency())),
                kv("Overall Score",      pct(d.getOverallEfficiencyScore())));
        row++;
        row = writeSectionHeader(sheet, sk, "AGENT BREAKDOWN", row, 9);
        row = writeTableHeader(sheet, sk, row, "#", "Agent ID", "Assigned", "Visited",
                "Visit Rate %", "Collections", "Collected (₹)", "Outstanding (₹)", "Eff. Score");
        List<AgentPerformanceResponse> agents = d.getAgentBreakdown();
        for (int i = 0; i < agents.size(); i++) {
            AgentPerformanceResponse a = agents.get(i);
            row = writeDataRow(sheet, sk, row, i % 2 == 1,
                    str(i + 1), shorten(a.getAgentId()),
                    str(a.getTotalAssigned()), str(a.getTotalVisited()),
                    pct(a.getVisitCompletionRate()), str(a.getTotalCollected()),
                    cur(a.getAmountCollected()), cur(a.getAmountOutstanding()),
                    pct(a.getEfficiencyScore()));
        }
        writeTotalsRow(sheet, sk, row, 9, "", "TOTAL",
                str(d.getTotalAssigned()), str(d.getTotalVisited()), pct(d.getAvgVisitCompletionRate()),
                str(d.getTotalCollected()), cur(d.getTotalAmountCollected()),
                cur(d.getTotalAmountOutstanding()), pct(d.getOverallEfficiencyScore()));
        autosize(sheet, 9);
    }

    private void buildVisitCompletionExcel(XSSFWorkbook wb, DailyVisitCompletionResponse d, ReportType type) {
        XSSFSheet sheet = wb.createSheet("Visit Completion");
        StyleKit sk = new StyleKit(wb);
        int row = 0;
        row = writeTitleBlock(sheet, sk, "VISIT COMPLETION REPORT",
                "Organisation: " + d.getOrganizationId(),
                "Period: " + fmt(d.getReportDate()) + " onwards", row);
        row++;
        row = writeSectionHeader(sheet, sk, "SUMMARY", row, 6);
        row = writeKpiRow(sheet, sk, row,
                kv("Agents Working",  str(d.getTotalAgentsWorking())),
                kv("Total Assigned",  str(d.getTotalAssigned())),
                kv("Total Visited",   str(d.getTotalVisited())),
                kv("Total Pending",   str(d.getTotalPending())),
                kv("Completion Rate", pct(d.getOverallCompletionRate())));
        row++;
        row = writeSectionHeader(sheet, sk, "AGENT BREAKDOWN", row, 6);
        row = writeTableHeader(sheet, sk, row, "#", "Agent ID", "Assigned", "Visited", "Pending", "Completion Rate %");
        List<DailyVisitCompletionResponse.AgentDailyRow> rows = d.getAgentRows();
        for (int i = 0; i < rows.size(); i++) {
            DailyVisitCompletionResponse.AgentDailyRow a = rows.get(i);
            row = writeDataRow(sheet, sk, row, i % 2 == 1,
                    str(i + 1), shorten(a.getAgentId()),
                    str(a.getAssigned()), str(a.getVisited()),
                    str(a.getPending()), pct(a.getCompletionRate()));
        }
        writeTotalsRow(sheet, sk, row, 6, "", "TOTAL",
                str(d.getTotalAssigned()), str(d.getTotalVisited()),
                str(d.getTotalPending()), pct(d.getOverallCompletionRate()));
        autosize(sheet, 6);
    }

    private void buildCollectionEfficiencyExcel(XSSFWorkbook wb, CollectionEfficiencyResponse d) {
        XSSFSheet sheet = wb.createSheet("Collection Efficiency");
        StyleKit sk = new StyleKit(wb);
        int row = 0;
        row = writeTitleBlock(sheet, sk, "COLLECTION EFFICIENCY REPORT",
                "Organisation: " + d.getOrganizationId(),
                "Period: " + fmt(d.getFromDate()) + "  –  " + fmt(d.getToDate()), row);
        row++;
        row = writeSectionHeader(sheet, sk, "SUMMARY", row, 6);
        row = writeKpiRow(sheet, sk, row,
                kv("Total Outstanding", cur(d.getTotalOutstanding())),
                kv("Total Collected",   cur(d.getTotalCollected())),
                kv("Collection Eff. %", pct(d.getCollectionEfficiencyPct())),
                kv("Recovery Rate %",   pct(d.getRecoveryRatePct())));
        row++;
        row = writeSectionHeader(sheet, sk, "AGENT RANKING", row, 6);
        row = writeTableHeader(sheet, sk, row, "Rank", "Agent ID", "Outstanding (₹)", "Collected (₹)", "Collection Eff. %", "Recovery Rate %");
        List<CollectionEfficiencyResponse.AgentEfficiencyRow> aList = d.getAgentBreakdown();
        for (int i = 0; i < aList.size(); i++) {
            CollectionEfficiencyResponse.AgentEfficiencyRow a = aList.get(i);
            row = writeDataRow(sheet, sk, row, i % 2 == 1,
                    str(a.getRank()), shorten(a.getAgentId()),
                    cur(a.getAmountOutstanding()), cur(a.getAmountCollected()),
                    pct(a.getEfficiencyPct()), pct(a.getRecoveryRatePct()));
        }
        writeTotalsRow(sheet, sk, row, 6, "", "TOTAL",
                cur(d.getTotalOutstanding()), cur(d.getTotalCollected()),
                pct(d.getCollectionEfficiencyPct()), pct(d.getRecoveryRatePct()));
        autosize(sheet, 6);
    }

    private void buildLoanBookExcel(XSSFWorkbook wb, MonthlyLoanBookResponse d) {
        XSSFSheet sheet = wb.createSheet("Loan Book");
        StyleKit sk = new StyleKit(wb);
        int row = 0;
        String period = d.getSnapshotMonth() != null ? d.getSnapshotMonth().format(MON_FMT) : "N/A";
        row = writeTitleBlock(sheet, sk, "MONTHLY LOAN BOOK SNAPSHOT",
                "Organisation: " + d.getOrganizationId(),
                "Snapshot Month: " + period, row);
        row++;
        row = writeSectionHeader(sheet, sk, "PORTFOLIO SUMMARY", row, 2);
        String[][] metrics = {
                {"Total Loans",                 str(d.getTotalLoans())},
                {"Total Outstanding Amount",     cur(d.getTotalOutstandingAmount())},
                {"Total Collected Amount",        cur(d.getTotalCollectedAmount())},
                {"Total Assigned Loans",          str(d.getTotalAssignedLoans())},
                {"Total Unassigned Loans",        str(d.getTotalUnassignedLoans())},
                {"Collection Efficiency",         pct(d.getCollectionEfficiencyPct())},
                {"Recovery Rate",                 pct(d.getRecoveryRatePct())},
                {"High-Risk Cases",               str(d.getTotalNpaCount())},
                {"High-Risk Outstanding (₹)",     cur(d.getTotalNpaAmount())},
        };
        for (String[] m : metrics) {
            XSSFRow r = sheet.createRow(row++);
            XSSFCell label = r.createCell(0); label.setCellValue(m[0]); label.setCellStyle(sk.kpiLabel());
            XSSFCell value = r.createCell(1); value.setCellValue(m[1]); value.setCellStyle(sk.kpiValue());
        }
        autosize(sheet, 2);
    }

    private void buildGenericExcel(XSSFWorkbook wb, String title) {
        XSSFSheet sheet = wb.createSheet("Report");
        StyleKit sk = new StyleKit(wb);
        writeTitleBlock(sheet, sk, title.replace("_", " "), "Generated: " + now(), "", 0);
    }

    // ── Excel helpers ────────────────────────────────────────────────────────

    private int writeTitleBlock(XSSFSheet sheet, StyleKit sk, String title, String sub1, String sub2, int startRow) {
        XSSFRow titleRow = sheet.createRow(startRow++);
        titleRow.setHeightInPoints(28);
        XSSFCell tc = titleRow.createCell(0); tc.setCellValue(title); tc.setCellStyle(sk.title());

        XSSFRow s1 = sheet.createRow(startRow++);
        s1.setHeightInPoints(18);
        XSSFCell s1c = s1.createCell(0); s1c.setCellValue(sub1); s1c.setCellStyle(sk.subtitle());

        if (sub2 != null && !sub2.isBlank()) {
            XSSFRow s2 = sheet.createRow(startRow++);
            s2.setHeightInPoints(16);
            XSSFCell s2c = s2.createCell(0); s2c.setCellValue(sub2); s2c.setCellStyle(sk.subtitle());
        }

        XSSFRow tsRow = sheet.createRow(startRow++);
        tsRow.setHeightInPoints(14);
        XSSFCell tsc = tsRow.createCell(0); tsc.setCellValue("Generated: " + now()); tsc.setCellStyle(sk.meta());
        return startRow;
    }

    private int writeSectionHeader(XSSFSheet sheet, StyleKit sk, String label, int row, int cols) {
        sheet.createRow(row++);
        XSSFRow hr = sheet.createRow(row++);
        hr.setHeightInPoints(18);
        XSSFCell cell = hr.createCell(0); cell.setCellValue(label); cell.setCellStyle(sk.sectionHeader());
        if (cols > 1) sheet.addMergedRegion(new CellRangeAddress(row - 1, row - 1, 0, cols - 1));
        return row;
    }

    private int writeKpiRow(XSSFSheet sheet, StyleKit sk, int row, String[]... kvPairs) {
        XSSFRow labelRow = sheet.createRow(row++); labelRow.setHeightInPoints(16);
        XSSFRow valueRow = sheet.createRow(row++); valueRow.setHeightInPoints(20);
        for (int i = 0; i < kvPairs.length; i++) {
            XSSFCell lc = labelRow.createCell(i); lc.setCellValue(kvPairs[i][0]); lc.setCellStyle(sk.kpiLabel());
            XSSFCell vc = valueRow.createCell(i); vc.setCellValue(kvPairs[i][1]); vc.setCellStyle(sk.kpiValue());
        }
        return row;
    }

    private int writeTableHeader(XSSFSheet sheet, StyleKit sk, int row, String... headers) {
        XSSFRow hr = sheet.createRow(row++); hr.setHeightInPoints(20);
        for (int i = 0; i < headers.length; i++) {
            XSSFCell cell = hr.createCell(i); cell.setCellValue(headers[i]); cell.setCellStyle(sk.tableHeader());
        }
        return row;
    }

    private int writeDataRow(XSSFSheet sheet, StyleKit sk, int row, boolean stripe, String... values) {
        XSSFRow dr = sheet.createRow(row++); dr.setHeightInPoints(16);
        CellStyle style = stripe ? sk.dataStripe() : sk.data();
        for (int i = 0; i < values.length; i++) {
            XSSFCell cell = dr.createCell(i);
            cell.setCellValue(values[i] != null ? values[i] : "");
            cell.setCellStyle(style);
        }
        return row;
    }

    private void writeTotalsRow(XSSFSheet sheet, StyleKit sk, int row, int cols, String... values) {
        XSSFRow tr = sheet.createRow(row); tr.setHeightInPoints(18);
        for (int i = 0; i < values.length; i++) {
            XSSFCell cell = tr.createCell(i);
            cell.setCellValue(values[i] != null ? values[i] : "");
            cell.setCellStyle(sk.totals());
        }
    }

    private void autosize(XSSFSheet sheet, int cols) {
        for (int i = 0; i < cols; i++) {
            sheet.autoSizeColumn(i);
            int w = sheet.getColumnWidth(i);
            sheet.setColumnWidth(i, Math.min(w + 512, 12000));
        }
    }

    // ── StyleKit ─────────────────────────────────────────────────────────────

    private static class StyleKit {
        private final XSSFWorkbook wb;
        StyleKit(XSSFWorkbook wb) { this.wb = wb; }

        XSSFCellStyle title() {
            XSSFCellStyle s = base(); s.setFont(boldFont(14, COL_WHITE));
            s.setFillForegroundColor(xColor(COL_NAVY)); fill(s);
            s.setAlignment(HorizontalAlignment.LEFT); return s;
        }
        XSSFCellStyle subtitle() {
            XSSFCellStyle s = base(); s.setFont(boldFont(10, COL_BLUE));
            s.setFillForegroundColor(xColor(COL_LBLUE)); fill(s); return s;
        }
        XSSFCellStyle meta() { XSSFCellStyle s = base(); s.setFont(italicFont(9)); return s; }
        XSSFCellStyle sectionHeader() {
            XSSFCellStyle s = base(); s.setFont(boldFont(10, COL_WHITE));
            s.setFillForegroundColor(xColor(COL_BLUE)); fill(s); return s;
        }
        XSSFCellStyle kpiLabel() {
            XSSFCellStyle s = base(); s.setFont(boldFont(9, COL_BLUE));
            s.setFillForegroundColor(xColor(COL_LBLUE)); fill(s); allBorders(s); return s;
        }
        XSSFCellStyle kpiValue() {
            XSSFCellStyle s = base(); s.setFont(boldFont(11, COL_NAVY));
            s.setFillForegroundColor(xColor(COL_STRIPE)); fill(s); allBorders(s); return s;
        }
        XSSFCellStyle tableHeader() {
            XSSFCellStyle s = base(); s.setFont(boldFont(9, COL_WHITE));
            s.setFillForegroundColor(xColor(COL_BLUE)); fill(s); allBorders(s);
            s.setAlignment(HorizontalAlignment.CENTER); return s;
        }
        XSSFCellStyle data() {
            XSSFCellStyle s = base(); s.setFont(normalFont(9)); allBorders(s); return s;
        }
        XSSFCellStyle dataStripe() {
            XSSFCellStyle s = base(); s.setFont(normalFont(9));
            s.setFillForegroundColor(xColor(COL_STRIPE)); fill(s); allBorders(s); return s;
        }
        XSSFCellStyle totals() {
            XSSFCellStyle s = base(); s.setFont(boldFont(9, COL_NAVY));
            s.setFillForegroundColor(xColor(COL_TOTALS)); fill(s); allBorders(s); return s;
        }

        private XSSFCellStyle base() { return wb.createCellStyle(); }
        private void fill(XSSFCellStyle s) { s.setFillPattern(FillPatternType.SOLID_FOREGROUND); }
        private void allBorders(XSSFCellStyle s) {
            s.setBorderTop(BorderStyle.THIN); s.setBorderBottom(BorderStyle.THIN);
            s.setBorderLeft(BorderStyle.THIN); s.setBorderRight(BorderStyle.THIN);
        }
        private XSSFColor xColor(byte[] rgb) { return new XSSFColor(rgb, null); }
        private XSSFFont boldFont(int size, byte[] rgb) {
            XSSFFont f = wb.createFont(); f.setBold(true); f.setFontHeightInPoints((short) size);
            if (rgb != null) f.setColor(xColor(rgb)); return f;
        }
        private XSSFFont normalFont(int size) {
            XSSFFont f = wb.createFont(); f.setFontHeightInPoints((short) size); return f;
        }
        private XSSFFont italicFont(int size) {
            XSSFFont f = wb.createFont(); f.setItalic(true); f.setFontHeightInPoints((short) size); return f;
        }
    }
}
