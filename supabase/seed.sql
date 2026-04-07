-- =============================================================================
-- ServerDesk Seed Data for Local Development
-- =============================================================================
--
-- This seed creates a realistic dataset for local development:
--   - 4 auth users: 1 admin, 2 agents, 1 customer manager
--   - 4 companies with domains
--   - 8 customers spread across companies
--   - 12 tickets with varied statuses/priorities
--   - 30+ ticket messages with realistic support conversations
--
-- All passwords: password123
-- All UUIDs are fixed for predictability.
--
-- Run with: supabase db reset (which applies migrations then seed)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Clean slate (idempotent)
-- ---------------------------------------------------------------------------
TRUNCATE
  ticket_messages,
  tickets,
  customers,
  user_companies,
  invite_companies,
  invites,
  profiles,
  companies
CASCADE;

-- Also clean auth.users (need to handle FK constraints)
DELETE FROM auth.users WHERE id IN (
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004'
);

-- ---------------------------------------------------------------------------
-- 1. Disable the signup trigger (we insert profiles manually)
-- ---------------------------------------------------------------------------
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- ---------------------------------------------------------------------------
-- 2. Auth users
-- ---------------------------------------------------------------------------
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
) VALUES
  -- Admin
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000001',
    'authenticated', 'authenticated',
    'admin@serverdesk.local',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Alice Martin"}'::jsonb,
    false
  ),
  -- Agent 1
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000002',
    'authenticated', 'authenticated',
    'agent1@serverdesk.local',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Bob Chen"}'::jsonb,
    false
  ),
  -- Agent 2
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000003',
    'authenticated', 'authenticated',
    'agent2@serverdesk.local',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Carol Reeves"}'::jsonb,
    false
  ),
  -- Customer Manager
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-0000-0000-000000000004',
    'authenticated', 'authenticated',
    'cm@serverdesk.local',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Diana Patel"}'::jsonb,
    false
  );

-- ---------------------------------------------------------------------------
-- 3. Profiles (normally created by trigger, inserted manually here)
-- ---------------------------------------------------------------------------
INSERT INTO profiles (user_id, name, role) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Alice Martin',  'admin'),
  ('a0000000-0000-0000-0000-000000000002', 'Bob Chen',      'agent'),
  ('a0000000-0000-0000-0000-000000000003', 'Carol Reeves',  'agent'),
  ('a0000000-0000-0000-0000-000000000004', 'Diana Patel',   'customer_manager');

-- ---------------------------------------------------------------------------
-- 4. Re-enable the signup trigger
-- ---------------------------------------------------------------------------
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- ---------------------------------------------------------------------------
-- 5. Companies
-- ---------------------------------------------------------------------------
INSERT INTO companies (id, name, domain) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Acme Corp',            'acmecorp.com'),
  ('c0000000-0000-0000-0000-000000000002', 'TechNova Solutions',   'technova.io'),
  ('c0000000-0000-0000-0000-000000000003', 'GlobalTrade Inc',      'globaltrade.com'),
  ('c0000000-0000-0000-0000-000000000004', 'Pinnacle Media Group', 'pinnaclemedia.co');

-- ---------------------------------------------------------------------------
-- 6. User-company assignments
--    - Agent 1 (Bob)   -> Acme Corp, TechNova Solutions
--    - Agent 2 (Carol) -> GlobalTrade Inc
--    - CM (Diana)      -> Acme Corp
-- ---------------------------------------------------------------------------
INSERT INTO user_companies (user_id, company_id) VALUES
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001'), -- Bob -> Acme
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002'), -- Bob -> TechNova
  ('a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003'), -- Carol -> GlobalTrade
  ('a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001'); -- Diana -> Acme

-- ---------------------------------------------------------------------------
-- 7. Customers
-- ---------------------------------------------------------------------------
INSERT INTO customers (id, email, name, company_id) VALUES
  -- Acme Corp customers
  ('d0000000-0000-0000-0000-000000000001', 'john.smith@acmecorp.com',       'John Smith',       'c0000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000002', 'sarah.jones@acmecorp.com',      'Sarah Jones',      'c0000000-0000-0000-0000-000000000001'),
  -- TechNova customers
  ('d0000000-0000-0000-0000-000000000003', 'mike.lee@technova.io',          'Mike Lee',         'c0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000004', 'emma.wilson@technova.io',       'Emma Wilson',      'c0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000005', 'raj.kumar@technova.io',         'Raj Kumar',        'c0000000-0000-0000-0000-000000000002'),
  -- GlobalTrade customers
  ('d0000000-0000-0000-0000-000000000006', 'lisa.brown@globaltrade.com',    'Lisa Brown',       'c0000000-0000-0000-0000-000000000003'),
  ('d0000000-0000-0000-0000-000000000007', 'tom.nguyen@globaltrade.com',    'Tom Nguyen',       'c0000000-0000-0000-0000-000000000003'),
  -- Pinnacle Media customer (no agent assigned to this company yet)
  ('d0000000-0000-0000-0000-000000000008', 'karen.davis@pinnaclemedia.co',  'Karen Davis',      'c0000000-0000-0000-0000-000000000004');

