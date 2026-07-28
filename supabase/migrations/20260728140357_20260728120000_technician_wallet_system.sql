/*
# Technician Wallet & Security Deposit System

1. New Columns on `technicians`
   - `wallet_balance` (numeric, default 0) — total wallet balance
   - `locked_deposit` (numeric, default 0) — security deposit currently locked
   - `available_balance` (numeric, default 0) — wallet_balance - locked_deposit - commission_due
   - `commission_due` (numeric, default 0) — accumulated commission owed to platform
   - `deposit_released` (boolean, default false) — whether the deposit has been released
   - `completed_jobs_count` (int, default 0) — count of completed jobs
   - `wallet_locked` (boolean, default false) — whether the account is locked
   - `registration_fee_paid` (boolean, default false) — whether the fee was paid

2. New Tables
   - `wallet_transactions` — every wallet movement
   - `wallet_recharges` — recharge requests, approved by admin
   - `technician_notifications` — notifications shown to technicians
   - `wallet_settings` — platform-level settings

3. Triggers
   - lock_deposit_on_approval: locks ₹50 when admin approves technician
   - process_booking_completion: deducts commission, releases deposit after 3 jobs, locks account if commission_due > ₹500
   - process_recharge_approval: credits wallet, auto-unlocks if commission_due drops below threshold

4. Security: RLS on all new tables, anon+authenticated CRUD
*/

-- ============ Add wallet columns to technicians ============
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='technicians' AND column_name='wallet_balance') THEN
    ALTER TABLE technicians ADD COLUMN wallet_balance numeric(12,2) NOT NULL DEFAULT 0;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='technicians' AND column_name='locked_deposit') THEN
    ALTER TABLE technicians ADD COLUMN locked_deposit numeric(12,2) NOT NULL DEFAULT 0;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='technicians' AND column_name='available_balance') THEN
    ALTER TABLE technicians ADD COLUMN available_balance numeric(12,2) NOT NULL DEFAULT 0;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='technicians' AND column_name='commission_due') THEN
    ALTER TABLE technicians ADD COLUMN commission_due numeric(12,2) NOT NULL DEFAULT 0;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='technicians' AND column_name='deposit_released') THEN
    ALTER TABLE technicians ADD COLUMN deposit_released boolean NOT NULL DEFAULT false;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='technicians' AND column_name='completed_jobs_count') THEN
    ALTER TABLE technicians ADD COLUMN completed_jobs_count int NOT NULL DEFAULT 0;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='technicians' AND column_name='wallet_locked') THEN
    ALTER TABLE technicians ADD COLUMN wallet_locked boolean NOT NULL DEFAULT false;
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='technicians' AND column_name='registration_fee_paid') THEN
    ALTER TABLE technicians ADD COLUMN registration_fee_paid boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- ============ Wallet Settings table ============
CREATE TABLE IF NOT EXISTS wallet_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_fee numeric(12,2) NOT NULL DEFAULT 50,
  commission_rate numeric(5,2) NOT NULL DEFAULT 10.00,
  deposit_release_job_threshold int NOT NULL DEFAULT 3,
  lock_threshold numeric(12,2) NOT NULL DEFAULT 500,
  low_balance_threshold numeric(12,2) NOT NULL DEFAULT 100,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wallet_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_wallet_settings" ON wallet_settings;
CREATE POLICY "public_select_wallet_settings" ON wallet_settings FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_wallet_settings" ON wallet_settings;
CREATE POLICY "public_insert_wallet_settings" ON wallet_settings FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_wallet_settings" ON wallet_settings;
CREATE POLICY "public_update_wallet_settings" ON wallet_settings FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_wallet_settings" ON wallet_settings;
CREATE POLICY "public_delete_wallet_settings" ON wallet_settings FOR DELETE
TO anon, authenticated USING (true);

INSERT INTO wallet_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM wallet_settings LIMIT 1);

