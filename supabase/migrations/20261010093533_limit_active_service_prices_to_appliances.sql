-- VATTAMS Home Services is narrowing its public offering to three appliance families.
-- Keep legacy rows and historical bookings, but disable legacy services for new bookings.
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

UPDATE public.service_categories
SET active = false
WHERE name NOT IN (
  'AC Repair',
  'AC Service',
  'Washing Machine',
  'Washing Machine Repair',
  'Refrigerator',
  'Refrigerator Repair'
)
AND COALESCE(active, true) = true;
