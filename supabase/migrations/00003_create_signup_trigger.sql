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

  SELECT * INTO _invite
  FROM invites
  WHERE email = NEW.email
    AND used_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF _invite IS NULL THEN
    RAISE EXCEPTION 'No valid invite found for %', NEW.email;
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
