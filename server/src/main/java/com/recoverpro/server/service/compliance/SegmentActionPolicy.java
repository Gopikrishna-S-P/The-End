package com.recoverpro.server.service.compliance;

import com.recoverpro.server.enums.BorrowerSegment;
import com.recoverpro.server.enums.Channel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

@Service
public class SegmentActionPolicy {

    private static final Map<BorrowerSegment, Policy> TABLE;

    static {
        TABLE = new EnumMap<>(BorrowerSegment.class);
        TABLE.put(BorrowerSegment.LIKELY_SELF_CURE, new Policy(
                Intensity.LOW, EnumSet.of(Channel.EMAIL, Channel.SMS),
                FieldVisit.NO, SettlementEligibility.NO, BigDecimal.ZERO));
        TABLE.put(BorrowerSegment.COOPERATIVE_CAPABLE, new Policy(
                Intensity.MEDIUM, EnumSet.of(Channel.SMS, Channel.WHATSAPP, Channel.EMAIL),
                FieldVisit.NO, SettlementEligibility.NO, BigDecimal.ZERO));
        TABLE.put(BorrowerSegment.PERSUADABLE, new Policy(
                Intensity.MEDIUM_HIGH, EnumSet.of(Channel.SMS, Channel.WHATSAPP, Channel.EMAIL, Channel.VOICE_IVR),
                FieldVisit.CONDITIONAL, SettlementEligibility.NO, BigDecimal.ZERO));
        TABLE.put(BorrowerSegment.INERTIAL, new Policy(
                Intensity.MEDIUM_HIGH, EnumSet.of(Channel.SMS, Channel.WHATSAPP, Channel.EMAIL, Channel.VOICE_IVR),
                FieldVisit.CONDITIONAL, SettlementEligibility.NO, BigDecimal.ZERO));
        TABLE.put(BorrowerSegment.STRETCHED_HONEST, new Policy(
                Intensity.HIGH, EnumSet.of(Channel.WHATSAPP, Channel.EMAIL, Channel.VOICE_IVR, Channel.VOICE_AGENT),
                FieldVisit.YES, SettlementEligibility.RESTRUCTURE_PREFERRED, new BigDecimal("0.40")));
        TABLE.put(BorrowerSegment.AT_RISK, new Policy(
                Intensity.HIGH, EnumSet.allOf(Channel.class),
                FieldVisit.YES, SettlementEligibility.CONDITIONAL, new BigDecimal("0.30")));
        TABLE.put(BorrowerSegment.DISTRESSED_HOSTILE, new Policy(
                Intensity.HIGH, EnumSet.of(Channel.SMS, Channel.EMAIL, Channel.VOICE_AGENT),
                FieldVisit.YES, SettlementEligibility.YES, new BigDecimal("0.50")));
        TABLE.put(BorrowerSegment.STRATEGIC_DEFAULT, new Policy(
                Intensity.LEGAL_TRACK, EnumSet.of(Channel.EMAIL, Channel.SMS),
                FieldVisit.YES, SettlementEligibility.NO, BigDecimal.ONE));
        TABLE.put(BorrowerSegment.WILFUL_DEFAULT, new Policy(
                Intensity.LEGAL_TRACK, EnumSet.of(Channel.EMAIL),
                FieldVisit.YES, SettlementEligibility.NO_BELOW_PRINCIPAL, BigDecimal.ONE));
        TABLE.put(BorrowerSegment.UNCLASSIFIED, new Policy(
                Intensity.LOW, EnumSet.of(Channel.EMAIL),
                FieldVisit.NO, SettlementEligibility.NO, BigDecimal.ZERO));
    }

    public Policy forSegment(BorrowerSegment segment) {
        return TABLE.get(segment == null ? BorrowerSegment.UNCLASSIFIED : segment);
    }

    public BigDecimal computeFloorAmount(BorrowerSegment segment, BigDecimal outstanding) {
        if (outstanding == null || outstanding.signum() <= 0) return BigDecimal.ZERO;
        Policy p = forSegment(segment);
        if (p.floorPct.signum() <= 0) return BigDecimal.ZERO;
        return outstanding.multiply(p.floorPct).setScale(2, RoundingMode.HALF_UP);
    }

    public boolean isChannelAllowed(BorrowerSegment segment, Channel channel) {
        return forSegment(segment).channels.contains(channel);
    }

    public enum Intensity { LOW, MEDIUM, MEDIUM_HIGH, HIGH, LEGAL_TRACK }
    public enum FieldVisit { NO, CONDITIONAL, YES }
    public enum SettlementEligibility { NO, CONDITIONAL, YES, RESTRUCTURE_PREFERRED, NO_BELOW_PRINCIPAL }

    @Getter
    @AllArgsConstructor
    public static class Policy {
        Intensity intensity;
        Set<Channel> channels;
        FieldVisit fieldVisit;
        SettlementEligibility settlement;
        BigDecimal floorPct;
    }
}
