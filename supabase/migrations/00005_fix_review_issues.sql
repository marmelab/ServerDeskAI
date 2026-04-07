-- Migration: Fix PR review issues — atomic RPCs, WITH CHECK, email_logs, admin constraint
-- Date: 2026-04-07

BEGIN;

-- ============================================================================
-- 1. RPC: Atomic update of agent company assignments
--    Replaces non-atomic delete-then-insert from the client side.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_agent_companies(
  p_agent_id uuid,
  p_company_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can call this
  IF public.user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Only admins can update agent company assignments';
  END IF;

  DELETE FROM user_companies WHERE user_id = p_agent_id;

  IF array_length(p_company_ids, 1) IS NOT NULL THEN
    INSERT INTO user_companies (user_id, company_id)
    SELECT p_agent_id, unnest(p_company_ids);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_agent_companies(uuid, uuid[]) TO authenticated;

-- ============================================================================
-- 2. RPC: Atomic invite creation with company associations
--    Token is generated server-side via gen_random_uuid().
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_invite(
  p_email text,
  p_role app_role,
  p_company_ids uuid[]
)
RETURNS TABLE (invite_id uuid, token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.create_invite(text, app_role, uuid[]) TO authenticated;

-- ============================================================================
-- 3. Add WITH CHECK to ticket update policies
--    Prevents agents/CMs from moving tickets to companies they don't belong to.
-- ============================================================================

DROP POLICY IF EXISTS tickets_update_agent ON tickets;
DROP POLICY IF EXISTS tickets_update_cm ON tickets;

CREATE POLICY tickets_update_agent ON tickets
  FOR UPDATE
  USING (public.user_role() = 'agent' AND company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()));

CREATE POLICY tickets_update_cm ON tickets
  FOR UPDATE
  USING (public.user_role() = 'customer_manager' AND company_id IN (SELECT public.user_company_ids()))
  WITH CHECK (company_id IN (SELECT public.user_company_ids()));

-- ============================================================================
-- 4. Add email_logs table (missing from spec)
-- ============================================================================

CREATE TYPE email_direction AS ENUM ('inbound', 'outbound');

CREATE TABLE email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  direction email_direction NOT NULL,
  email_metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_email_logs_ticket ON email_logs(ticket_id);

CREATE POLICY email_logs_admin ON email_logs
  FOR ALL
  USING (public.user_role() = 'admin');

CREATE POLICY email_logs_select_agent ON email_logs
  FOR SELECT
  USING (
    public.user_role() = 'agent'
    AND ticket_id IN (SELECT id FROM tickets WHERE company_id IN (SELECT public.user_company_ids()))
  );

CREATE POLICY email_logs_select_cm ON email_logs
  FOR SELECT
  USING (
    public.user_role() = 'customer_manager'
    AND ticket_id IN (SELECT id FROM tickets WHERE company_id IN (SELECT public.user_company_ids()))
  );

-- ============================================================================
-- 5. Fix single-admin constraint — allow multiple admins
--    The partial unique index on role='admin' prevents ever having >1 admin.
--    Replace with an advisory lock in the trigger for first-signup safety only.
-- ============================================================================

DROP INDEX IF EXISTS one_admin_profile;

-- Update the trigger to use advisory lock for first-admin race protection
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile_count int;
  _invite record;
  _user_name text;
  _invite_token text;
BEGIN
  _user_name := COALESCE(
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );

  -- Advisory lock to prevent first-admin race condition
  PERFORM pg_advisory_xact_lock(42);

  SELECT count(*) INTO _profile_count FROM profiles;

  IF _profile_count = 0 THEN
    INSERT INTO profiles (user_id, name, role)
    VALUES (NEW.id, _user_name, 'admin');
    RETURN NEW;
  END IF;

  _invite_token := NEW.raw_user_meta_data ->> 'invite_token';

  IF _invite_token IS NULL THEN
    RAISE EXCEPTION 'No invite token provided during signup';
  END IF;

  SELECT * INTO _invite
  FROM invites
  WHERE email = NEW.email
    AND token = _invite_token
    AND used_at IS NULL
    AND expires_at > now()
  LIMIT 1;

  IF _invite IS NULL THEN
    RAISE EXCEPTION 'No valid invite found for % with the provided token', NEW.email;
  END IF;

  INSERT INTO profiles (user_id, name, role)
  VALUES (NEW.id, _user_name, _invite.role);

  INSERT INTO user_companies (user_id, company_id)
  SELECT NEW.id, ic.company_id
  FROM invite_companies ic
  WHERE ic.invite_id = _invite.id;

  UPDATE invites SET used_at = now() WHERE id = _invite.id;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- 6. Add missing index on tickets.assigned_agent_id
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tickets_assigned_agent ON tickets(assigned_agent_id);

COMMIT;
