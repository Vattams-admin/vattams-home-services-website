-- Prevent one bank/UPI transaction reference from being claimed by multiple payments.
-- Existing data was checked for duplicates after trim + case-fold; none were found.
-- Blank strings are excluded so legacy empty values do not collide.
CREATE UNIQUE INDEX IF NOT EXISTS payments_utr_normalized_unique
  ON public.payments (lower(btrim(utr)))
  WHERE utr IS NOT NULL AND btrim(utr) <> '';
