-- Protect booking-ops auto-assignment with a per-booking capability.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS booking_action_token uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_action_token
  ON bookings(booking_action_token);
