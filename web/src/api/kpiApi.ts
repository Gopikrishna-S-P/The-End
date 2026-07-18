import axiosInstance from './axiosInstance';
import type { ApiResponse, KpiRow, KpiMetricDef } from '../types';

/**
 * KpiController (/api/v1/kpi) — a read-only pass-through over the `v_kpi_*`
 * SQL views (design-doc §11.3). Every endpoint takes `organizationId` and
 * returns `List<Map<String, Object>>`, i.e. raw view rows with no fixed
 * shape. All endpoints require ORG_ADMIN or PLATFORM_ADMIN except
 * calling-hours-violations, which is PLATFORM_ADMIN only.
 */
export const KPI_METRICS: KpiMetricDef[] = [
  { key: 'collection-efficiency',      label: 'Collection Efficiency',       description: 'Monthly collection efficiency by bucket.' },
  { key: 'roll-forward-rate',          label: 'Roll-Forward Rate',           description: 'Share of accounts that roll forward to a worse delinquency bucket, by month.' },
  { key: 'ptp-kept-rate',              label: 'PTP Kept Rate',               description: 'Promise-to-pay kept vs. broken rate.' },
  { key: 'contactability',             label: 'Contactability',              description: 'Reachability of the allocated portfolio.' },
  { key: 'complaint-rate',             label: 'Complaint Rate',              description: 'Borrower complaints per month.' },
  { key: 'grievance-mttr',             label: 'Grievance MTTR',              description: 'Mean time to resolve grievances.' },
  { key: 'reconciliation-gap',         label: 'Reconciliation Gap',          description: 'Outstanding gap between ledger and reconciled receipts.' },
  { key: 'calling-hours-violations',   label: 'Calling Hours Violations',    description: 'Calls placed outside permitted calling hours, by day.', platformOnly: true },
];

const fetchKpi = async (endpointKey: string, organizationId: string): Promise<KpiRow[]> => {
  const response = await axiosInstance.get<ApiResponse<KpiRow[]>>(
    `/api/v1/kpi/${endpointKey}`,
    { params: { organizationId } },
  );
  return response.data.data;
};

export const kpiApi = {
  collectionEfficiency:    (organizationId: string) => fetchKpi('collection-efficiency', organizationId),
  rollForwardRate:         (organizationId: string) => fetchKpi('roll-forward-rate', organizationId),
  ptpKeptRate:             (organizationId: string) => fetchKpi('ptp-kept-rate', organizationId),
  contactability:          (organizationId: string) => fetchKpi('contactability', organizationId),
  complaintRate:           (organizationId: string) => fetchKpi('complaint-rate', organizationId),
  grievanceMttr:           (organizationId: string) => fetchKpi('grievance-mttr', organizationId),
  reconciliationGap:       (organizationId: string) => fetchKpi('reconciliation-gap', organizationId),
  /** PLATFORM_ADMIN only — the backend returns 403 for ORG_ADMIN. */
  callingHoursViolations:  (organizationId: string) => fetchKpi('calling-hours-violations', organizationId),
  /** Generic accessor keyed by KPI_METRICS[i].key, used by the page's tab loop. */
  fetch: fetchKpi,
};
