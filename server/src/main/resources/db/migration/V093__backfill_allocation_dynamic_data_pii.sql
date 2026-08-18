-- SYSTEM-PLAN 35.1 (backfill half): AllocationImportProcessor used to copy the entire raw
-- upload row into allocations.dynamic_data, duplicating borrower_name/ckyc_id/phone/email in
-- plaintext right next to their AES-256-GCM encrypted, dedicated homes (borrower_name on this
-- table; ckyc_id/phone/email on the linked Borrower row). The application-level fix stops new
-- writes from doing this; this migration is the backfill for rows written before that fix -- the
-- part that actually closes the exposure, since a forward-only fix leaves every existing row's
-- plaintext copy in place.
--
-- Runs with no app.current_org_id GUC set on this connection, so rls_allocations_isolation's
-- "OR current_org_id() IS NULL" branch grants it every organization's rows -- no platform-admin
-- bypass call needed (see V010__rls_policies.sql).
--
-- The accepted-spelling list mirrors AllocationImportProcessor.fieldSpecs() (LOAN_NUMBER,
-- BORROWER_NAME, CKYC_ID, PHONE, EMAIL, plus total_due/outstanding/npa) normalised the same way
-- ImportValues.normalize() does in Java: lower-cased, with spaces/underscores/hyphens stripped.
-- Kept in sync by hand because this is a one-time backfill, not code that runs again -- if a new
-- alias is ever added to fieldSpecs(), it does not need to be added here too.
DO $$
DECLARE
    dedicated_names TEXT[] := ARRAY[
        'loannumber', 'loanno',
        'borrowername', 'customername', 'name',
        'ckycid', 'ckycnumber',
        'phone', 'phonenumber', 'mobile', 'mobilenumber', 'contactnumber',
        'email', 'emailaddress',
        'totaldue', 'totalamount',
        'outstanding', 'outstandingamount', 'balance', 'outstandingbalance', 'currentbalance',
        'npa', 'npaflagged', 'isnpa'
    ];
    updated_count INT;
BEGIN
    WITH filtered AS (
        SELECT a.id,
               COALESCE(
                   jsonb_object_agg(kv.key, kv.value) FILTER (
                       WHERE lower(regexp_replace(kv.key, '[ _-]', '', 'g')) <> ALL (dedicated_names)
                   ),
                   '{}'::jsonb
               ) AS new_data
        FROM allocations a
        CROSS JOIN LATERAL jsonb_each(a.dynamic_data) AS kv(key, value)
        WHERE a.dynamic_data IS NOT NULL AND a.dynamic_data <> '{}'::jsonb
        GROUP BY a.id
    )
    UPDATE allocations a
    SET dynamic_data = f.new_data
    FROM filtered f
    WHERE a.id = f.id
      AND a.dynamic_data <> f.new_data;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'V093 PII backfill: stripped dedicated-field keys from dynamic_data on % allocation row(s)', updated_count;
END $$;
