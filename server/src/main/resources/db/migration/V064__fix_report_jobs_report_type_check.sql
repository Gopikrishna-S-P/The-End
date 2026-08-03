-- =============================================================================
-- report_jobs_report_type_check exists in the live schema but was never
-- defined by any Flyway migration (not in V001's CREATE TABLE, not added
-- later) -- schema drift from whenever this table was first created, before
-- Flyway owned it. Whatever created it enumerated 9 of the 11 ReportType
-- enum values; MONTHLY_VISIT_COMPLETION and MIS_EOD were added to the Java
-- enum afterwards and never got backfilled into the DB constraint. Result:
-- ReportingController.enqueueReport() for either of those two report types
-- throws a raw 500 (DataIntegrityViolationException) for every org, every
-- caller, unconditionally -- found while live-verifying the ReportingController
-- isolation fix (selecting "Monthly visit report" in the UI reproduced it).
-- =============================================================================

ALTER TABLE report_jobs DROP CONSTRAINT IF EXISTS report_jobs_report_type_check;
ALTER TABLE report_jobs ADD CONSTRAINT report_jobs_report_type_check
    CHECK (report_type IN (
        'AGENT_PERFORMANCE', 'TEAM_PERFORMANCE', 'AGENCY_PERFORMANCE',
        'DAILY_VISIT_COMPLETION', 'MONTHLY_VISIT_COMPLETION', 'MONTHLY_LOAN_BOOK_SNAPSHOT',
        'NPA_IDENTIFICATION', 'COLLECTION_EFFICIENCY', 'REASSIGNMENT_FREQUENCY',
        'BANK_RECONCILIATION', 'MIS_EOD'
    ));
