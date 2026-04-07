-- Migration: Fix security vulnerabilities and schema gaps found during PR review
-- Date: 2026-04-07

BEGIN;

-- ============================================================================
-- 1. CRITICAL: Fix role escalation via profiles_update_own
--    Users could set their own role to admin because the policy had no WITH CHECK.
--    Replace with a SECURITY DEFINER function that only allows updating the name.
-- ============================================================================

DROP POLICY IF EXISTS profiles_update_own ON profiles;

CREATE OR REPLACE FUNCTION public.update_own_profile(p_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET name = p_name
  WHERE user_id = auth.uid();
END;
$$;

-- ============================================================================
-- 2. CRITICAL: Fix invite token exposure
--    invites_select_by_token USING (true) exposed all invite rows to everyone.
--    Replace with a SECURITY DEFINER function that validates a single token.
-- ============================================================================

DROP POLICY IF EXISTS invites_select_by_token ON invites;

CREATE OR REPLACE FUNCTION public.validate_invite(p_token text)
RETURNS TABLE (
  id uuid,
  email text,
  role app_role,
  token text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.email, i.role, i.token, i.expires_at
  FROM invites i
  WHERE i.token = p_token
    AND i.used_at IS NULL
    AND i.expires_at > now()
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_invite(text) TO anon;

-- ============================================================================
-- 3. CRITICAL: Fix invite_companies exposure
--    invite_companies_select USING (true) exposed all rows.
--    The validate_invite function and signup trigger handle this internally.
-- ============================================================================

DROP POLICY IF EXISTS invite_companies_select ON invite_companies;

-- ============================================================================
-- 4. CRITICAL: Verify invite token server-side during signup
--    The trigger previously matched invites by email only. Now it also checks
--    the token passed via raw_user_meta_data->>'invite_token'.
-- ============================================================================

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

  SELECT count(*) INTO _profile_count FROM profiles;

  IF _profile_count = 0 THEN
    INSERT INTO profiles (user_id, name, role)
    VALUES (NEW.id, _user_name, 'admin');
    RETURN NEW;
  END IF;

  -- Extract invite token from signup metadata
  _invite_token := NEW.raw_user_meta_data ->> 'invite_token';

  IF _invite_token IS NULL THEN
    RAISE EXCEPTION 'No invite token provided during signup';
  END IF;

  -- Match invite by BOTH email AND token
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
-- 5. CRITICAL: Prevent agents/CMs from impersonating sender_type
--    INSERT policies on ticket_messages must enforce sender_type and sender_id.
-- ============================================================================

DROP POLICY IF EXISTS ticket_messages_insert_agent ON ticket_messages;
DROP POLICY IF EXISTS ticket_messages_insert_cm ON ticket_messages;

CREATE POLICY ticket_messages_insert_agent ON ticket_messages
  FOR INSERT
  WITH CHECK (
    public.user_role() = 'agent'
    AND sender_type = 'agent'
    AND sender_id = auth.uid()
    AND ticket_id IN (
      SELECT id FROM tickets WHERE company_id IN (SELECT public.user_company_ids())
    )
  );

CREATE POLICY ticket_messages_insert_cm ON ticket_messages
  FOR INSERT
  WITH CHECK (
    public.user_role() = 'customer_manager'
    AND sender_type = 'agent'
    AND sender_id = auth.uid()
    AND ticket_id IN (
      SELECT id FROM tickets WHERE company_id IN (SELECT public.user_company_ids())
    )
  );

-- ============================================================================
-- 6. SCHEMA: Prevent race condition on first admin signup
--    Two simultaneous signups could both see count=0 and become admin.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS one_admin_profile
  ON profiles (role) WHERE role = 'admin';

-- ============================================================================
-- 7. SCHEMA: Add missing assigned_agent_id column on tickets
-- ============================================================================

ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_agent_id uuid REFERENCES auth.users(id);

-- ============================================================================
-- 8. SCHEMA: Add missing domain column on companies
-- ============================================================================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS domain text;

-- ============================================================================
-- 9. SCHEMA: Auto-update updated_at via trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 10. SCHEMA: Add admin FOR ALL policy on profiles, drop redundant ones
--     FOR ALL covers SELECT, INSERT, UPDATE, DELETE.
-- ============================================================================

DROP POLICY IF EXISTS profiles_select_admin ON profiles;
DROP POLICY IF EXISTS profiles_update_admin ON profiles;

CREATE POLICY profiles_admin_all ON profiles
  FOR ALL
  USING (public.user_role() = 'admin');

-- ============================================================================
-- 11. SCHEMA: Drop redundant index on invites.token
--     The UNIQUE constraint on invites.token already creates an index.
-- ============================================================================

DROP INDEX IF EXISTS idx_invites_token;

COMMIT;
