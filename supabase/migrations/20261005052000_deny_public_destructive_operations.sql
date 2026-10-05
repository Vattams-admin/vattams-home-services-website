-- Remove destructive anonymous policies from Home Services data.
-- Sensitive reads remain on the legacy custom-auth architecture and are
-- handled in the next protected data-access migration; this migration
-- immediately closes unauthenticated destructive operations.
DO $$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT * FROM (VALUES
      ('wallet_transactions','public_insert_wallet_transactions','INSERT'),
      ('wallet_transactions','public_update_wallet_transactions','UPDATE'),
      ('wallet_transactions','public_delete_wallet_transactions','DELETE'),
      ('wallet_recharges','public_delete_wallet_recharges','DELETE'),
      ('technician_jobs','public_delete_technician_jobs','DELETE'),
      ('technicians','public_delete_technicians','DELETE'),
      ('reviews','public_delete_reviews','DELETE'),
      ('support_messages','public_delete_support','DELETE'),
      ('notifications','public_delete_notifications','DELETE'),
      ('technician_notifications','public_delete_technician_notifications','DELETE')
    ) AS v(table_name, policy_name, operation)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', item.policy_name, item.table_name);
    IF item.operation = 'INSERT' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR INSERT TO anon, authenticated WITH CHECK (false)',
        'deny_insert_' || item.table_name || '_public',
        item.table_name
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR %s TO anon, authenticated USING (false)',
        'deny_' || lower(item.operation) || '_' || item.table_name || '_public',
        item.table_name,
        item.operation
      );
    END IF;
  END LOOP;
END $$;
