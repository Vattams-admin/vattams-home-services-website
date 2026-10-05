create extension if not exists pgcrypto;

create table if not exists public.customer_auth_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_customer_auth_sessions_token on public.customer_auth_sessions(token);
create index if not exists idx_customer_auth_sessions_customer_id on public.customer_auth_sessions(customer_id);
create index if not exists idx_customer_auth_sessions_expires_at on public.customer_auth_sessions(expires_at);
alter table public.customer_auth_sessions enable row level security;
revoke all on public.customer_auth_sessions from anon, authenticated;

create table if not exists public.technician_auth_sessions (
  id uuid primary key default gen_random_uuid(),
  technician_id uuid not null references public.technicians(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_technician_auth_sessions_token on public.technician_auth_sessions(token);
create index if not exists idx_technician_auth_sessions_technician_id on public.technician_auth_sessions(technician_id);
create index if not exists idx_technician_auth_sessions_expires_at on public.technician_auth_sessions(expires_at);
alter table public.technician_auth_sessions enable row level security;
revoke all on public.technician_auth_sessions from anon, authenticated;
