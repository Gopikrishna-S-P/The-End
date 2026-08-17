package com.recoverpro.server.config;

import com.recoverpro.server.service.tax.Gstin;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * RecoverPro's own GST supplier profile -- mirrors {@link StripeConfig}/{@link RazorpayConfig}'s
 * shape (config-driven, warns rather than crashing when unset). Unset by default: GST computation
 * (see {@code GstInvoiceLineItemService}) refuses to run until this is configured with real
 * values, rather than silently defaulting to a guessed state or rate.
 * <p>
 * {@code defaultRateBps} (1800 = 18%) is a placeholder pending accountant confirmation, not an
 * asserted-correct figure -- see {@link com.recoverpro.server.service.tax.GstCalculator}'s javadoc.
 */
@Slf4j
@Getter
@Configuration
public class GstConfig {

    @Value("${app.gst.supplier-gstin:}")
    private String supplierGstin;

    @Value("${app.gst.default-rate-bps:1800}")
    private int defaultRateBps;

    /** Derived from {@link #supplierGstin}, not separately configured -- an Indian GSTIN's first
     *  two characters ARE the registered state code by definition, so storing it again as a
     *  parallel setting would just be one more place for the two to drift out of sync. */
    private String supplierStateCode;

    @PostConstruct
    public void init() {
        if (supplierGstin == null || supplierGstin.isBlank()) {
            log.warn("GST supplier profile not configured (app.gst.supplier-gstin unset) -- "
                    + "GST computation will refuse to run until it is set.");
            return;
        }
        if (!Gstin.isValid(supplierGstin)) {
            log.error("app.gst.supplier-gstin is set but not a structurally valid GSTIN: {} -- "
                    + "GST computation will refuse to run until this is corrected.", supplierGstin);
            return;
        }
        supplierStateCode = Gstin.stateCode(supplierGstin);
    }

    public boolean isConfigured() {
        return supplierStateCode != null;
    }
}
