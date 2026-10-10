-- VATTAMS Home Services is narrowing its public offering to three appliance families.
-- Keep legacy price rows for historical bookings, but deactivate them for new bookings.
UPDATE public.service_prices
SET is_active = false
WHERE service_name NOT IN (
  'AC Repair',
  'AC Service',
  'Washing Machine',
  'Washing Machine Repair',
  'Refrigerator',
  'Refrigerator Repair'
)
AND is_active = true;
