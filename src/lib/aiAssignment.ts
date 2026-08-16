import { supabase, Booking, Technician } from './supabase';

export interface AssignmentScore {
  technician: Technician;
  score: number;
  distance: number | null;
  reasons: string[];
}

function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function findBestTechnician(booking: Booking): Promise<AssignmentScore[]> {
  const { data: technicians, error } = await supabase
    .from('technicians')
    .select('*')
    .eq('status', 'active')
    .eq('wallet_locked', false);

  if (error || !technicians || technicians.length === 0) {
    return [];
  }

  const bookingLat = (booking as unknown as { latitude?: number }).latitude;
  const bookingLon = (booking as unknown as { longitude?: number }).longitude;

  const radiusKm = 50;

  const scored: AssignmentScore[] = (technicians as Technician[])
    .map((tech): AssignmentScore | null => {
      const reasons: string[] = [];
      let score = 0;

      if (tech.latitude && tech.longitude && bookingLat && bookingLon) {
        const distance = haversineDistance(bookingLat, bookingLon, tech.latitude, tech.longitude);
        if (distance <= radiusKm) {
          score += Math.max(0, 40 - distance);
          reasons.push(`${distance.toFixed(1)}km away`);
        } else {
          return null;
        }
      } else {
        score += 10;
        reasons.push('Location unknown');
      }

      if (tech.is_online) {
        score += 15;
        reasons.push('Online now');
      }

      if (tech.rating > 0) {
        score += tech.rating * 5;
        reasons.push(`${tech.rating}★ rating`);
      }

      const acceptanceRate = tech.acceptance_rate ?? 100;
      score += acceptanceRate * 0.1;
      reasons.push(`${acceptanceRate.toFixed(0)}% acceptance`);

      const workload = tech.current_workload ?? 0;
      if (workload === 0) {
        score += 20;
        reasons.push('No active jobs');
      } else {
        score -= workload * 5;
      }

      score += Math.min(tech.experience_years * 2, 15);
      reasons.push(`${tech.experience_years}y experience`);

      return { technician: tech, score: Math.round(score), distance: null, reasons };
    })
    .filter((s): s is AssignmentScore => s !== null)
    .sort((a, b) => b.score - a.score);

  return scored;
}

export async function autoAssignTechnician(bookingId: string): Promise<Technician | null> {
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .maybeSingle();

  if (bookingError || !booking) return null;

  const candidates = await findBestTechnician(booking as Booking);
  if (candidates.length === 0) return null;

  const best = candidates[0];

  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      assigned_technician_id: best.technician.id,
      status: 'assigned',
    })
    .eq('id', bookingId);

  if (updateError) {
    console.error('[auto-assign] update error:', updateError);
    return null;
  }

  const { error: jobError } = await supabase.from('technician_jobs').insert({
    booking_id: bookingId,
    technician_id: best.technician.id,
    status: 'assigned',
  });

  if (jobError) {
    console.error('[auto-assign] job insert error:', jobError);
  }

  await supabase
    .from('technicians')
    .update({ current_workload: (best.technician.current_workload ?? 0) + 1 })
    .eq('id', best.technician.id);

  return best.technician;
}

export async function reassignOnRejection(bookingId: string, rejectedTechId: string): Promise<Technician | null> {
  const { error: rejectError } = await supabase
    .from('technician_jobs')
    .update({ status: 'rejected' })
    .eq('booking_id', bookingId)
    .eq('technician_id', rejectedTechId);

  if (rejectError) console.error('[auto-assign] reject update error:', rejectError);

  const { data: tech } = await supabase
    .from('technicians')
    .select('current_workload, acceptance_rate')
    .eq('id', rejectedTechId)
    .maybeSingle();

  if (tech) {
    const newRate = Math.max(0, (tech.acceptance_rate ?? 100) - 5);
    await supabase
      .from('technicians')
      .update({
        current_workload: Math.max(0, (tech.current_workload ?? 0) - 1),
        acceptance_rate: newRate,
      })
      .eq('id', rejectedTechId);
  }

  return autoAssignTechnician(bookingId);
}