-- ---------------------------------------------------------------------------
-- 8. Tickets
-- ---------------------------------------------------------------------------
INSERT INTO tickets (id, subject, description, status, priority, customer_id, company_id, assigned_agent_id, created_at, updated_at) VALUES
  -- Acme Corp tickets (agent: Bob)
  ('e0000000-0000-0000-0000-000000000001',
   'Cannot access production server',
   'Getting a 502 Bad Gateway error when trying to reach our production environment at app.acmecorp.com.',
   'in_progress', 'urgent',
   'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000002',
   now() - interval '3 days', now() - interval '1 hour'),

  ('e0000000-0000-0000-0000-000000000002',
   'Billing discrepancy on March invoice',
   'Our March invoice shows charges for 10 seats but we only have 7 active users.',
   'open', 'high',
   'd0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001',
   NULL,
   now() - interval '1 day', now() - interval '1 day'),

  ('e0000000-0000-0000-0000-000000000003',
   'Request for additional storage space',
   'We are running low on storage. Can we upgrade our plan from 100GB to 500GB?',
   'resolved', 'medium',
   'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000002',
   now() - interval '10 days', now() - interval '5 days'),

  -- TechNova tickets (agent: Bob)
  ('e0000000-0000-0000-0000-000000000004',
   'SSL certificate expiring soon',
   'Our SSL cert for api.technova.io expires in 5 days. Need it renewed ASAP.',
   'in_progress', 'urgent',
   'd0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000002',
   now() - interval '2 days', now() - interval '4 hours'),

  ('e0000000-0000-0000-0000-000000000005',
   'New user onboarding issues',
   'Several new team members cannot complete the onboarding flow. They get stuck at the email verification step.',
   'waiting', 'medium',
   'd0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000002',
   now() - interval '4 days', now() - interval '2 days'),

  ('e0000000-0000-0000-0000-000000000006',
   'API rate limits too restrictive',
   'We are hitting the 100 req/min rate limit during peak hours. Can this be increased?',
   'open', 'low',
   'd0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000002',
   NULL,
   now() - interval '6 hours', now() - interval '6 hours'),

  ('e0000000-0000-0000-0000-000000000007',
   'Database backup restoration request',
   'We accidentally deleted some records from our production database. Need to restore from last night backup.',
   'closed', 'urgent',
   'd0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000002',
   now() - interval '14 days', now() - interval '12 days'),

  -- GlobalTrade tickets (agent: Carol)
  ('e0000000-0000-0000-0000-000000000008',
   'VPN connection dropping frequently',
   'Our team in the London office keeps losing VPN connectivity every 15-20 minutes.',
   'in_progress', 'high',
   'd0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000003',
   now() - interval '2 days', now() - interval '3 hours'),

  ('e0000000-0000-0000-0000-000000000009',
   'Need SFTP credentials for data exchange',
   'We need SFTP access set up for our new EDI integration partner.',
   'waiting', 'medium',
   'd0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000003',
   now() - interval '5 days', now() - interval '3 days'),

  ('e0000000-0000-0000-0000-000000000010',
   'Monthly uptime report request',
   'Can you provide us with the uptime report for Q1 2026?',
   'resolved', 'low',
   'd0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000003',
   now() - interval '8 days', now() - interval '6 days'),

  -- Pinnacle Media tickets (no agent assigned to this company)
  ('e0000000-0000-0000-0000-000000000011',
   'Website loading very slowly',
   'Our marketing site pinnaclemedia.co has been loading in 8+ seconds for the past two days.',
   'open', 'high',
   'd0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000004',
   NULL,
   now() - interval '1 day', now() - interval '1 day'),

  ('e0000000-0000-0000-0000-000000000012',
   'Email deliverability issues',
   'Our transactional emails are landing in spam folders for Gmail users.',
   'open', 'medium',
   'd0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000004',
   NULL,
   now() - interval '12 hours', now() - interval '12 hours');

