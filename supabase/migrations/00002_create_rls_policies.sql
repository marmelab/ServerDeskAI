-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid()
$$;

-- Helper: get current user's company IDs
CREATE OR REPLACE FUNCTION public.user_company_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM user_companies WHERE user_id = auth.uid()
$$;

-- PROFILES
CREATE POLICY profiles_select_own ON profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY profiles_select_admin ON profiles FOR SELECT USING (public.user_role() = 'admin');
CREATE POLICY profiles_update_admin ON profiles FOR UPDATE USING (public.user_role() = 'admin');
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (user_id = auth.uid());

-- COMPANIES
CREATE POLICY companies_admin ON companies FOR ALL USING (public.user_role() = 'admin');
CREATE POLICY companies_select_agent ON companies FOR SELECT USING (public.user_role() = 'agent' AND id IN (SELECT public.user_company_ids()));
CREATE POLICY companies_select_cm ON companies FOR SELECT USING (public.user_role() = 'customer_manager' AND id IN (SELECT public.user_company_ids()));

-- USER_COMPANIES
CREATE POLICY user_companies_admin ON user_companies FOR ALL USING (public.user_role() = 'admin');
CREATE POLICY user_companies_select_own ON user_companies FOR SELECT USING (user_id = auth.uid());

-- INVITES
CREATE POLICY invites_admin ON invites FOR ALL USING (public.user_role() = 'admin');
CREATE POLICY invites_select_by_token ON invites FOR SELECT USING (true);

-- INVITE_COMPANIES
CREATE POLICY invite_companies_admin ON invite_companies FOR ALL USING (public.user_role() = 'admin');
CREATE POLICY invite_companies_select ON invite_companies FOR SELECT USING (true);

-- CUSTOMERS
CREATE POLICY customers_admin ON customers FOR ALL USING (public.user_role() = 'admin');
CREATE POLICY customers_select_cm ON customers FOR SELECT USING (public.user_role() = 'customer_manager' AND company_id IN (SELECT public.user_company_ids()));
CREATE POLICY customers_insert_cm ON customers FOR INSERT WITH CHECK (public.user_role() = 'customer_manager' AND company_id IN (SELECT public.user_company_ids()));
CREATE POLICY customers_update_cm ON customers FOR UPDATE USING (public.user_role() = 'customer_manager' AND company_id IN (SELECT public.user_company_ids()));

-- TICKETS
CREATE POLICY tickets_admin ON tickets FOR ALL USING (public.user_role() = 'admin');
CREATE POLICY tickets_select_agent ON tickets FOR SELECT USING (public.user_role() = 'agent' AND company_id IN (SELECT public.user_company_ids()));
CREATE POLICY tickets_update_agent ON tickets FOR UPDATE USING (public.user_role() = 'agent' AND company_id IN (SELECT public.user_company_ids()));
CREATE POLICY tickets_select_cm ON tickets FOR SELECT USING (public.user_role() = 'customer_manager' AND company_id IN (SELECT public.user_company_ids()));
CREATE POLICY tickets_insert_cm ON tickets FOR INSERT WITH CHECK (public.user_role() = 'customer_manager' AND company_id IN (SELECT public.user_company_ids()));
CREATE POLICY tickets_update_cm ON tickets FOR UPDATE USING (public.user_role() = 'customer_manager' AND company_id IN (SELECT public.user_company_ids()));

-- TICKET_MESSAGES
CREATE POLICY ticket_messages_admin ON ticket_messages FOR ALL USING (public.user_role() = 'admin');
CREATE POLICY ticket_messages_select_agent ON ticket_messages FOR SELECT USING (public.user_role() = 'agent' AND ticket_id IN (SELECT id FROM tickets WHERE company_id IN (SELECT public.user_company_ids())));
CREATE POLICY ticket_messages_insert_agent ON ticket_messages FOR INSERT WITH CHECK (public.user_role() = 'agent' AND ticket_id IN (SELECT id FROM tickets WHERE company_id IN (SELECT public.user_company_ids())));
CREATE POLICY ticket_messages_select_cm ON ticket_messages FOR SELECT USING (public.user_role() = 'customer_manager' AND ticket_id IN (SELECT id FROM tickets WHERE company_id IN (SELECT public.user_company_ids())));
CREATE POLICY ticket_messages_insert_cm ON ticket_messages FOR INSERT WITH CHECK (public.user_role() = 'customer_manager' AND ticket_id IN (SELECT id FROM tickets WHERE company_id IN (SELECT public.user_company_ids())));
