-- A UTR must belong to at most one payment. This makes the Edge Function's
-- duplicate check safe against concurrent submissions as well as ordinary retries.
-- The current production audit found no duplicate non-empty UTR values.
CREATE UNIQUE INDEX IF NOT EXISTS payments_utr_unique_nonempty_idx
  ON public.payments (utr)
  WHERE utr IS NOT NULL AND btrim(utr) <> '';
