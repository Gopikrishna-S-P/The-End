package com.recoverpro.server.service.tax;

/** All amounts in minor currency units (paise). {@code cgst}/{@code sgst} are zero for an
 *  inter-state supply; {@code igst} is zero for an intra-state supply -- never both non-zero. */
public record GstBreakdown(long cgst, long sgst, long igst) {

    public long totalTax() {
        return cgst + sgst + igst;
    }
}
