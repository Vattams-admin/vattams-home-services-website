-- Update the default recipient for newly created payment records only.
-- Historical payments retain their original UPI ID for auditability.
ALTER TABLE public.payments
  ALTER COLUMN upi_id SET DEFAULT 'venkatesan04051985-5@oksbi';
