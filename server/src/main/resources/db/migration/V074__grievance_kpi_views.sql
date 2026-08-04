-- The last 2 of the original 8 KPI views (V071's header comment) -- both needed grievance data,
-- and grievances had zero application code until this feature. No changes to the grievances/
-- grievance_officers tables themselves; both already had full RLS/FKs/indexes since V038/V040.

-- v_kpi_complaint_rate: grievances raised per month per org, as a percentage of that org's total
-- loan count in the same month (monthly_loan_book_snapshots.total_loans, same denominator source
-- v_kpi_collection_efficiency already uses).
CREATE OR REPLACE VIEW v_kpi_complaint_rate AS
SELECT
    g.organization_id,
    date_trunc('month', g.created_at)::date AS bucket_month,
    count(*)                                AS grievances_raised,
    mlbs.total_loans,
    round(100.0 * count(*) / NULLIF(mlbs.total_loans, 0), 4) AS complaint_rate_pct
FROM grievances g
LEFT JOIN monthly_loan_book_snapshots mlbs
    ON mlbs.organization_id = g.organization_id
   AND mlbs.snapshot_month = date_trunc('month', g.created_at)::date
GROUP BY g.organization_id, date_trunc('month', g.created_at), mlbs.total_loans;

-- v_kpi_grievance_mttr: mean time-to-resolution in days, grouped by month/org, over grievances
-- that actually reached RESOLVED or CLOSED (open grievances have no resolved_at yet and are
-- excluded rather than counted as zero, which would understate the average).
CREATE OR REPLACE VIEW v_kpi_grievance_mttr AS
SELECT
    organization_id,
    date_trunc('month', created_at)::date AS bucket_month,
    count(*)                              AS resolved_count,
    round(avg(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400.0), 2) AS mttr_days
FROM grievances
WHERE status IN ('RESOLVED', 'CLOSED') AND resolved_at IS NOT NULL
GROUP BY organization_id, date_trunc('month', created_at);
