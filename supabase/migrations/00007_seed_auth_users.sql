-- Seed auth users for local development only.
-- All passwords: password123
--
-- We drop the trigger (owned by postgres) before inserting, then recreate it,
-- to avoid invite token validation for seed users.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, recovery_token, email_change_token_new,
  email_change_token_current, email_change, email_change_confirm_status,
  phone_change, phone_change_token, reauthentication_token,
  is_sso_user, is_anonymous
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated',
    'admin@serverdesk.local',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Alice Martin"}'::jsonb,
    false,
    '', '', '', '', '', 0,
    '', '', '',
    false, false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated',
    'agent1@serverdesk.local',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Bob Chen"}'::jsonb,
    false,
    '', '', '', '', '', 0,
    '', '', '',
    false, false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000003',
    'authenticated', 'authenticated',
    'agent2@serverdesk.local',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Carol Reeves"}'::jsonb,
    false,
    '', '', '', '', '', 0,
    '', '', '',
    false, false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000004',
    'authenticated', 'authenticated',
    'cm@serverdesk.local',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Diana Patel"}'::jsonb,
    false,
    '', '', '', '', '', 0,
    '', '', '',
    false, false
  )
ON CONFLICT (id) DO NOTHING;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
