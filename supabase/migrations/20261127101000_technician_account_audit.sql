CREATE TABLE public.technician_account_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX technician_account_audit_history
  ON public.technician_account_audit (technician_id, occurred_at DESC, id DESC);

ALTER TABLE public.technician_account_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.technician_account_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.technician_account_audit TO service_role;

CREATE FUNCTION public.update_technician_status_with_audit(
  p_technician_id uuid, p_admin_id uuid, p_status text, p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  old_status text;
  account public.technicians%ROWTYPE;
BEGIN
  IF p_admin_id IS NULL OR p_status IS NULL
     OR p_status NOT IN ('active', 'inactive', 'rejected', 'suspended') THEN
    RAISE EXCEPTION 'INVALID_TECHNICIAN_STATUS_UPDATE';
  END IF;

  SELECT * INTO STRICT account FROM public.technicians
    WHERE id = p_technician_id FOR UPDATE;
  old_status := account.status;

  DELETE FROM public.technician_auth_sessions WHERE technician_id = p_technician_id;

  UPDATE public.technicians SET
    status = p_status,
    rejection_reason = CASE
      WHEN p_status IN ('rejected', 'inactive') THEN p_reason
      WHEN p_status = 'active' THEN NULL
      ELSE rejection_reason END,
    suspend_reason = CASE
      WHEN p_status = 'suspended' THEN p_reason
      WHEN p_status = 'active' THEN NULL
      ELSE suspend_reason END
    WHERE id = p_technician_id
    RETURNING * INTO STRICT account;

  IF old_status IS DISTINCT FROM account.status THEN
    INSERT INTO public.technician_account_audit
      (technician_id, admin_id, previous_status, new_status)
    VALUES (p_technician_id, p_admin_id, old_status, account.status);
  END IF;

  RETURN to_jsonb(account);
END;
$$;

REVOKE ALL ON FUNCTION public.update_technician_status_with_audit(uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_technician_status_with_audit(uuid, uuid, text, text)
  TO service_role;
