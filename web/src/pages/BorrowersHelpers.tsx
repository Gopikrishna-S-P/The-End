import type {
  ConsentStatus, ErasureRequestStatus, FraudCaseStatus, ReconciliationOutcome,
  RestructureStatus, BorrowerSegment, IntentLevel, AbilityLevel,
} from '../types';

export const CONSENT_PILL: Record<ConsentStatus, string> = {
  ACTIVE: 'is-accent', REVOKED: 'is-error', EXPIRED: 'is-warn', SUPERSEDED: '',
};

export const ERASURE_PILL: Record<ErasureRequestStatus, string> = {
  REQUESTED: 'is-warn', UNDER_REVIEW: 'is-info', APPROVED: 'is-info',
  EXECUTED: 'is-accent', REJECTED: 'is-error', PARTIALLY_EXECUTED: 'is-warn',
};

export const FRAUD_PILL: Record<FraudCaseStatus, string> = {
  REPORTED: 'is-warn', UNDER_INVESTIGATION: 'is-info', CONFIRMED: 'is-error',
  REJECTED: '', CLOSED: 'is-accent',
};

export const RECON_PILL: Record<ReconciliationOutcome, string> = {
  MATCHED: 'is-accent', AMOUNT_DIFF: 'is-warn', UNMATCHED: '',
  DUPLICATE: 'is-warn', EXCEPTION: 'is-error',
};

export const RESTRUCTURE_PILL: Record<RestructureStatus, string> = {
  DRAFT: '', PROPOSED_TO_LENDER: 'is-info', APPROVED: 'is-accent',
  ACCEPTED: 'is-accent', ACTIVE: 'is-accent', REJECTED: 'is-error', EXPIRED: 'is-error',
};

export const SEGMENT_LABEL: Record<BorrowerSegment, string> = {
  LIKELY_SELF_CURE: 'Likely self-cure',
  COOPERATIVE_CAPABLE: 'Cooperative & capable',
  STRETCHED_HONEST: 'Stretched but honest',
  INERTIAL: 'Inertial',
  PERSUADABLE: 'Persuadable',
  AT_RISK: 'At risk',
  WILFUL_DEFAULT: 'Wilful default',
  STRATEGIC_DEFAULT: 'Strategic default',
  DISTRESSED_HOSTILE: 'Distressed / hostile',
  UNCLASSIFIED: 'Unclassified',
};

export const SEGMENT_TONE: Record<BorrowerSegment, string> = {
  LIKELY_SELF_CURE: 'is-accent',
  COOPERATIVE_CAPABLE: 'is-accent',
  STRETCHED_HONEST: 'is-info',
  INERTIAL: 'is-warn',
  PERSUADABLE: 'is-info',
  AT_RISK: 'is-warn',
  WILFUL_DEFAULT: 'is-error',
  STRATEGIC_DEFAULT: 'is-error',
  DISTRESSED_HOSTILE: 'is-error',
  UNCLASSIFIED: '',
};

export const LEVEL_TONE: Record<IntentLevel | AbilityLevel, string> = {
  HIGH: 'is-accent', MEDIUM: 'is-warn', LOW: 'is-error',
};

export const fmtPct = (v?: number | null) =>
  v == null ? '—' : `${(v * 100).toFixed(1)}%`;

export const borrowerFullName = (b: { firstName: string; lastName?: string }) =>
  [b.firstName, b.lastName].filter(Boolean).join(' ') || '—';
