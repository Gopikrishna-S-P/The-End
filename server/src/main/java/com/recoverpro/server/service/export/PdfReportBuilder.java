package com.recoverpro.server.service.export;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.*;
import com.recoverpro.server.dto.response.*;
import com.recoverpro.server.enums.ReportType;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.util.List;

import static com.recoverpro.server.service.export.ReportFormatUtils.*;

/** Builds the branded PDF (OpenPDF) for each report type (SYSTEM-PLAN SP40 — split out of the
 * 666-line ExportServiceImpl). Stateless entry point; each call constructs its own document. */
public class PdfReportBuilder {

    public byte[] build(ReportType type, Object reportData) throws DocumentException {
        return switch (type) {
            case AGENT_PERFORMANCE          -> buildAgentPerformancePdf((TeamPerformanceResponse) reportData);
            case DAILY_VISIT_COMPLETION,
                 MONTHLY_VISIT_COMPLETION   -> buildVisitCompletionPdf((DailyVisitCompletionResponse) reportData, type);
            case COLLECTION_EFFICIENCY      -> buildCollectionEfficiencyPdf((CollectionEfficiencyResponse) reportData);
            case MONTHLY_LOAN_BOOK_SNAPSHOT -> buildLoanBookPdf((MonthlyLoanBookResponse) reportData);
            default                         -> buildGenericPdf(type.name());
        };
    }

    private byte[] buildAgentPerformancePdf(TeamPerformanceResponse d) throws DocumentException {
        DocBuilder doc = new DocBuilder("Agent Performance Report",
                "Period: " + fmt(d.getFromDate()) + " – " + fmt(d.getToDate()));
        doc.summaryTable(new String[][]{
                {"Total Agents",       str(d.getTotalAgents())},
                {"Total Assigned",     str(d.getTotalAssigned())},
                {"Total Visited",      str(d.getTotalVisited())},
                {"Total Collections",  str(d.getTotalCollected())},
                {"Amount Collected",   cur(d.getTotalAmountCollected())},
                {"Amount Outstanding", cur(d.getTotalAmountOutstanding())},
                {"Avg Visit Rate",     pct(d.getAvgVisitCompletionRate())},
                {"Avg Collection Eff", pct(d.getAvgCollectionEfficiency())},
                {"Overall Score",      pct(d.getOverallEfficiencyScore())},
        });
        doc.detailTable(
                new String[]{"#", "Agent ID", "Assigned", "Visited", "Visit %",
                             "Collections", "Collected (₹)", "Outstanding (₹)", "Score"},
                d.getAgentBreakdown().stream().map(a -> new String[]{
                        str(d.getAgentBreakdown().indexOf(a) + 1), shorten(a.getAgentId()),
                        str(a.getTotalAssigned()), str(a.getTotalVisited()),
                        pct(a.getVisitCompletionRate()), str(a.getTotalCollected()),
                        cur(a.getAmountCollected()), cur(a.getAmountOutstanding()),
                        pct(a.getEfficiencyScore())
                }).toList());
        return doc.build();
    }

    private byte[] buildVisitCompletionPdf(DailyVisitCompletionResponse d, ReportType type) throws DocumentException {
        String title = type == ReportType.MONTHLY_VISIT_COMPLETION
                ? "Monthly Visit Completion" : "Daily Visit Completion";
        DocBuilder doc = new DocBuilder(title + " Report", "Date: " + fmt(d.getReportDate()));
        doc.summaryTable(new String[][]{
                {"Agents Working", str(d.getTotalAgentsWorking())},
                {"Total Assigned", str(d.getTotalAssigned())},
                {"Total Visited",  str(d.getTotalVisited())},
                {"Total Pending",  str(d.getTotalPending())},
                {"Completion Rate", pct(d.getOverallCompletionRate())},
        });
        doc.detailTable(
                new String[]{"#", "Agent ID", "Assigned", "Visited", "Pending", "Completion %"},
                d.getAgentRows().stream().map(a -> new String[]{
                        str(d.getAgentRows().indexOf(a) + 1), shorten(a.getAgentId()),
                        str(a.getAssigned()), str(a.getVisited()),
                        str(a.getPending()), pct(a.getCompletionRate())
                }).toList());
        return doc.build();
    }

