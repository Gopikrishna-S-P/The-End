package com.recoverpro.server.service.export;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.*;
import com.recoverpro.server.entity.KeyFactStatement;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * Renders a formal, single-statement Key Fact Statement PDF (OpenPDF) disclosing a restructuring's
 * revised loan terms (see docs/superpowers/specs/2026-08-04-kfs-design.md). Deliberately not built
 * on {@link PdfReportBuilder}'s DocBuilder -- a labeled-field regulatory statement reads
 * differently from a tabular report.
 */
public class KfsPdfBuilder {

    private static final DateTimeFormatter TS_FMT =
            DateTimeFormatter.ofPattern("dd-MMM-yyyy HH:mm").withZone(ZoneId.of("Asia/Kolkata"));

    private static final Color NAVY  = new Color(0x1F, 0x38, 0x64);
    private static final Color LBLUE = new Color(0xDC, 0xE6, 0xF1);
    private static final Color ALT   = new Color(0xF5, 0xF9, 0xFF);

    private static final Font FONT_TITLE   = new Font(Font.HELVETICA, 16, Font.BOLD, Color.WHITE);
    private static final Font FONT_SUB     = new Font(Font.HELVETICA, 10, Font.NORMAL, LBLUE);
    private static final Font FONT_SECTION = new Font(Font.HELVETICA, 11, Font.BOLD, NAVY);
    private static final Font FONT_LABEL   = new Font(Font.HELVETICA, 9,  Font.BOLD, new Color(0x55, 0x55, 0x77));
    private static final Font FONT_VALUE   = new Font(Font.HELVETICA, 10, Font.NORMAL, Color.DARK_GRAY);
    private static final Font FONT_META    = new Font(Font.HELVETICA, 8,  Font.ITALIC, Color.GRAY);

    /** Canonical text used both to render the "rendered_html" column and to compute content_sha256
     * -- built independently of the PDF layout so the hash is stable even if PDF styling changes. */
    public String buildHtml(KeyFactStatement kfs, String loanNumber, String borrowerName) {
        StringBuilder sb = new StringBuilder();
        sb.append("<html><body>");
        sb.append("<h1>Key Fact Statement</h1>");
        sb.append("<p>Loan Number: ").append(esc(loanNumber)).append("</p>");
        sb.append("<p>Borrower: ").append(esc(borrowerName)).append("</p>");
        sb.append("<h2>Revised Loan Terms</h2>");
        row(sb, "Sanctioned Amount", money(kfs.getSanctionedAmount()));
        row(sb, "Net Disbursed Amount", money(kfs.getNetDisbursedAmount()));
        row(sb, "Annual Percentage Rate (APR)", pct(kfs.getAprPercent()));
        row(sb, "Interest Rate", pct(kfs.getInterestRatePercent()));
        row(sb, "Interest Type", str(kfs.getInterestType()));
        row(sb, "Tenure (months)", str(kfs.getTenureMonths()));
        row(sb, "EMI Amount", money(kfs.getEmiAmount()));
        row(sb, "Repayment Frequency", str(kfs.getRepaymentFrequency()));
        sb.append("<h2>Cost Breakdown</h2>");
        row(sb, "Total Interest Charge", money(kfs.getTotalInterestCharge()));
        row(sb, "Processing Fee", money(kfs.getProcessingFee()));
        row(sb, "Other Charges", money(kfs.getOtherCharges()));
        row(sb, "Total Amount Payable", money(kfs.getTotalPayable()));
        sb.append("<h2>Other Terms</h2>");
        row(sb, "Cooling-off Period (days)", str(kfs.getCoolingOffDays()));
        row(sb, "Penal Charges", str(kfs.getPenalChargesDescription()));
        sb.append("</body></html>");
        return sb.toString();
    }

    public byte[] buildPdf(KeyFactStatement kfs, String loanNumber, String borrowerName) throws DocumentException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document doc = new Document(PageSize.A4, 40, 40, 54, 40);
        PdfWriter writer = PdfWriter.getInstance(doc, out);
        writer.setPageEvent(new PdfPageEventHelper() {
            @Override
            public void onEndPage(PdfWriter w, Document d) {
                PdfContentByte cb = w.getDirectContent();
                cb.setColorStroke(LBLUE);
                cb.moveTo(40, 34); cb.lineTo(d.right() + 40, 34); cb.stroke();
                Phrase footer = new Phrase(
                        "RecoverPro · Key Fact Statement · Page " + w.getPageNumber() + " · " + now(), FONT_META);
                ColumnText.showTextAligned(cb, Element.ALIGN_CENTER, footer,
                        (d.left() + d.right() + 80) / 2, 22, 0);
            }
        });
        doc.open();

