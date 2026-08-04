-- V074's v_kpi_complaint_rate named its date column bucket_month, but KpiController.complaintRate()
-- (pre-existing code) queries "ORDER BY month" -- confirmed live via a 500
-- (org.postgresql.util.PSQLException: column "month" does not exist). V074 is already applied so
-- it can't be edited in place; this replaces the view with the column renamed to match the
-- controller's existing SQL. CREATE OR REPLACE VIEW cannot rename a column (Postgres error 42P16
-- -- "cannot change name of view column"), so this drops and recreates instead.
DROP VIEW IF EXISTS v_kpi_complaint_rate;

CREATE VIEW v_kpi_complaint_rate AS
SELECT
    g.organization_id,
    date_trunc('month', g.created_at)::date AS month,
    count(*)                                AS grievances_raised,
    mlbs.total_loans,
    round(100.0 * count(*) / NULLIF(mlbs.total_loans, 0), 4) AS complaint_rate_pct
FROM grievances g
LEFT JOIN monthly_loan_book_snapshots mlbs
    ON mlbs.organization_id = g.organization_id
   AND mlbs.snapshot_month = date_trunc('month', g.created_at)::date
GROUP BY g.organization_id, date_trunc('month', g.created_at), mlbs.total_loans;
