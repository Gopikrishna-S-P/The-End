-- V040__rls_failclosed_and_extend.sql
-- Part 1: fix V010's fail-open bug on the 4 tables it already covers.
-- Part 2: extend fail-closed RLS to every other org-scoped table enumerated
--   in DATABASE_DESIGN.md §3's table list.
-- Part 3: extend fail-closed RLS to 7 further org-scoped tables that carry
--   an organization_id (or org_id) column per §3's stated principle but were
--   omitted from §3's enumerated list: key_fact_statements, daily_attendance
--   (org_id), grievance_officers, lsp_disclosures, column_schemas,
--   agent_capacity_config, holiday_calendar.
-- DATABASE_DESIGN.md §3 full table list (organization_id column confirmed
-- against V001/V008/V019/V025 and V029-V039):
--   allocations, borrowers, file_uploads, collections (fixing existing),
--   assignments, visit_logs, visit_sessions, ptp_records, npa_records,
--   agent_shifts, agent_location_pings [no organization_id column --
--     isolation via subquery on shift_id FK to agent_shifts, same
--     subquery-based pattern as ptp_records/collection_documents below],
--   daily_visit_list, route_plans (already RLS'd, V030), non_contactables,
--   incident_reports, collection_documents, collection_ledger_entries
--     (already RLS'd, V029), payment_intents, payment_transactions
--     [no organization_id column -- isolation via subquery on intent_id FK
--     to payment_intents, same subquery-based pattern as ptp_records/
--     collection_documents below],
--   reconciliation_runs, consent_artifacts, data_erasure_requests,
--   compliance_decisions [org_id nullable -- platform-wide decisions have
--     no org; policy still applies, NULL org_id rows are simply invisible
--     under tenant context, which is correct], grievances,
--   settlement_offers, restructure_proposals (already RLS'd, V031),
--   fraud_cases, message_templates, communication_logs, report_jobs,
--   agent_performance_snapshots, monthly_loan_book_snapshots,
--   borrower_risk_scores, app_notifications (organization_id nullable --
--   same NULL-is-invisible reasoning as compliance_decisions).

-- ── Part 1: fix the 4 existing fail-open policies ──────────────────────────
DROP POLICY rls_allocations_isolation ON allocations;
CREATE POLICY rls_allocations_isolation ON allocations
    USING (organization_id = current_org_id());

DROP POLICY rls_borrowers_isolation ON borrowers;
CREATE POLICY rls_borrowers_isolation ON borrowers
    USING (organization_id = current_org_id());

DROP POLICY rls_file_uploads_isolation ON file_uploads;
CREATE POLICY rls_file_uploads_isolation ON file_uploads
    USING (organization_id = current_org_id());

DROP POLICY rls_collections_isolation ON collections;
CREATE POLICY rls_collections_isolation ON collections
    USING (organization_id = current_org_id());

-- ── Part 2: extend to every remaining org-scoped table ─────────────────────
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_assignments_isolation ON assignments
    USING (organization_id = current_org_id());

ALTER TABLE visit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_visit_logs_isolation ON visit_logs
    USING (organization_id = current_org_id());

-- visit_sessions uses org_id, not organization_id (see V025__visit_sessions.sql)
ALTER TABLE visit_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_sessions FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_visit_sessions_isolation ON visit_sessions
    USING (org_id = current_org_id());

-- ptp_records has no organization_id column (see V001__baseline.sql); isolate
-- via the allocation_id FK to allocations, which is itself fail-closed RLS'd.
ALTER TABLE ptp_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ptp_records FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_ptp_records_isolation ON ptp_records
    USING (allocation_id IN (SELECT id FROM allocations WHERE organization_id = current_org_id()));

ALTER TABLE npa_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE npa_records FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_npa_records_isolation ON npa_records
    USING (organization_id = current_org_id());

ALTER TABLE agent_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_shifts FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_agent_shifts_isolation ON agent_shifts
    USING (organization_id = current_org_id());

-- agent_location_pings has no organization_id column (see V001__baseline.sql);
-- isolate via the shift_id FK to agent_shifts, which is itself fail-closed
-- RLS'd above.
ALTER TABLE agent_location_pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_location_pings FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_agent_location_pings_isolation ON agent_location_pings
    USING (shift_id IN (SELECT id FROM agent_shifts WHERE organization_id = current_org_id()));

ALTER TABLE daily_visit_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_visit_list FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_daily_visit_list_isolation ON daily_visit_list
    USING (organization_id = current_org_id());

ALTER TABLE non_contactables ENABLE ROW LEVEL SECURITY;
ALTER TABLE non_contactables FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_non_contactables_isolation ON non_contactables
    USING (organization_id = current_org_id());

ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_reports FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_incident_reports_isolation ON incident_reports
    USING (organization_id = current_org_id());

-- collection_documents has no organization_id column (see V001__baseline.sql);
-- isolate via the collection_id FK to collections, which is itself fail-closed
-- RLS'd (Part 1 above).
ALTER TABLE collection_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_documents FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_collection_documents_isolation ON collection_documents
    USING (collection_id IN (SELECT id FROM collections WHERE organization_id = current_org_id()));

ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_payment_intents_isolation ON payment_intents
    USING (organization_id = current_org_id());

-- payment_transactions has no organization_id column (see V001__baseline.sql);
-- isolate via the intent_id FK to payment_intents, which is itself fail-closed
-- RLS'd above.
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_payment_transactions_isolation ON payment_transactions
    USING (intent_id IN (SELECT id FROM payment_intents WHERE organization_id = current_org_id()));

ALTER TABLE reconciliation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_reconciliation_runs_isolation ON reconciliation_runs
    USING (organization_id = current_org_id());

ALTER TABLE consent_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_artifacts FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_consent_artifacts_isolation ON consent_artifacts
    USING (organization_id = current_org_id());

ALTER TABLE data_erasure_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_erasure_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_data_erasure_requests_isolation ON data_erasure_requests
    USING (organization_id = current_org_id());

-- compliance_decisions uses org_id (nullable); platform-wide decisions with no
-- org are simply invisible under any tenant context, which is correct.
ALTER TABLE compliance_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_decisions FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_compliance_decisions_isolation ON compliance_decisions
    USING (org_id = current_org_id());

ALTER TABLE grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE grievances FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_grievances_isolation ON grievances
    USING (organization_id = current_org_id());

ALTER TABLE settlement_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_offers FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_settlement_offers_isolation ON settlement_offers
    USING (organization_id = current_org_id());

ALTER TABLE fraud_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE fraud_cases FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_fraud_cases_isolation ON fraud_cases
    USING (organization_id = current_org_id());

ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_message_templates_isolation ON message_templates
    USING (organization_id = current_org_id());

ALTER TABLE communication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_communication_logs_isolation ON communication_logs
    USING (organization_id = current_org_id());

ALTER TABLE report_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_report_jobs_isolation ON report_jobs
    USING (organization_id = current_org_id());

ALTER TABLE agent_performance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_performance_snapshots FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_agent_performance_snapshots_isolation ON agent_performance_snapshots
    USING (organization_id = current_org_id());

ALTER TABLE monthly_loan_book_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_loan_book_snapshots FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_monthly_loan_book_snapshots_isolation ON monthly_loan_book_snapshots
    USING (organization_id = current_org_id());

ALTER TABLE borrower_risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrower_risk_scores FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_borrower_risk_scores_isolation ON borrower_risk_scores
    USING (organization_id = current_org_id());

-- app_notifications.organization_id is nullable -- same NULL-is-invisible
-- reasoning as compliance_decisions.org_id above.
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_notifications FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_app_notifications_isolation ON app_notifications
    USING (organization_id = current_org_id());

-- ── Part 3: 7 org-scoped tables omitted from the §3 enumerated list but ────
-- required by §3's stated principle ("every org-scoped table carries
-- organization_id UUID NOT NULL and has RLS enabled"). Column names/
-- nullability confirmed directly against V001__baseline.sql and
-- V024__daily_attendance.sql.
ALTER TABLE key_fact_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_fact_statements FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_key_fact_statements_isolation ON key_fact_statements
    USING (organization_id = current_org_id());

-- daily_attendance uses org_id, not organization_id (see V024__daily_attendance.sql)
ALTER TABLE daily_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attendance FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_daily_attendance_isolation ON daily_attendance
    USING (org_id = current_org_id());

ALTER TABLE grievance_officers ENABLE ROW LEVEL SECURITY;
ALTER TABLE grievance_officers FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_grievance_officers_isolation ON grievance_officers
    USING (organization_id = current_org_id());

ALTER TABLE lsp_disclosures ENABLE ROW LEVEL SECURITY;
ALTER TABLE lsp_disclosures FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_lsp_disclosures_isolation ON lsp_disclosures
    USING (organization_id = current_org_id());

ALTER TABLE column_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE column_schemas FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_column_schemas_isolation ON column_schemas
    USING (organization_id = current_org_id());

ALTER TABLE agent_capacity_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_capacity_config FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_agent_capacity_config_isolation ON agent_capacity_config
    USING (organization_id = current_org_id());

ALTER TABLE holiday_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE holiday_calendar FORCE ROW LEVEL SECURITY;
CREATE POLICY rls_holiday_calendar_isolation ON holiday_calendar
    USING (organization_id = current_org_id());

-- ── Cross-org access: BYPASSRLS role for platform admin / schedulers ──────
-- Per DATABASE_DESIGN.md §3. Application tenant code must never use this
-- role -- only the platform datasource (PlatformOrganizationController,
-- schedulers) connects as it. Requires CREATEROLE privilege to run; if the
-- Flyway migration user lacks it, run this block manually as a superuser
-- instead.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ops_platform') THEN
        CREATE ROLE ops_platform NOLOGIN BYPASSRLS;
    END IF;
END
$$;
