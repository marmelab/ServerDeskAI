-- Fix: Supabase Auth normalizes emails to lowercase in auth.users, but
-- create_invite stored emails as-is from admin input. The trigger's
-- case-sensitive email comparison would fail for mixed-case invite emails.
-- Fix: normalize email to lowercase at invite creation time, and make the
-- trigger lookup case-insensitive for existing invites.

-- 1. Update create_invite to normalize email to lowercase
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
  IF public.user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Only admins can create invites';
  END IF;

  _user_id := auth.uid();
  _token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO invites (email, role, token, invited_by, expires_at)
  VALUES (lower(p_email), p_role, _token, _user_id, now() + interval '7 days')
  RETURNING id INTO _invite_id;

  IF array_length(p_company_ids, 1) IS NOT NULL THEN
    INSERT INTO invite_companies (invite_id, company_id)
    SELECT _invite_id, unnest(p_company_ids);
  END IF;

  RETURN QUERY SELECT _invite_id, _token;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_invite(text, app_role, uuid[]) TO authenticated;

-- 2. Update handle_new_user to compare emails case-insensitively
--    (handles any existing invites that may have mixed-case emails)
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

  -- Compare emails case-insensitively to handle mixed-case invite emails
  SELECT * INTO _invite
  FROM invites
  WHERE lower(email) = lower(NEW.email)
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
