package com.recoverpro.server.service.tax;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Computes the CGST+SGST vs. IGST split for a domestic (India-to-India) supply of services.
 * <p>
 * The RULE this implements -- same state (supplier and recipient) means intra-state, split
 * evenly across CGST+SGST; different states means inter-state, full rate as IGST -- is settled
 * law (Sections 8/9 CGST Act, Section 5 IGST Act, unchanged since GST's 2017 rollout), so this
 * mechanism is implemented with full confidence.
 * <p>
 * What is NOT settled by this class, and must be confirmed with an accountant before the output
 * is relied on for a real invoice: the {@code rateBps} value passed in. 1800 (18%) is the rate
 * widely cited for IT/SaaS services (HSN/SAC 9983) as of this codebase's authoring date, but tax
 * rates, applicable HSN/SAC classification, and any exemption specific to RecoverPro's situation
 * are all outside what code can assert. See {@link com.recoverpro.server.config.GstConfig}.
 */
public final class GstCalculator {

    private GstCalculator() {}

    /**
     * @param supplierStateCode   2-digit state code the supply originates from (RecoverPro's own,
     *                            from {@code GstConfig})
     * @param recipientStateCode  2-digit state code of the billed organization (derived from
     *                            their GSTIN, see {@link Gstin#stateCode})
     * @param taxableAmountMinorUnits the pre-tax amount, in paise
     * @param rateBps              total GST rate in basis points (1800 = 18%)
     */
    public static GstBreakdown compute(String supplierStateCode, String recipientStateCode,
                                       long taxableAmountMinorUnits, int rateBps) {
        if (taxableAmountMinorUnits < 0) {
            throw new IllegalArgumentException("Taxable amount cannot be negative");
        }
        if (rateBps < 0) {
            throw new IllegalArgumentException("GST rate cannot be negative");
        }

        BigDecimal taxable = BigDecimal.valueOf(taxableAmountMinorUnits);
        BigDecimal rate = BigDecimal.valueOf(rateBps).divide(BigDecimal.valueOf(10_000), 10, RoundingMode.HALF_UP);
        long totalTax = taxable.multiply(rate).setScale(0, RoundingMode.HALF_UP).longValueExact();

        boolean intraState = supplierStateCode != null && supplierStateCode.equals(recipientStateCode);
        if (!intraState) {
            return new GstBreakdown(0, 0, totalTax);
        }

        // Even split; any single paise of rounding remainder goes to CGST rather than being lost
        // or duplicated, so cgst + sgst always reconciles exactly to totalTax.
        long half = totalTax / 2;
        long cgst = half + (totalTax % 2);
        long sgst = half;
        return new GstBreakdown(cgst, sgst, 0);
    }
}