        addTitleBlock(doc, loanNumber, borrowerName);
        addSection(doc, "Revised Loan Terms", new String[][]{
                {"Sanctioned Amount", money(kfs.getSanctionedAmount())},
                {"Net Disbursed Amount", money(kfs.getNetDisbursedAmount())},
                {"Annual Percentage Rate (APR)", pct(kfs.getAprPercent())},
                {"Interest Rate", pct(kfs.getInterestRatePercent())},
                {"Interest Type", str(kfs.getInterestType())},
                {"Tenure (months)", str(kfs.getTenureMonths())},
                {"EMI Amount", money(kfs.getEmiAmount())},
                {"Repayment Frequency", str(kfs.getRepaymentFrequency())},
        });
        addSection(doc, "Cost Breakdown", new String[][]{
                {"Total Interest Charge", money(kfs.getTotalInterestCharge())},
                {"Processing Fee", money(kfs.getProcessingFee())},
                {"Other Charges", money(kfs.getOtherCharges())},
                {"Total Amount Payable", money(kfs.getTotalPayable())},
        });
        addSection(doc, "Other Terms", new String[][]{
                {"Cooling-off Period (days)", str(kfs.getCoolingOffDays())},
                {"Penal Charges", str(kfs.getPenalChargesDescription())},
        });

        doc.add(new Paragraph(" "));
        doc.add(new Paragraph(
                "This statement discloses the revised terms of your restructured loan. Fields marked "
                        + "N/A do not apply to this restructuring (no new disbursal or fees are involved).",
                FONT_META));

        doc.close();
        return out.toByteArray();
    }

    private void addTitleBlock(Document doc, String loanNumber, String borrowerName) throws DocumentException {
        PdfPTable titleTbl = new PdfPTable(1);
        titleTbl.setWidthPercentage(100);
        titleTbl.setSpacingAfter(16);
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(NAVY);
        cell.setPadding(14);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.addElement(new Paragraph("Key Fact Statement", FONT_TITLE));
        cell.addElement(new Paragraph("Loan Number: " + nvl(loanNumber) + "   |   Borrower: " + nvl(borrowerName), FONT_SUB));
        cell.addElement(new Paragraph("Generated: " + now(), FONT_META));
        titleTbl.addCell(cell);
        doc.add(titleTbl);
    }

    private void addSection(Document doc, String title, String[][] rows) throws DocumentException {
        doc.add(new Paragraph(title.toUpperCase(), FONT_SECTION));
        doc.add(new Chunk("\n"));
        PdfPTable tbl = new PdfPTable(2);
        tbl.setWidthPercentage(100);
        tbl.setSpacingAfter(14);
        tbl.setWidths(new float[]{1.2f, 1.6f});
        boolean stripe = false;
        for (String[] row : rows) {
            Color bg = stripe ? ALT : Color.WHITE;
            PdfPCell lc = new PdfPCell(new Phrase(row[0], FONT_LABEL));
            lc.setBackgroundColor(LBLUE); lc.setPadding(6); lc.setBorderColor(Color.WHITE); lc.setBorderWidth(1);
            PdfPCell vc = new PdfPCell(new Phrase(row[1], FONT_VALUE));
            vc.setBackgroundColor(bg); vc.setPadding(6); vc.setBorderColor(Color.WHITE); vc.setBorderWidth(1);
            tbl.addCell(lc); tbl.addCell(vc);
            stripe = !stripe;
        }
        doc.add(tbl);
    }

    private static void row(StringBuilder sb, String label, String value) {
        sb.append("<p>").append(esc(label)).append(": ").append(esc(value)).append("</p>");
    }

    private static String now() { return TS_FMT.format(java.time.Instant.now()); }
    private static String nvl(String s) { return s != null ? s : "N/A"; }
    private static String str(Object o) { return o != null ? o.toString() : "N/A"; }
    private static String money(BigDecimal v) { return v != null ? "₹ " + v.toPlainString() : "N/A"; }
    private static String pct(BigDecimal v) { return v != null ? v.toPlainString() + "%" : "N/A"; }
    private static String esc(String s) {
        return s == null ? "" : s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
