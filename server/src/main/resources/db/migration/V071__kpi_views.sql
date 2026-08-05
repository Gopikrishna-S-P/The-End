-- =============================================================================
-- KpiController's 8 endpoints have queried these views since the controller was
-- written, but none of the views ever existed (design-doc §11.3 called for them,
-- never followed up) -- every call 500'd. This creates the 6 that have real data
-- behind them. Two stay unbuilt: v_kpi_complaint_rate and v_kpi_grievance_mttr
-- need grievance data, and grievances have zero application code anywhere in
-- this codebase yet.
--
-- Views, not materialised views: KPI query volume is low (a handful of
-- dashboard loads, not a hot path), and a plain view always reflects the
-- latest committed data with no refresh job to forget to run. Revisit if that
-- assumption stops holding.
-- =============================================================================

-- v_kpi_collection_efficiency: monthly_loan_book_snapshots already computes this
-- percentage (SnapshotServiceImpl, run by MonthlySnapshotScheduler) -- this view
-- just exposes it under the column names KpiController's ORDER BY expects.
CREATE OR REPLACE VIEW v_kpi_collection_efficiency AS
SELECT
    organization_id,
    snapshot_month                 AS bucket_month,
    total_collected_amount,
    total_outstanding_amount,
    total_loans,
    collection_efficiency_pct
FROM monthly_loan_book_snapshots;

-- v_kpi_ptp_kept_rate: of PTPs that reached a terminal outcome (excludes PENDING/
-- CANCELLED, which haven't resolved either way yet), what fraction were kept.
-- ptp_records has no organization_id of its own -- scoped via its allocation.
CREATE OR REPLACE VIEW v_kpi_ptp_kept_rate AS
SELECT
    a.organization_id,
    date_trunc('month', p.promised_date)::date                              AS bucket_month,
    count(*) FILTER (WHERE p.status = 'FULFILLED')                          AS ptps_fulfilled,
    count(*) FILTER (WHERE p.status IN ('FULFILLED', 'PARTIALLY_FULFILLED', 'BROKEN')) AS ptps_resolved,
    round(
        100.0 * count(*) FILTER (WHERE p.status = 'FULFILLED')
        / NULLIF(count(*) FILTER (WHERE p.status IN ('FULFILLED', 'PARTIALLY_FULFILLED', 'BROKEN')), 0),
        2
    )                                                                        AS kept_rate_pct
FROM ptp_records p
JOIN allocations a ON a.id = p.allocation_id
WHERE p.is_deleted = FALSE
GROUP BY a.organization_id, date_trunc('month', p.promised_date);

-- v_kpi_reconciliation_gap: reconciliation_runs already tracks matched/unmatched
-- per run (ReconciliationScheduler / ReconciliationService) -- aggregated to a
-- monthly gap percentage.
CREATE OR REPLACE VIEW v_kpi_reconciliation_gap AS
SELECT
    organization_id,
    date_trunc('month', as_of_date)::date AS bucket_month,
    sum(rows_ingested)                    AS rows_ingested,
    sum(matched)                          AS matched,
    sum(unmatched)                        AS unmatched,
    sum(amount_diff)                      AS amount_diff,
    round(100.0 * sum(unmatched) / NULLIF(sum(rows_ingested), 0), 2) AS gap_pct
FROM reconciliation_runs
GROUP BY organization_id, date_trunc('month', as_of_date);

-- v_kpi_roll_forward_rate: NOT a true bucket-to-bucket DPD roll-forward rate --
-- this codebase has no per-account DPD-bucket history table to compute that
-- from (only monthly_loan_book_snapshots' aggregate total_npa_count/amount per
-- org per month). This is the closest honest approximation available: net
-- month-over-month growth in the NPA book. Revisit properly if/when per-bucket
-- snapshot data gets built.
CREATE OR REPLACE VIEW v_kpi_roll_forward_rate AS
SELECT
    organization_id,
    snapshot_month AS month,
    total_npa_count,
    total_npa_amount,
    total_loans,
    lag(total_npa_count)  OVER w AS prev_npa_count,
    lag(total_npa_amount) OVER w AS prev_npa_amount,
    round(
        100.0 * (total_npa_count - lag(total_npa_count) OVER w)
        / NULLIF(lag(total_npa_count) OVER w, 0),
        2
    ) AS npa_count_growth_pct,
    round(
        100.0 * (total_npa_amount - lag(total_npa_amount) OVER w)
        / NULLIF(lag(total_npa_amount) OVER w, 0),
        2
    ) AS npa_amount_growth_pct
FROM monthly_loan_book_snapshots
WINDOW w AS (PARTITION BY organization_id ORDER BY snapshot_month);

-- v_kpi_contactability: % of call attempts (call_logs, built this session for
-- the CALLER role's call-recording feature) that actually reached the borrower.
CREATE OR REPLACE VIEW v_kpi_contactability AS
SELECT
    organization_id,
    date_trunc('month', initiated_at)::date                    AS bucket_month,
    count(*)                                                    AS total_calls,
    count(*) FILTER (WHERE outcome = 'ANSWERED')                AS answered_calls,
    round(100.0 * count(*) FILTER (WHERE outcome = 'ANSWERED') / NULLIF(count(*), 0), 2) AS contactability_pct
FROM call_logs
GROUP BY organization_id, date_trunc('month', initiated_at);

-- v_kpi_calling_hours_violations: calls placed outside the RBI Recovery Agent
-- Code of Conduct window (CallingHoursGuard: 08:00-19:00 IST, Mon-Sat, minus
-- the org's holiday_calendar -- same rule, reimplemented in SQL since a view
-- can't call into application config). If that config is ever changed from
-- its defaults, this view's hardcoded 8/19/Sunday will drift out of sync with
-- it -- update both together.
CREATE OR REPLACE VIEW v_kpi_calling_hours_violations AS
SELECT
    cl.organization_id,
    (cl.initiated_at AT TIME ZONE 'Asia/Kolkata')::date AS day,
    count(*)                                            AS violation_count,
    count(DISTINCT cl.agent_id)                         AS agents_involved
FROM call_logs cl
WHERE (
        EXTRACT(HOUR FROM cl.initiated_at AT TIME ZONE 'Asia/Kolkata') < 8
        OR EXTRACT(HOUR FROM cl.initiated_at AT TIME ZONE 'Asia/Kolkata') >= 19
        OR EXTRACT(DOW FROM cl.initiated_at AT TIME ZONE 'Asia/Kolkata') = 0
        OR EXISTS (
            SELECT 1 FROM holiday_calendar h
            WHERE h.organization_id = cl.organization_id
              AND h.holiday_date = (cl.initiated_at AT TIME ZONE 'Asia/Kolkata')::date
              AND h.is_active = TRUE
        )
      )
GROUP BY cl.organization_id, (cl.initiated_at AT TIME ZONE 'Asia/Kolkata')::date;