-- ============ Wallet Transactions table ============
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('registration_fee','deposit_lock','deposit_release','commission_deduction','recharge_credit','recharge_debit','adjustment')),
  amount numeric(12,2) NOT NULL,
  balance_after numeric(12,2),
  description text,
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  recharge_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_tech ON wallet_transactions(technician_id, created_at DESC);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_wallet_transactions" ON wallet_transactions;
CREATE POLICY "public_select_wallet_transactions" ON wallet_transactions FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_wallet_transactions" ON wallet_transactions;
CREATE POLICY "public_insert_wallet_transactions" ON wallet_transactions FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_wallet_transactions" ON wallet_transactions;
CREATE POLICY "public_update_wallet_transactions" ON wallet_transactions FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_wallet_transactions" ON wallet_transactions;
CREATE POLICY "public_delete_wallet_transactions" ON wallet_transactions FOR DELETE
TO anon, authenticated USING (true);

-- ============ Wallet Recharges table ============
CREATE TABLE IF NOT EXISTS wallet_recharges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  payment_ref text,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  approved_by text
);

CREATE INDEX IF NOT EXISTS idx_wallet_recharges_tech ON wallet_recharges(technician_id, created_at DESC);

ALTER TABLE wallet_recharges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_wallet_recharges" ON wallet_recharges;
CREATE POLICY "public_select_wallet_recharges" ON wallet_recharges FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_wallet_recharges" ON wallet_recharges;
CREATE POLICY "public_insert_wallet_recharges" ON wallet_recharges FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_wallet_recharges" ON wallet_recharges;
CREATE POLICY "public_update_wallet_recharges" ON wallet_recharges FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_wallet_recharges" ON wallet_recharges;
CREATE POLICY "public_delete_wallet_recharges" ON wallet_recharges FOR DELETE
TO anon, authenticated USING (true);

-- ============ Technician Notifications table ============
CREATE TABLE IF NOT EXISTS technician_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('registration_fee','deposit_released','wallet_low','account_locked','account_unlocked','recharge_approved','commission_deducted')),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tech_notifications_tech ON technician_notifications(technician_id, created_at DESC);

ALTER TABLE technician_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_technician_notifications" ON technician_notifications;
CREATE POLICY "public_select_technician_notifications" ON technician_notifications FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_technician_notifications" ON technician_notifications;
CREATE POLICY "public_insert_technician_notifications" ON technician_notifications FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_update_technician_notifications" ON technician_notifications;
CREATE POLICY "public_update_technician_notifications" ON technician_notifications FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_technician_notifications" ON technician_notifications;
CREATE POLICY "public_delete_technician_notifications" ON technician_notifications FOR DELETE
TO anon, authenticated USING (true);