-- ---------------------------------------------------------------------------
-- 9. Ticket messages
-- ---------------------------------------------------------------------------

-- Ticket 1: Cannot access production server (in_progress, urgent)
INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, body, created_at) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'customer',
   'd0000000-0000-0000-0000-000000000001',
   'Hi, we have been getting 502 Bad Gateway errors on app.acmecorp.com since about 6 AM this morning. None of our team can access the application. This is blocking all of our work.',
   now() - interval '3 days'),
  ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'system',
   NULL,
   'Ticket created and assigned to Bob Chen.',
   now() - interval '3 days' + interval '1 minute'),
  ('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 'agent',
   'a0000000-0000-0000-0000-000000000002',
   'Hi John, I can see the issue on our monitoring dashboard. It looks like the upstream application server ran out of memory and crashed. I am restarting the service now and will investigate the root cause.',
   now() - interval '3 days' + interval '20 minutes'),
  ('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 'customer',
   'd0000000-0000-0000-0000-000000000001',
   'Thanks Bob. The site is loading again but it feels slower than usual. Is that expected?',
   now() - interval '3 days' + interval '45 minutes'),
  ('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000001', 'agent',
   'a0000000-0000-0000-0000-000000000002',
   'Yes, the application is still warming up its caches. Performance should return to normal within the next hour. I am also adding extra memory to the instance to prevent this from happening again. I will keep this ticket open until we confirm stability.',
   now() - interval '3 days' + interval '1 hour');

-- Ticket 2: Billing discrepancy (open, high)
INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, body, created_at) VALUES
  ('f0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000002', 'customer',
   'd0000000-0000-0000-0000-000000000002',
   'Hello, I just reviewed our March invoice and noticed we are being charged for 10 seats at $50/seat, but we only have 7 active users. Could you please look into this? Our account ID is ACME-2024-001.',
   now() - interval '1 day'),
  ('f0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000002', 'system',
   NULL,
   'Ticket created. Awaiting agent assignment.',
   now() - interval '1 day' + interval '1 minute');

-- Ticket 3: Request for additional storage (resolved)
INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, body, created_at) VALUES
  ('f0000000-0000-0000-0000-000000000008', 'e0000000-0000-0000-0000-000000000003', 'customer',
   'd0000000-0000-0000-0000-000000000001',
   'We are at 92% of our 100GB storage quota. Could you upgrade us to the 500GB tier?',
   now() - interval '10 days'),
  ('f0000000-0000-0000-0000-000000000009', 'e0000000-0000-0000-0000-000000000003', 'agent',
   'a0000000-0000-0000-0000-000000000002',
   'Hi John, I have submitted the upgrade request. The storage increase should take effect within 2 hours. Your new quota will be 500GB at the Pro tier rate. You will see the prorated charge on your next invoice.',
   now() - interval '10 days' + interval '3 hours'),
  ('f0000000-0000-0000-0000-000000000010', 'e0000000-0000-0000-0000-000000000003', 'customer',
   'd0000000-0000-0000-0000-000000000001',
   'I can confirm the storage now shows 500GB. Thank you for the quick turnaround!',
   now() - interval '9 days'),
  ('f0000000-0000-0000-0000-000000000011', 'e0000000-0000-0000-0000-000000000003', 'agent',
   'a0000000-0000-0000-0000-000000000002',
   'Great to hear. Marking this as resolved. Feel free to reopen if you need anything else.',
   now() - interval '9 days' + interval '2 hours');

-- Ticket 4: SSL certificate expiring (in_progress, urgent)
INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, body, created_at) VALUES
  ('f0000000-0000-0000-0000-000000000012', 'e0000000-0000-0000-0000-000000000004', 'customer',
   'd0000000-0000-0000-0000-000000000003',
   'Our monitoring flagged that the SSL certificate for api.technova.io expires on April 12th. Can you renew it before then? We cannot afford any downtime on our API.',
   now() - interval '2 days'),
  ('f0000000-0000-0000-0000-000000000013', 'e0000000-0000-0000-0000-000000000004', 'agent',
   'a0000000-0000-0000-0000-000000000002',
   'Hi Mike, thanks for the heads up. I have initiated the certificate renewal process. I need to verify domain ownership first. Could you confirm that you can add a CNAME record to your DNS? I will send the details shortly.',
   now() - interval '2 days' + interval '1 hour'),
  ('f0000000-0000-0000-0000-000000000014', 'e0000000-0000-0000-0000-000000000004', 'customer',
   'd0000000-0000-0000-0000-000000000003',
   'Yes, I have access to our DNS management. Please send the CNAME details and I will add it right away.',
   now() - interval '2 days' + interval '2 hours');

