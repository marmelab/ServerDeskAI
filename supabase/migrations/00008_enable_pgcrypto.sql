-- Fix: gen_random_bytes() lives in the extensions schema (where pgcrypto is installed),
-- but create_invite() had search_path = public, so the function was not found.
-- Add extensions to the search_path so gen_random_bytes() resolves correctly.

CREATE OR REPLACE FUNCTION public.create_invite(
  p_email text,
  p_role app_role,
  p_company_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS TABLE (invite_id uuid, token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _invite_id uuid;
  _token text;
  _user_id uuid;
BEGIN
  -- Only admins can create invites
  IF public.user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Only admins can create invites';
  END IF;

  _user_id := auth.uid();
  _token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO invites (email, role, token, invited_by, expires_at)
  VALUES (p_email, p_role, _token, _user_id, now() + interval '7 days')
  RETURNING id INTO _invite_id;

  IF array_length(p_company_ids, 1) IS NOT NULL THEN
    INSERT INTO invite_companies (invite_id, company_id)
    SELECT _invite_id, unnest(p_company_ids);
  END IF;

  RETURN QUERY SELECT _invite_id, _token;
END;
$$;
