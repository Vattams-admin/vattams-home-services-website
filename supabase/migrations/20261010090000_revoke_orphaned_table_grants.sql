-- These legacy tables have RLS enabled but deliberately have no client policies.
-- Remove broad SQL privileges as defense in depth; server-side Edge Functions
-- continue to use service_role. These tables are not part of the Home Services
-- client auth/data path (which uses the dedicated *_auth_sessions tables).
REVOKE ALL PRIVILEGES ON TABLE
  public.academy_students,
  public.academy_tutors,
  public.admin_sessions,
  public.admins,
  public.profiles
FROM PUBLIC, anon, authenticated;