    private byte[] buildCollectionEfficiencyPdf(CollectionEfficiencyResponse d) throws DocumentException {
        DocBuilder doc = new DocBuilder("Collection Efficiency Report",
                "Period: " + fmt(d.getFromDate()) + " – " + fmt(d.getToDate()));
        doc.summaryTable(new String[][]{
                {"Total Outstanding",  cur(d.getTotalOutstanding())},
                {"Total Collected",    cur(d.getTotalCollected())},
                {"Collection Eff. %",  pct(d.getCollectionEfficiencyPct())},
                {"Recovery Rate %",    pct(d.getRecoveryRatePct())},
        });
        doc.detailTable(
                new String[]{"Rank", "Agent ID", "Outstanding (₹)", "Collected (₹)", "Efficiency %", "Recovery %"},
                d.getAgentBreakdown().stream().map(a -> new String[]{
                        str(a.getRank()), shorten(a.getAgentId()),
                        cur(a.getAmountOutstanding()), cur(a.getAmountCollected()),
                        pct(a.getEfficiencyPct()), pct(a.getRecoveryRatePct())
                }).toList());
        return doc.build();
    }

    private byte[] buildLoanBookPdf(MonthlyLoanBookResponse d) throws DocumentException {
        String period = d.getSnapshotMonth() != null ? d.getSnapshotMonth().format(MON_FMT) : "N/A";
        DocBuilder doc = new DocBuilder("Monthly Loan Book Snapshot", "Period: " + period);
        doc.summaryTable(new String[][]{
                {"Total Loans",          str(d.getTotalLoans())},
                {"Total Outstanding",     cur(d.getTotalOutstandingAmount())},
                {"Total Collected",       cur(d.getTotalCollectedAmount())},
                {"Assigned Loans",        str(d.getTotalAssignedLoans())},
                {"Unassigned Loans",      str(d.getTotalUnassignedLoans())},
                {"Collection Efficiency", pct(d.getCollectionEfficiencyPct())},
                {"Recovery Rate",         pct(d.getRecoveryRatePct())},
                {"High-Risk Cases",       str(d.getTotalNpaCount())},
                {"High-Risk Outstanding", cur(d.getTotalNpaAmount())},
        });
        return doc.build();
    }

    private byte[] buildGenericPdf(String title) throws DocumentException {
        DocBuilder doc = new DocBuilder(title.replace("_", " "), "Generated: " + now());
        return doc.build();
    }

    // ── PDF helper (OpenPDF wrapper) ─────────────────────────────────────────

    private static class DocBuilder {
        private final Document doc;
        private final ByteArrayOutputStream out = new ByteArrayOutputStream();
        private final String title;
        private final String subtitle;

        private final com.lowagie.text.Font fontTitle   = new Font(Font.HELVETICA, 18, Font.BOLD, Color.WHITE);
        private final com.lowagie.text.Font fontSub     = new Font(Font.HELVETICA, 11, Font.NORMAL, new Color(0xDC, 0xE6, 0xF1));
        private final com.lowagie.text.Font fontSection = new Font(Font.HELVETICA, 11, Font.BOLD, new Color(0x1F, 0x38, 0x64));
        private final com.lowagie.text.Font fontHead    = new Font(Font.HELVETICA, 9,  Font.BOLD, Color.WHITE);
        private final com.lowagie.text.Font fontData    = new Font(Font.HELVETICA, 9,  Font.NORMAL, Color.DARK_GRAY);
        private final com.lowagie.text.Font fontKpiLbl  = new Font(Font.HELVETICA, 8,  Font.BOLD, new Color(0x55, 0x55, 0x77));
        private final com.lowagie.text.Font fontKpiVal  = new Font(Font.HELVETICA, 12, Font.BOLD, new Color(0x1F, 0x38, 0x64));
        private final com.lowagie.text.Font fontMeta    = new Font(Font.HELVETICA, 8,  Font.ITALIC, Color.GRAY);

        private final Color cNavy  = new Color(0x1F, 0x38, 0x64);
        private final Color cBlue  = new Color(0x2D, 0x5F, 0x8A);
        private final Color cLBlue = new Color(0xDC, 0xE6, 0xF1);
        private final Color cAlt   = new Color(0xF5, 0xF9, 0xFF);