-- Ticket 5: New user onboarding issues (waiting)
INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, body, created_at) VALUES
  ('f0000000-0000-0000-0000-000000000015', 'e0000000-0000-0000-0000-000000000005', 'customer',
   'd0000000-0000-0000-0000-000000000004',
   'We just hired 5 new engineers and none of them can complete the signup process. They all get stuck after entering their email - the verification email never arrives. We checked spam folders too.',
   now() - interval '4 days'),
  ('f0000000-0000-0000-0000-000000000016', 'e0000000-0000-0000-0000-000000000005', 'agent',
   'a0000000-0000-0000-0000-000000000002',
   'Hi Emma, I checked the email logs and it appears the verification emails are being sent but bounced by your mail server. Could you check with your IT team if they have whitelisted our sending domain noreply@serverdesk.io? In the meantime, I can manually verify the accounts if you send me the list of email addresses.',
   now() - interval '4 days' + interval '4 hours'),
  ('f0000000-0000-0000-0000-000000000017', 'e0000000-0000-0000-0000-000000000005', 'customer',
   'd0000000-0000-0000-0000-000000000004',
   'I have passed this to our IT team. They are looking into the whitelisting. I will get back to you once they confirm.',
   now() - interval '3 days');

-- Ticket 6: API rate limits (open, low)
INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, body, created_at) VALUES
  ('f0000000-0000-0000-0000-000000000018', 'e0000000-0000-0000-0000-000000000006', 'customer',
   'd0000000-0000-0000-0000-000000000005',
   'We are consistently hitting the 100 requests/minute rate limit between 9-11 AM when our batch processing jobs run. Is it possible to increase this to 500 req/min? We are on the Business plan.',
   now() - interval '6 hours');

-- Ticket 7: Database backup restoration (closed)
INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, body, created_at) VALUES
  ('f0000000-0000-0000-0000-000000000019', 'e0000000-0000-0000-0000-000000000007', 'customer',
   'd0000000-0000-0000-0000-000000000003',
   'URGENT: One of our developers accidentally ran a DELETE without a WHERE clause on the orders table. We need to restore from the most recent backup immediately.',
   now() - interval '14 days'),
  ('f0000000-0000-0000-0000-000000000020', 'e0000000-0000-0000-0000-000000000007', 'system',
   NULL,
   'Ticket created with urgent priority and assigned to Bob Chen.',
   now() - interval '14 days' + interval '1 minute'),
  ('f0000000-0000-0000-0000-000000000021', 'e0000000-0000-0000-0000-000000000007', 'agent',
   'a0000000-0000-0000-0000-000000000002',
   'Mike, I am on this right now. I can see the last successful backup was at 2:00 AM today. I am starting the point-in-time recovery to restore the orders table to its state at 1:59 AM. This should take about 30 minutes. I will restore to a staging environment first so you can verify before we push to production.',
   now() - interval '14 days' + interval '15 minutes'),
  ('f0000000-0000-0000-0000-000000000022', 'e0000000-0000-0000-0000-000000000007', 'customer',
   'd0000000-0000-0000-0000-000000000003',
   'We verified the staging restore and everything looks correct. Please go ahead and push to production.',
   now() - interval '14 days' + interval '2 hours'),
  ('f0000000-0000-0000-0000-000000000023', 'e0000000-0000-0000-0000-000000000007', 'agent',
   'a0000000-0000-0000-0000-000000000002',
   'Production restore is complete. All 14,832 records have been recovered. I strongly recommend implementing a database access control policy to prevent direct DELETE operations without approval. Happy to help set that up if you are interested. Closing this ticket.',
   now() - interval '14 days' + interval '3 hours');

