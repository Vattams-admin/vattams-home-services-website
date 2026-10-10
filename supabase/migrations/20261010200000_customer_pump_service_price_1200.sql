-- Customer-facing price for AC pump water service.
-- This is the customer service charge, separate from the technician's platform call-rate fee.
UPDATE public.customer_service_prices
SET base_price = 1200,
    price_label = 'AC pump water service',
    is_active = true,
    updated_at = now()
WHERE service_type = 'Pump Water Service'
  AND service_category IN ('AC Service', 'AC Repair');

-- Fail visibly during migration if either supported AC category is missing its price row.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM public.customer_service_prices
      WHERE service_type = 'Pump Water Service'
        AND service_category IN ('AC Service', 'AC Repair')
        AND base_price = 1200
        AND is_active = true) <> 2 THEN
    RAISE EXCEPTION 'Expected AC Service and AC Repair pump water service prices at ₹1200';
  END IF;
END $$;