        DocBuilder(String title, String subtitle) throws DocumentException {
            this.title = title;
            this.subtitle = subtitle;
            doc = new Document(PageSize.A4.rotate(), 36, 36, 54, 36);
            PdfWriter writer = PdfWriter.getInstance(doc, out);
            writer.setPageEvent(new PdfPageEventHelper() {
                @Override
                public void onEndPage(PdfWriter w, Document d) {
                    PdfContentByte cb = w.getDirectContent();
                    cb.setColorStroke(new Color(0xDC, 0xE6, 0xF1));
                    cb.moveTo(36, 30); cb.lineTo(d.right() + 36, 30); cb.stroke();
                    Phrase footer = new Phrase("RecoverPro  ·  " + title + "  ·  Page " + w.getPageNumber() + "  ·  " + now(), fontMeta);
                    ColumnText.showTextAligned(cb, Element.ALIGN_CENTER, footer,
                            (d.left() + d.right() + 72) / 2, 20, 0);
                }
            });
            doc.open();
            addTitleBlock();
        }

        private void addTitleBlock() throws DocumentException {
            PdfPTable titleTbl = new PdfPTable(1);
            titleTbl.setWidthPercentage(100);
            titleTbl.setSpacingAfter(14);
            PdfPCell titleCell = new PdfPCell();
            titleCell.setBackgroundColor(cNavy);
            titleCell.setPadding(14);
            titleCell.setBorder(Rectangle.NO_BORDER);
            Paragraph p = new Paragraph(title, fontTitle);
            p.setSpacingAfter(4);
            titleCell.addElement(p);
            titleCell.addElement(new Paragraph(subtitle, fontSub));
            titleCell.addElement(new Paragraph("Generated: " + now(), fontMeta));
            titleTbl.addCell(titleCell);
            doc.add(titleTbl);
        }

        void summaryTable(String[][] kvPairs) throws DocumentException {
            doc.add(new Paragraph("SUMMARY", fontSection));
            doc.add(new Chunk("\n"));
            int cols = Math.min(kvPairs.length, 4);
            PdfPTable tbl = new PdfPTable(cols * 2);
            tbl.setWidthPercentage(100);
            tbl.setSpacingAfter(14);
            float[] widths = new float[cols * 2];
            for (int i = 0; i < cols; i++) { widths[i * 2] = 1.2f; widths[i * 2 + 1] = 1f; }
            tbl.setWidths(widths);
            for (String[] kv : kvPairs) {
                PdfPCell lc = new PdfPCell(new Phrase(kv[0], fontKpiLbl));
                lc.setBackgroundColor(cLBlue); lc.setPadding(6); lc.setBorderColor(Color.WHITE); lc.setBorderWidth(2);
                PdfPCell vc = new PdfPCell(new Phrase(kv[1], fontKpiVal));
                vc.setBackgroundColor(cAlt); vc.setPadding(6); vc.setBorderColor(Color.WHITE); vc.setBorderWidth(2);
                tbl.addCell(lc); tbl.addCell(vc);
            }
            doc.add(tbl);
        }

        void detailTable(String[] headers, List<String[]> rows) throws DocumentException {
            doc.add(new Paragraph("DETAIL", fontSection));
            doc.add(new Chunk("\n"));
            PdfPTable tbl = new PdfPTable(headers.length);
            tbl.setWidthPercentage(100);
            tbl.setSpacingAfter(14);
            tbl.setHeaderRows(1);
            for (String h : headers) {
                PdfPCell hc = new PdfPCell(new Phrase(h, fontHead));
                hc.setBackgroundColor(cBlue); hc.setPadding(6);
                hc.setBorderColor(Color.WHITE); hc.setBorderWidth(1);
                hc.setHorizontalAlignment(Element.ALIGN_CENTER);
                tbl.addCell(hc);
            }
            boolean stripe = false;
            for (String[] row : rows) {
                Color bg = stripe ? cAlt : Color.WHITE;
                for (String val : row) {
                    PdfPCell dc = new PdfPCell(new Phrase(val != null ? val : "", fontData));
                    dc.setBackgroundColor(bg); dc.setPadding(5);
                    dc.setBorderColor(cLBlue); dc.setBorderWidth(0.5f);
                    tbl.addCell(dc);
                }
                stripe = !stripe;
            }
            doc.add(tbl);
        }

        byte[] build() { doc.close(); return out.toByteArray(); }
    }
}
