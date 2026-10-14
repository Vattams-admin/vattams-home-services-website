-- Technician onboarding is free: remove the legacy ₹49 registration payment gate.
-- This does not alter job-specific technician call-rate fees or customer checkout prices.
DROP TRIGGER IF EXISTS trg_enforce_technician_registration_fee ON public.technicians;
DROP FUNCTION IF EXISTS public.enforce_technician_registration_fee();

-- Keep the legacy nullable column for compatibility with historical records,
-- but new applications explicitly store NULL and no longer require a payment record.
