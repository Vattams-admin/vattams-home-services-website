-- Bound externally supplied payment references to a practical, indexed-safe size.
-- NOT VALID preserves historical rows while enforcing the rule on all new writes
-- and updates. Existing oversized values can be reviewed before validation.
ALTER TABLE public.wallet_recharges
  ADD CONSTRAINT wallet_recharges_payment_ref_length_check
  CHECK (payment_ref IS NULL OR char_length(payment_ref) <= 255) NOT VALID;

COMMENT ON CONSTRAINT wallet_recharges_payment_ref_length_check
  ON public.wallet_recharges IS
  'Payment references are optional and limited to 255 characters.';
