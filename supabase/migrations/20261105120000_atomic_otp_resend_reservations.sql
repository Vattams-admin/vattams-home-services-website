-- Atomic OTP resend reservations. A unique key per mobile and purpose serializes
-- concurrent requests; reservation tokens allow safe release on failed delivery.
create table if not exists public.otp_resend_reservations (
  mobile text not null,
  purpose text not null check (purpose in ('registration','forgot_password','technician_registration')),
  reservation_token uuid not null,
  reserved_at timestamptz not null default now(),
  cooldown_until timestamptz not null,
  primary key (mobile, purpose)
);

alter table public.otp_resend_reservations enable row level security;
revoke all on public.otp_resend_reservations from public, anon, authenticated;
grant select, insert, update, delete on public.otp_resend_reservations to service_role;

create or replace function public.reserve_otp_resend(
  p_mobile text,
  p_purpose text,
  p_reservation_token uuid
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_reserved boolean := false;
begin
  if p_mobile is null or p_mobile !~ '^[0-9]{10,15}$'
     or p_purpose not in ('registration','forgot_password','technician_registration')
     or p_reservation_token is null then
    raise exception 'Invalid OTP reservation arguments';
  end if;

  insert into public.otp_resend_reservations
    (mobile, purpose, reservation_token, reserved_at, cooldown_until)
  values
    (p_mobile, p_purpose, p_reservation_token, clock_timestamp(),
     clock_timestamp() + interval '60 seconds')
  on conflict (mobile, purpose) do update
    set reservation_token = excluded.reservation_token,
        reserved_at = excluded.reserved_at,
        cooldown_until = excluded.cooldown_until
    where public.otp_resend_reservations.cooldown_until <= clock_timestamp()
  returning true into v_reserved;

  return coalesce(v_reserved, false);
end;
$$;

create or replace function public.release_otp_resend(
  p_mobile text,
  p_purpose text,
  p_reservation_token uuid
) returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_released boolean := false;
begin
  delete from public.otp_resend_reservations
   where mobile = p_mobile
     and purpose = p_purpose
     and reservation_token = p_reservation_token
  returning true into v_released;
  return coalesce(v_released, false);
end;
$$;

revoke all on function public.reserve_otp_resend(text,text,uuid) from public, anon, authenticated;
revoke all on function public.release_otp_resend(text,text,uuid) from public, anon, authenticated;
grant execute on function public.reserve_otp_resend(text,text,uuid) to service_role;
grant execute on function public.release_otp_resend(text,text,uuid) to service_role;
