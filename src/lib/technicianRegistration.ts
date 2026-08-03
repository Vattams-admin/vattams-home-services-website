    { label: 'City', done: !!form.city },
    { label: 'Area', done: !!form.area },
    { label: 'PIN Code', done: !!form.pincode },
    { label: 'Service Categories', done: form.service_categories.length > 0 },
    { label: 'Experience', done: !!form.experience_years },
    { label: 'Available Days', done: form.available_days.length > 0 },
    { label: 'Working Time', done: !!form.working_time },
    { label: 'Vehicle Info', done: form.has_vehicle !== null },
    { label: 'Tools Info', done: form.has_tools !== null },    { label: 'Bank Details', done: !!form.bank_account_number && !!form.bank_ifsc },
    { label: 'UPI ID', done: !!form.upi_id },
  ];
  const completed = checks.filter((c) => c.done).length;
  const score = Math.round((completed / checks.length) * 100);
  const missing = checks.filter((c) => !c.done).map((c) => c.label);
  return { score, missing };
}

export async function uploadDocument(file: File, technicianMobile: string, docType: string): Promise<string> {
  const ext = file.name.split('.').pop();
  const fileName = `${technicianMobile}/${docType}.${ext}`;
  const { error } = await supabase.storage.from('technician-docs').upload(fileName, file, { upsert: true });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from('technician-docs').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function submitTechnicianApplication(form: TechnicianFormData): Promise<{ technician: { id: string; full_name: string; mobile: string } }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? (window as any).__SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? (window as any).__SUPABASE_ANON_KEY;

  const { score } = calculateProfileScore(form);

  const response = await fetch(`${supabaseUrl}/functions/v1/technician-auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anonKey}` },
    body: JSON.stringify({
      full_name: form.full_name,
      mobile: form.mobile,
      email: form.email || null,
      city: form.city,
      password: form.password,
      whatsapp_number: form.whatsapp_number,
      area: form.area,
      pincode: form.pincode,
      specializations: form.service_categories,
      experience_years: Number(form.experience_years) || 0,
      available_days: form.available_days,
      working_time: form.working_time,
      has_vehicle: form.has_vehicle ?? false,
      has_tools: form.has_tools ?? false,
      aadhaar_url: form.aadhaar_url,
      pan_url: form.pan_url,
      dl_url: form.dl_url || null,
      profile_photo_url: form.profile_photo_url,
      bank_name: form.bank_name,
      bank_holder_name: form.bank_holder_name,
      bank_account_number: form.bank_account_number,
      bank_ifsc: form.bank_ifsc,
      upi_id: form.upi_id || null,
      profile_score: score,
      mobile_verified: form.mobile_verified,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Registration failed' }));
    throw new Error(err.error || 'Registration failed');
  }
  return response.json();
}