-- ============ Helper: recalc available_balance ============
CREATE OR REPLACE FUNCTION recalc_available_balance(tech_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  t record;
BEGIN
  SELECT wallet_balance, locked_deposit, commission_due INTO t
  FROM technicians WHERE id = tech_id;

  IF t.wallet_balance IS NOT NULL THEN
    UPDATE technicians
    SET available_balance = GREATEST(t.wallet_balance - t.locked_deposit - t.commission_due, 0)
    WHERE id = tech_id;
  END IF;
END;
$$;

-- ============ Trigger: Lock deposit on technician approval ============
CREATE OR REPLACE FUNCTION lock_deposit_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings record;
BEGIN
  IF NEW.status = 'active' AND OLD.status <> 'active' AND NOT COALESCE(NEW.registration_fee_paid, false) THEN
    SELECT * INTO settings FROM wallet_settings LIMIT 1;

    UPDATE technicians
    SET
      locked_deposit = settings.registration_fee,
      wallet_balance = wallet_balance + settings.registration_fee,
      registration_fee_paid = true
    WHERE id = NEW.id;

    INSERT INTO wallet_transactions (technician_id, type, amount, description)
    VALUES (NEW.id, 'registration_fee', settings.registration_fee, 'Registration fee received — security deposit locked');

    INSERT INTO wallet_transactions (technician_id, type, amount, description)
    VALUES (NEW.id, 'deposit_lock', settings.registration_fee, 'Security deposit locked');

    INSERT INTO technician_notifications (technician_id, type, title, message)
    VALUES (
      NEW.id, 'registration_fee', 'Registration Fee Received',
      'Your Rs ' || settings.registration_fee || ' registration fee has been received and locked as a security deposit. It will be released after you complete 3 jobs.'
    );

    PERFORM recalc_available_balance(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_deposit_on_approval ON technicians;
CREATE TRIGGER trg_lock_deposit_on_approval
  AFTER UPDATE ON technicians
  FOR EACH ROW
  EXECUTE FUNCTION lock_deposit_on_approval();

-- ============ Trigger: Process booking completion ============
CREATE OR REPLACE FUNCTION process_booking_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tech_id uuid;
  settings record;
  commission_amount numeric(12,2);
  booking_amount numeric(12,2);
  completed_count int;
  deposit_released_already boolean;
  w_balance numeric(12,2);
  c_due numeric(12,2);
  l_deposit numeric(12,2);
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    tech_id := NEW.assigned_technician_id;
    IF tech_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT * INTO settings FROM wallet_settings LIMIT 1;

    booking_amount := COALESCE(NEW.amount, 0);

    IF booking_amount > 0 THEN
      commission_amount := GREATEST(ROUND((booking_amount * settings.commission_rate / 100), 2), 10);
    ELSE
      commission_amount := 0;
    END IF;

    IF commission_amount > 0 THEN
      UPDATE technicians
      SET
        wallet_balance = wallet_balance - commission_amount,
        commission_due = commission_due + commission_amount
      WHERE id = tech_id;

      INSERT INTO wallet_transactions (technician_id, type, amount, booking_id, description)
      VALUES (tech_id, 'commission_deduction', commission_amount, NEW.id,
        'Commission ' || settings.commission_rate || '% for booking ' || NEW.booking_number);

      INSERT INTO technician_notifications (technician_id, type, title, message)
      VALUES (tech_id, 'commission_deducted', 'Commission Deducted',
        'Rs ' || commission_amount || ' commission deducted for completing booking ' || NEW.booking_number);
    END IF;

    UPDATE technicians
    SET completed_jobs_count = completed_jobs_count + 1,
        total_jobs = total_jobs + 1
    WHERE id = tech_id;

    SELECT completed_jobs_count, deposit_released, wallet_balance, commission_due, locked_deposit
    INTO completed_count, deposit_released_already, w_balance, c_due, l_deposit
    FROM technicians WHERE id = tech_id;

    IF completed_count >= settings.deposit_release_job_threshold AND NOT deposit_released_already THEN
      UPDATE technicians
      SET locked_deposit = 0, deposit_released = true
      WHERE id = tech_id;

      INSERT INTO wallet_transactions (technician_id, type, amount, description)
      VALUES (tech_id, 'deposit_release', settings.registration_fee,
        'Security deposit released after completing ' || completed_count || ' jobs');

      INSERT INTO technician_notifications (technician_id, type, title, message)
      VALUES (tech_id, 'deposit_released', 'Security Deposit Released',
        'Congratulations! Your Rs ' || settings.registration_fee || ' security deposit has been released after completing ' || completed_count || ' jobs.');
    END IF;

    SELECT commission_due, wallet_balance INTO c_due, w_balance FROM technicians WHERE id = tech_id;

    IF c_due > settings.lock_threshold THEN
      UPDATE technicians SET wallet_locked = true WHERE id = tech_id AND COALESCE(wallet_locked, false) = false;

      IF FOUND THEN
        INSERT INTO technician_notifications (technician_id, type, title, message)
        VALUES (tech_id, 'account_locked', 'Account Locked',
          'Your account has been temporarily locked. Please recharge your wallet to continue. Commission due: Rs ' || c_due);
      END IF;
    END IF;

    SELECT wallet_balance, locked_deposit, commission_due INTO w_balance, l_deposit, c_due
    FROM technicians WHERE id = tech_id;

    IF (w_balance - l_deposit - c_due) < settings.low_balance_threshold THEN
      INSERT INTO technician_notifications (technician_id, type, title, message)
      VALUES (tech_id, 'wallet_low', 'Wallet Balance Low',
        'Your available wallet balance is below Rs ' || settings.low_balance_threshold || '. Please recharge to avoid account lock.');
    END IF;

    PERFORM recalc_available_balance(tech_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_process_booking_completion ON bookings;
CREATE TRIGGER trg_process_booking_completion
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION process_booking_completion();

-- ============ Trigger: Process recharge approval ============
CREATE OR REPLACE FUNCTION process_recharge_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  settings record;
  c_due numeric(12,2);
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    SELECT * INTO settings FROM wallet_settings LIMIT 1;

    UPDATE technicians
    SET wallet_balance = wallet_balance + NEW.amount
    WHERE id = NEW.technician_id;

    INSERT INTO wallet_transactions (technician_id, type, amount, recharge_id, description)
    VALUES (NEW.technician_id, 'recharge_credit', NEW.amount, NEW.id,
      'Wallet recharged by Rs ' || NEW.amount || ' (approved by admin)');

    SELECT commission_due INTO c_due FROM technicians WHERE id = NEW.technician_id;

    IF c_due <= settings.lock_threshold THEN
      UPDATE technicians SET wallet_locked = false WHERE id = NEW.technician_id AND wallet_locked = true;

      IF FOUND THEN
        INSERT INTO technician_notifications (technician_id, type, title, message)
        VALUES (New.technician_id, 'account_unlocked', 'Account Unlocked',
          'Your account has been unlocked after recharge. You can now receive new bookings.');
      END IF;
    END IF;

    INSERT INTO technician_notifications (technician_id, type, title, message)
    VALUES (NEW.technician_id, 'recharge_approved', 'Recharge Approved',
      'Your wallet recharge of Rs ' || NEW.amount || ' has been approved and credited to your account.');

    PERFORM recalc_available_balance(NEW.technician_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_process_recharge_approval ON wallet_recharges;
CREATE TRIGGER trg_process_recharge_approval
  AFTER UPDATE ON wallet_recharges
  FOR EACH ROW
  EXECUTE FUNCTION process_recharge_approval();

-- ============ Backfill existing approved technician ============
DO $$
DECLARE
  settings record;
  existing_tech record;
BEGIN
  SELECT * INTO settings FROM wallet_settings LIMIT 1;

  FOR existing_tech IN SELECT id FROM technicians WHERE status = 'active' AND COALESCE(registration_fee_paid, false) = false
  LOOP
    UPDATE technicians
    SET
      locked_deposit = settings.registration_fee,
      wallet_balance = wallet_balance + settings.registration_fee,
      registration_fee_paid = true
    WHERE id = existing_tech.id;

    INSERT INTO wallet_transactions (technician_id, type, amount, description)
    VALUES (existing_tech.id, 'registration_fee', settings.registration_fee, 'Registration fee received — security deposit locked (backfill)');

    INSERT INTO wallet_transactions (technician_id, type, amount, description)
    VALUES (existing_tech.id, 'deposit_lock', settings.registration_fee, 'Security deposit locked (backfill)');

    INSERT INTO technician_notifications (technician_id, type, title, message)
    VALUES (
      existing_tech.id, 'registration_fee', 'Registration Fee Received',
      'Your Rs ' || settings.registration_fee || ' registration fee has been received and locked as a security deposit. It will be released after you complete 3 jobs.'
    );

    PERFORM recalc_available_balance(existing_tech.id);
  END LOOP;
END $$;