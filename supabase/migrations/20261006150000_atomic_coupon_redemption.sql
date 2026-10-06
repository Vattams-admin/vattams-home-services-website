-- Make coupon redemption a single transactional, server-owned operation.
-- The old increment_coupon_usage RPC was publicly executable and could be
-- abused to inflate usage counters without a real redemption.
CREATE UNIQUE INDEX IF NOT EXISTS coupon_redemptions_booking_id_key
  ON coupon_redemptions (booking_id);

CREATE OR REPLACE FUNCTION redeem_coupon_atomic(
  p_coupon_id uuid,
  p_booking_id uuid,
  p_customer_id uuid,
  p_discount_amount numeric
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_rows integer;
BEGIN
  IF p_discount_amount IS NULL OR p_discount_amount < 0 THEN
    RETURN false;
  END IF;

  -- A booking can consume a coupon only once. This check is backed by the
  -- unique index as the final concurrency guard.
  IF EXISTS (
    SELECT 1
    FROM coupon_redemptions
    WHERE booking_id = p_booking_id
  ) THEN
    RETURN false;
  END IF;

  -- Atomically reserve one usage slot. The row lock makes concurrent
  -- redemptions serialize, and the conditional max_uses check prevents
  -- over-redemption.
  UPDATE coupons
  SET used_count = used_count + 1,
      updated_at = now()
  WHERE id = p_coupon_id
    AND is_active = true
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now())
    AND (max_uses IS NULL OR used_count < max_uses);

  GET DIAGNOSTICS updated_rows = ROW_COUNT;
  IF updated_rows <> 1 THEN
    RETURN false;
  END IF;

  -- If this insert fails (including the unique booking guard), the whole
  -- function transaction rolls back, including the usage increment.
  INSERT INTO coupon_redemptions (
    coupon_id,
    booking_id,
    customer_id,
    discount_amount
  ) VALUES (
    p_coupon_id,
    p_booking_id,
    p_customer_id,
    p_discount_amount
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION redeem_coupon_atomic(uuid, uuid, uuid, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION redeem_coupon_atomic(uuid, uuid, uuid, numeric) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION redeem_coupon_atomic(uuid, uuid, uuid, numeric) TO service_role;

-- Retire the legacy public RPC: it could increment a coupon counter without
-- creating a redemption record.
REVOKE ALL ON FUNCTION increment_coupon_usage(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION increment_coupon_usage(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_coupon_usage(uuid) TO service_role;
