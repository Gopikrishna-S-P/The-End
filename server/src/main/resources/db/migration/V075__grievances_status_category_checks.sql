-- grievances.status and grievances.category already had CHECK constraints applied directly to the
-- live dev DB, never captured in any migration (same situation call_logs was in earlier this
-- session -- see V070's header comment). This brings them under Flyway's control. IF EXISTS/DROP+
-- re-ADD makes this idempotent against a DB where they already exist.
ALTER TABLE grievances DROP CONSTRAINT IF EXISTS grievances_status_check;
ALTER TABLE grievances
    ADD CONSTRAINT grievances_status_check CHECK (status IN (
        'RECEIVED', 'ACKNOWLEDGED', 'INVESTIGATING', 'ESCALATED', 'RESOLVED', 'CLOSED'
    ));

ALTER TABLE grievances DROP CONSTRAINT IF EXISTS grievances_category_check;
ALTER TABLE grievances
    ADD CONSTRAINT grievances_category_check CHECK (category IN (
        'HARASSMENT', 'INCORRECT_INFORMATION', 'RECOVERY_PRACTICE', 'DATA_PRIVACY',
        'PAYMENT_DISPUTE', 'OTHER'
    ));
