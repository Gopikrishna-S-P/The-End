package com.recoverpro.server.service.tax;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GstCalculatorTest {

    @Test
    void compute_sameState_splitsEvenlyAcrossCgstAndSgst() {
        // 10,000 paise (Rs 100) at 18% = 1,800 paise total tax -> 900 + 900
        GstBreakdown result = GstCalculator.compute("27", "27", 10_000L, 1800);

        assertThat(result.cgst()).isEqualTo(900L);
        assertThat(result.sgst()).isEqualTo(900L);
        assertThat(result.igst()).isEqualTo(0L);
        assertThat(result.totalTax()).isEqualTo(1800L);
    }

    @Test
    void compute_differentState_isFullyIgst() {
        GstBreakdown result = GstCalculator.compute("27", "07", 10_000L, 1800);

        assertThat(result.cgst()).isEqualTo(0L);
        assertThat(result.sgst()).isEqualTo(0L);
        assertThat(result.igst()).isEqualTo(1800L);
        assertThat(result.totalTax()).isEqualTo(1800L);
    }

    @Test
    void compute_oddTotalTax_roundingRemainderGoesToCgst_neverLosesOrDuplicatesAPaise() {
        // 3 paise at 18% = round(0.54) = 1 paise total tax -- genuinely odd, so the even-split
        // has a real remainder to place, unlike a round-number example that happens to divide
        // evenly and wouldn't actually exercise the remainder branch.
        GstBreakdown result = GstCalculator.compute("27", "27", 3L, 1800);

        assertThat(result.totalTax()).isEqualTo(1L);
        assertThat(result.cgst()).isEqualTo(1L);
        assertThat(result.sgst()).isEqualTo(0L);
        assertThat(result.cgst() + result.sgst()).isEqualTo(result.totalTax());
    }

    @Test
    void compute_zeroRate_producesZeroTax() {
        GstBreakdown result = GstCalculator.compute("27", "27", 10_000L, 0);
        assertThat(result.totalTax()).isEqualTo(0L);
    }

    @Test
    void compute_negativeAmount_throws() {
        assertThatThrownBy(() -> GstCalculator.compute("27", "27", -1L, 1800))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void compute_negativeRate_throws() {
        assertThatThrownBy(() -> GstCalculator.compute("27", "27", 1000L, -1))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void compute_nullSupplierState_treatedAsInterState() {
        GstBreakdown result = GstCalculator.compute(null, "27", 10_000L, 1800);
        assertThat(result.igst()).isEqualTo(1800L);
        assertThat(result.cgst()).isEqualTo(0L);
    }
}
