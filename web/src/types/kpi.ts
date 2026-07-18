// KpiController (/api/v1/kpi) is a thin pass-through over `v_kpi_*` SQL views —
// each endpoint returns `List<Map<String, Object>>` (raw view rows) rather than
// a fixed DTO, so the client renders whatever columns come back instead of
// hard-coding field names that could silently drift from the view definition.

/** One row from a v_kpi_* view. Keys/value types vary per metric. */
export type KpiRow = Record<string, unknown>;

export interface KpiMetricDef {
  /** URL segment under /api/v1/kpi/{key} */
  key: string;
  label: string;
  description: string;
  /** true => PLATFORM_ADMIN only (all other KPI endpoints allow ORG_ADMIN too) */
  platformOnly?: boolean;
}