-- Ticket 8: VPN connection dropping (in_progress, high)
INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, body, created_at) VALUES
  ('f0000000-0000-0000-0000-000000000024', 'e0000000-0000-0000-0000-000000000008', 'customer',
   'd0000000-0000-0000-0000-000000000006',
   'Our London office team (about 20 people) has been experiencing VPN disconnections every 15-20 minutes since Monday. The New York office is unaffected. We are using the GlobalTrade VPN client v3.2.',
   now() - interval '2 days'),
  ('f0000000-0000-0000-0000-000000000025', 'e0000000-0000-0000-0000-000000000008', 'agent',
   'a0000000-0000-0000-0000-000000000003',
   'Hi Lisa, thank you for the details. I am seeing elevated packet loss on the London VPN gateway. It looks like the issue started after a firmware update on Monday. I am rolling back the gateway firmware now and will monitor the connection stability.',
   now() - interval '2 days' + interval '2 hours'),
  ('f0000000-0000-0000-0000-000000000026', 'e0000000-0000-0000-0000-000000000008', 'customer',
   'd0000000-0000-0000-0000-000000000006',
   'Thanks Carol. The disconnections seem less frequent now but still happening occasionally. It went from every 15 minutes to about once per hour.',
   now() - interval '1 day');

-- Ticket 9: SFTP credentials (waiting)
INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, body, created_at) VALUES
  ('f0000000-0000-0000-0000-000000000027', 'e0000000-0000-0000-0000-000000000009', 'customer',
   'd0000000-0000-0000-0000-000000000007',
   'We have a new EDI partner (Logistics Plus) that needs SFTP access to exchange shipping data files. They need read/write access to a dedicated directory. Their IP range for whitelisting is 203.0.113.0/24.',
   now() - interval '5 days'),
  ('f0000000-0000-0000-0000-000000000028', 'e0000000-0000-0000-0000-000000000009', 'agent',
   'a0000000-0000-0000-0000-000000000003',
   'Hi Tom, I have created the SFTP account and directory. Before I can share the credentials, I need a signed data processing agreement from Logistics Plus. Could you have them fill out the DPA form I am attaching and send it back?',
   now() - interval '5 days' + interval '5 hours'),
  ('f0000000-0000-0000-0000-000000000029', 'e0000000-0000-0000-0000-000000000009', 'customer',
   'd0000000-0000-0000-0000-000000000007',
   'I have forwarded the DPA form to our contact at Logistics Plus. They said it will take 2-3 business days to get it signed by their legal team.',
   now() - interval '4 days');

-- Ticket 10: Monthly uptime report (resolved)
INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, body, created_at) VALUES
  ('f0000000-0000-0000-0000-000000000030', 'e0000000-0000-0000-0000-000000000010', 'customer',
   'd0000000-0000-0000-0000-000000000006',
   'Hi, per our SLA we need to receive a quarterly uptime report. Could you send us the Q1 2026 report for all our services?',
   now() - interval '8 days'),
  ('f0000000-0000-0000-0000-000000000031', 'e0000000-0000-0000-0000-000000000010', 'agent',
   'a0000000-0000-0000-0000-000000000003',
   'Hi Lisa, here is your Q1 2026 uptime summary: Web Services 99.97%, API Gateway 99.99%, VPN 99.82%, Email Services 99.95%. The detailed PDF report has been sent to your admin email. The VPN dip was due to the scheduled maintenance window in February.',
   now() - interval '7 days'),
  ('f0000000-0000-0000-0000-000000000032', 'e0000000-0000-0000-0000-000000000010', 'customer',
   'd0000000-0000-0000-0000-000000000006',
   'Received, thank you. The numbers look good. We are satisfied with the SLA compliance.',
   now() - interval '6 days');

-- Ticket 11: Website loading slowly (open, high)
INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, body, created_at) VALUES
  ('f0000000-0000-0000-0000-000000000033', 'e0000000-0000-0000-0000-000000000011', 'customer',
   'd0000000-0000-0000-0000-000000000008',
   'Our marketing website pinnaclemedia.co has been extremely slow for the past 2 days. Page load times are averaging 8-10 seconds according to our Google Analytics. Before this it was consistently under 2 seconds. We have not made any changes on our end.',
   now() - interval '1 day'),
  ('f0000000-0000-0000-0000-000000000034', 'e0000000-0000-0000-0000-000000000011', 'system',
   NULL,
   'Ticket created. No agents are currently assigned to Pinnacle Media Group.',
   now() - interval '1 day' + interval '1 minute');

-- Ticket 12: Email deliverability (open, medium)
INSERT INTO ticket_messages (id, ticket_id, sender_type, sender_id, body, created_at) VALUES
  ('f0000000-0000-0000-0000-000000000035', 'e0000000-0000-0000-0000-000000000012', 'customer',
   'd0000000-0000-0000-0000-000000000008',
   'We have been getting reports from our clients that our transactional emails (order confirmations, password resets) are going to spam in Gmail. This started about a week ago. Our SPF and DKIM records have not changed. Could you investigate?',
   now() - interval '12 hours');

COMMIT;
