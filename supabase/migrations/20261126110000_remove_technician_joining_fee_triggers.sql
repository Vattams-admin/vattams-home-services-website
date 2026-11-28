-- Release alongside the fee-free registration API and frontend.
-- These triggers enforce or record the historical joining fee only.
-- Preserve historical payment rows and technician payment columns.
BEGIN;

DROP TRIGGER IF EXISTS trg_enforce_technician_registration_fee ON public.technicians;
DROP TRIGGER IF EXISTS trg_lock_deposit_on_approval ON public.technicians;

COMMIT;
