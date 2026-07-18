// Borrower risk scoring & segmentation. Ground truth: server RiskScoringController.java
// (/api/v1/risk/borrowers).

export type IntentLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type AbilityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export type BorrowerSegment =
  | 'LIKELY_SELF_CURE'
  | 'COOPERATIVE_CAPABLE'
  | 'STRETCHED_HONEST'
  | 'INERTIAL'
  | 'PERSUADABLE'
  | 'AT_RISK'
  | 'WILFUL_DEFAULT'
  | 'STRATEGIC_DEFAULT'
  | 'DISTRESSED_HOSTILE'
  | 'UNCLASSIFIED';

export interface BorrowerRiskScoreResponse {
  id: string;
  organizationId: string;
  borrowerId: string;
  modelVersion: string;
  defaultPropensity: number;
  intent: IntentLevel;
  ability: AbilityLevel;
  segment: BorrowerSegment;
  featureAttributions?: Record<string, unknown>;
  featureSnapshot?: Record<string, unknown>;
  scoredAt: string;
  createdAt: string;
}
