import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SupabaseClient {
  from: (table: string) => {
    select: (columns: string) => { eq: (col: string, val: unknown) => { maybeSingle: () => Promise<{ data: unknown; error: unknown }> } };
    update: (data: Record<string, unknown>) => { eq: (col: string, val: unknown) => Promise<{ error: unknown }> };
    insert: (data: Record<string, unknown>) => { select: (columns: string) => { single: () => Promise<{ data: unknown; error: unknown }> } };
  };
}

function generateOTP(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { action, booking_id, technician_id, otp, purpose, status } = await req.json();

    if (action === "assign_booking") {
      // First-accept assignment: first technician to accept gets the booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", booking_id)
        .maybeSingle() as { data: Record<string, unknown> | null; error: unknown };

      if (bookingError || !booking) {
        return new Response(JSON.stringify({ error: "Booking not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (booking.status !== "pending" && booking.status !== "confirmed") {
        return new Response(JSON.stringify({ error: "Booking already assigned" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Block technicians who owe platform fee + GST + commission from a previous job
      const { data: techRow, error: techError } = await supabase
        .from("technicians")
        .select("wallet_locked, commission_due")
        .eq("id", technician_id)
        .maybeSingle() as { data: { wallet_locked: boolean; commission_due: number } | null; error: unknown };

      if (techError || !techRow) {
        return new Response(JSON.stringify({ error: "Technician not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (techRow.wallet_locked) {
        return new Response(JSON.stringify({
          error: `Account locked. Please pay Rs ${techRow.commission_due} (platform fee + GST + commission) from your last job before accepting a new one.`,
        }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if technician has an active job
      const { data: activeJobs } = await supabase
        .from("technician_jobs")
        .select("id")
        .eq("technician_id", technician_id)
        .in("status", ["assigned", "accepted", "on_the_way", "in_progress", "job_started"]) as { data: unknown[] | null; error: unknown };

      if (activeJobs && activeJobs.length > 0) {
        return new Response(JSON.stringify({ error: "You have an active job. Complete it first." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Assign the booking
      await supabase.from("bookings").update({
        assigned_technician_id: technician_id,
        status: "assigned",
        updated_at: new Date().toISOString(),
      }).eq("id", booking_id);

      // Create technician_job
      const { data: jobData, error: jobError } = await supabase
        .from("technician_jobs")
        .insert({
          booking_id,
          technician_id,
          status: "assigned",
        })
        .select("*")
        .single() as { data: Record<string, unknown> | null; error: unknown };

      // Remove from other technicians' view by updating booking status
      // (Other technicians will no longer see it as "pending")

      return new Response(JSON.stringify({
        success: true,
        job: jobData,
        error: jobError,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate_otp") {
      // Generate OTP for start or complete job
      const otpCode = generateOTP();
      const column = purpose === "start" ? "start_otp" : "complete_otp";

      await supabase.from("bookings").update({
        [column]: otpCode,
        updated_at: new Date().toISOString(),
      }).eq("id", booking_id);

      return new Response(JSON.stringify({
        success: true,
        otp: otpCode,
        purpose,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify_otp") {
      const { data: booking } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", booking_id)
        .maybeSingle() as { data: Record<string, unknown> | null; error: unknown };

      if (!booking) {
        return new Response(JSON.stringify({ error: "Booking not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const storedOTP = purpose === "start" ? booking.start_otp : booking.complete_otp;

      if (storedOTP !== otp) {
        return new Response(JSON.stringify({ error: "Invalid OTP" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update booking status based on purpose
      const now = new Date().toISOString();
      if (purpose === "start") {
        await supabase.from("bookings").update({
          status: "job_started",
          otp_verified_at: now,
          job_started_at: now,
          updated_at: now,
        }).eq("id", booking_id);
      } else {
        await supabase.from("bookings").update({
          status: "job_completed",
          job_completed_at: now,
          updated_at: now,
        }).eq("id", booking_id);
      }

      return new Response(JSON.stringify({
        success: true,
        verified: true,
        purpose,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_status") {
      await supabase.from("bookings").update({
        status,
        updated_at: new Date().toISOString(),
      }).eq("id", booking_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
/*
# Commission Model Update + Pay-Per-Job Lock + A-Z Service Catalog

1. Pricing changes
   - service_prices.platform_fee default -> 60 (charged to customer)
   - service_prices.commission_rate default -> 20% (technician's cut to platform)
   - Existing active rows updated to the new platform_fee/commission_rate

2. Wallet policy change
   - wallet_settings.commission_rate -> 20
   - wallet_settings.lock_threshold -> 0 (technician must clear dues after
     EVERY completed job before they can be assigned another one, instead of
     accumulating a buffer)

3. process_booking_completion rewritten
   - Technician physically collects the full total amount from the customer
     (base price + GST + platform fee) at the job site.
   - What they owe back to the platform per job = platform_fee + gst_amount +
     commission_amount, using the exact figures stored on the booking itself
     (calculated at booking time from service_prices), not recomputed from
     the total.
   - Account locks immediately once commission_due > 0 (lock_threshold),
     forcing payment before the next job can be assigned.

4. A-Z service catalog
   - Adds a broad set of home-service categories spanning most letters of
     the alphabet, each with a matching service_prices row.
*/

-- ============ 1. Update service_prices defaults + existing rows ============
ALTER TABLE service_prices ALTER COLUMN platform_fee SET DEFAULT 60;
ALTER TABLE service_prices ALTER COLUMN commission_rate SET DEFAULT 20.00;

UPDATE service_prices SET platform_fee = 60, commission_rate = 20.00;

-- ============ 2. Update wallet settings ============
UPDATE wallet_settings SET commission_rate = 20.00, lock_threshold = 0;

-- ============ 3. Rewrite process_booking_completion ============
CREATE OR REPLACE FUNCTION process_booking_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tech_id uuid;
  settings record;
  due_amount numeric(12,2);
  completed_count int;
  deposit_released_already boolean;
  w_balance numeric(12,2);
  c_due numeric(12,2);
  l_deposit numeric(12,2);
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    tech_id := NEW.assigned_technician_id;
    IF tech_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT * INTO settings FROM wallet_settings LIMIT 1;

    -- Technician collects the FULL total from the customer (base + GST +
    -- platform fee). What they owe back is everything except their own
    -- net service earnings: platform_fee + gst_amount + commission_amount.
    due_amount := COALESCE(NEW.platform_fee, 0) + COALESCE(NEW.gst_amount, 0) + COALESCE(NEW.commission_amount, 0);

    IF due_amount > 0 THEN
      UPDATE technicians
      SET
        wallet_balance = wallet_balance - due_amount,
        commission_due = commission_due + due_amount
      WHERE id = tech_id;

      INSERT INTO wallet_transactions (technician_id, type, amount, booking_id, description)
      VALUES (tech_id, 'commission_deduction', due_amount, NEW.id,
        'Platform fee + GST + ' || settings.commission_rate || '% commission due for booking ' || NEW.booking_number);

      INSERT INTO technician_notifications (technician_id, type, title, message)
      VALUES (tech_id, 'commission_deducted', 'Payment Due to Platform',
        'Rs ' || due_amount || ' (platform fee + GST + commission) is due for booking ' || NEW.booking_number || '. Pay this to unlock your next job.');
    END IF;

    UPDATE technicians
    SET completed_jobs_count = completed_jobs_count + 1,
        total_jobs = total_jobs + 1
    WHERE id = tech_id;

    SELECT completed_jobs_count, deposit_released, wallet_balance, commission_due, locked_deposit
    INTO completed_count, deposit_released_already, w_balance, c_due, l_deposit
    FROM technicians WHERE id = tech_id;

    IF completed_count >= settings.deposit_release_job_threshold AND NOT deposit_released_already THEN
      UPDATE technicians
      SET locked_deposit = 0, deposit_released = true
      WHERE id = tech_id;

      INSERT INTO wallet_transactions (technician_id, type, amount, description)
      VALUES (tech_id, 'deposit_release', settings.registration_fee,
        'Security deposit released after completing ' || completed_count || ' jobs');

      INSERT INTO technician_notifications (technician_id, type, title, message)
      VALUES (tech_id, 'deposit_released', 'Security Deposit Released',
        'Congratulations! Your Rs ' || settings.registration_fee || ' security deposit has been released after completing ' || completed_count || ' jobs.');
    END IF;

    -- Pay-per-job lock: account locks immediately once anything is due.
    SELECT commission_due, wallet_balance INTO c_due, w_balance FROM technicians WHERE id = tech_id;

    IF c_due > settings.lock_threshold THEN
      UPDATE technicians SET wallet_locked = true WHERE id = tech_id AND COALESCE(wallet_locked, false) = false;

      IF FOUND THEN
        INSERT INTO technician_notifications (technician_id, type, title, message)
        VALUES (tech_id, 'account_locked', 'Account Locked — Payment Due',
          'Please pay Rs ' || c_due || ' (platform fee + GST + commission) to unlock new job assignments.');
      END IF;
    END IF;

    SELECT wallet_balance, locked_deposit, commission_due INTO w_balance, l_deposit, c_due
    FROM technicians WHERE id = tech_id;

    IF (w_balance - l_deposit - c_due) < settings.low_balance_threshold THEN
      INSERT INTO technician_notifications (technician_id, type, title, message)
      VALUES (tech_id, 'wallet_low', 'Wallet Balance Low',
        'Your available wallet balance is below Rs ' || settings.low_balance_threshold || '. Please recharge to avoid account lock.');
    END IF;

    PERFORM recalc_available_balance(tech_id);
  END IF;

  RETURN NEW;
END;
$$;

-- ============ 4. A-Z service catalog ============
-- Insert categories that don't already exist (matched by name)
INSERT INTO service_categories (name, description, icon, price_range)
SELECT v.name, v.description, v.icon, v.price_range
FROM (VALUES
  ('AC Repair', 'Diagnosis and repair for all AC brands and types', 'wind', '₹299 - ₹1999'),
  ('Bathroom Fitting', 'Tap, shower, and bathroom fixture installation and repair', 'droplets', '₹299 - ₹1499'),
  ('Carpenter Services', 'Furniture repair, door/window fitting, and custom woodwork', 'hammer', '₹299 - ₹2499'),
  ('CCTV Installation', 'Camera setup, wiring, and mobile app configuration', 'camera', '₹999 - ₹4999'),
  ('Deep Cleaning', 'Full home or apartment deep cleaning service', 'sparkles', '₹1499 - ₹4999'),
  ('Electrician Services', 'Wiring, switchboards, fan and light installation, repairs', 'zap', '₹199 - ₹1499'),
  ('Furniture Assembly', 'Flat-pack and modular furniture assembly', 'wrench', '₹299 - ₹1499'),
  ('Gardening & Landscaping', 'Lawn care, planting, and garden maintenance', 'sprout', '₹399 - ₹2499'),
  ('Home Appliance Repair', 'General repair for small and large home appliances', 'plug', '₹299 - ₹1999'),
  ('Interior Painting', 'Wall painting, touch-ups, and full room painting', 'paintbrush', '₹1999 - ₹9999'),
  ('Kitchen Chimney Repair', 'Chimney cleaning, motor repair, and servicing', 'flame', '₹399 - ₹1999'),
  ('Laundry & Dry Cleaning', 'Pickup, wash, and doorstep delivery service', 'shirt', '₹99 - ₹999'),
  ('Microwave Repair', 'Microwave oven repair and maintenance', 'microwave', '₹299 - ₹1499'),
  ('Oven Repair', 'OTG and built-in oven repair and servicing', 'flame', '₹299 - ₹1499'),
  ('Pest Control', 'Cockroach, termite, and general pest treatment', 'bug', '₹499 - ₹2999'),
  ('Plumbing Services', 'Pipe leaks, fittings, and bathroom plumbing work', 'droplets', '₹199 - ₹1499'),
  ('Refrigerator Repair', 'Expert repair for all refrigerator types and brands', 'refrigerator', '₹299 - ₹1999'),
  ('RO Water Purifier', 'Filter replacement, servicing, and installation', 'droplets', '₹399 - ₹1999'),
  ('Sofa & Carpet Cleaning', 'Deep cleaning for sofas, carpets, and upholstery', 'sparkles', '₹499 - ₹2999'),
  ('TV Mounting & Repair', 'Wall mounting, screen repair, and diagnostics', 'tv', '₹299 - ₹2499'),
  ('UPS & Inverter Repair', 'Battery, inverter, and UPS diagnosis and repair', 'battery-charging', '₹399 - ₹1999'),
  ('Ventilation & Exhaust Fan Repair', 'Exhaust fan and ventilation system repair', 'fan', '₹199 - ₹999'),
  ('Washing Machine Repair', 'Front-load and top-load washing machine repairs', 'rotate-cw', '₹299 - ₹1999'),
  ('Water Heater Repair', 'Geyser and water heater repair services', 'thermometer', '₹299 - ₹1499'),
  ('Water Tank Cleaning', 'Overhead and underground water tank cleaning', 'droplets', '₹499 - ₹2499')
) AS v(name, description, icon, price_range)
WHERE NOT EXISTS (
  SELECT 1 FROM service_categories sc WHERE sc.name = v.name
);

-- Matching service_prices rows (base price parsed from the low end of each range)
INSERT INTO service_prices (service_name, base_price, gst_rate, platform_fee, commission_rate, is_active)
SELECT v.name, v.base_price, 18.00, 60, 20.00, true
FROM (VALUES
  ('AC Repair', 299),
  ('Bathroom Fitting', 299),
  ('Carpenter Services', 299),
  ('CCTV Installation', 999),
  ('Deep Cleaning', 1499),
  ('Electrician Services', 199),
  ('Furniture Assembly', 299),
  ('Gardening & Landscaping', 399),
  ('Home Appliance Repair', 299),
  ('Interior Painting', 1999),
  ('Kitchen Chimney Repair', 399),
  ('Laundry & Dry Cleaning', 99),
  ('Microwave Repair', 299),
  ('Oven Repair', 299),
  ('Pest Control', 499),
  ('Plumbing Services', 199),
  ('Refrigerator Repair', 299),
  ('RO Water Purifier', 399),
  ('Sofa & Carpet Cleaning', 499),
  ('TV Mounting & Repair', 299),
  ('UPS & Inverter Repair', 399),
  ('Ventilation & Exhaust Fan Repair', 199),
  ('Washing Machine Repair', 299),
  ('Water Heater Repair', 299),
  ('Water Tank Cleaning', 499)
) AS v(name, base_price)
WHERE NOT EXISTS (
  SELECT 1 FROM service_prices sp WHERE sp.service_name = v.name
);