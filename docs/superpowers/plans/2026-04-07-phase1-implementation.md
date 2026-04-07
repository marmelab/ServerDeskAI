# ServerDesk Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core ServerDesk application with database schema, authentication with invite system, company/agent/customer management, and ticket CRUD with message threads — all scoped by role via Supabase RLS.

**Architecture:** Feature-first React SPA. Each feature module contains its own components, hooks, and types. Supabase handles auth and database with RLS for authorization. TanStack Query manages server state. Auth state via React Context.

**Tech Stack:** React 19, TypeScript (strict), Vite, Tailwind CSS v4, shadcn/ui, Supabase, React Router, TanStack Query, zod, react-hook-form, Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-04-07-serverdesk-phase1-design.md`

---

## File Structure

### New files to create

```
supabase/migrations/
├── 00001_create_enums.sql
├── 00002_create_tables.sql
├── 00003_create_rls_policies.sql
└── 00004_create_trigger.sql

src/features/auth/
├── AuthProvider.tsx
├── components/
│   ├── LoginForm.tsx
│   ├── SignupForm.tsx
│   ├── ProtectedRoute.tsx
│   └── RoleGuard.tsx
└── hooks/
    ├── useAuth.ts
    └── useProfile.ts

src/features/companies/
├── components/
│   ├── CompanyList.tsx
│   ├── CompanyForm.tsx
│   ├── CompanyDetail.tsx
│   └── InviteCMDialog.tsx
├── hooks/
│   ├── useCompanies.ts
│   ├── useCompany.ts
│   └── useCreateInvite.ts
└── types.ts

src/features/agents/
├── components/
│   ├── AgentList.tsx
│   ├── InviteAgentDialog.tsx
│   └── AssignCompaniesDialog.tsx
├── hooks/
│   ├── useAgents.ts
│   ├── useAgent.ts
│   └── useAgentCompanies.ts
└── types.ts

src/features/customers/
├── components/
│   ├── CustomerList.tsx
│   └── CustomerForm.tsx
├── hooks/
│   └── useCustomers.ts
└── types.ts

src/features/tickets/
├── components/
│   ├── TicketList.tsx
│   ├── TicketDetail.tsx
│   ├── TicketMessageThread.tsx
│   ├── TicketFilters.tsx
│   ├── TicketStatusBadge.tsx
│   ├── TicketPriorityBadge.tsx
│   └── CreateTicketForm.tsx
├── hooks/
│   ├── useTickets.ts
│   ├── useTicket.ts
│   ├── useTicketMessages.ts
│   ├── useCreateMessage.ts
│   └── useUpdateTicket.ts
└── types.ts

src/features/dashboard/
├── components/
│   ├── DashboardStats.tsx
│   └── StatCard.tsx
├── hooks/
│   └── useDashboardStats.ts
└── types.ts
```

### Existing files to modify

```
src/App.tsx                  — wrap with AuthProvider
src/routes/index.tsx         — real routes with ProtectedRoute/RoleGuard
src/layouts/AppLayout.tsx    — role-based sidebar navigation
src/lib/supabase.ts          — add typed client with Database generic
src/lib/types.ts             — update with generated DB types
```

---

## Phase A: Database Foundation

### Task 1: Create database enums and tables migration

**Files:**
- Create: `supabase/migrations/00001_create_enums_and_tables.sql`

- [x] **Step 1: Write the migration SQL**

Create `supabase/migrations/00001_create_enums_and_tables.sql`:

```sql
-- Enums
CREATE TYPE app_role AS ENUM ('admin', 'agent', 'customer_manager');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'waiting', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE sender_type AS ENUM ('customer', 'agent', 'system');

-- Profiles (one per auth.user)
CREATE TABLE profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Companies
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User-company assignments (agents + customer managers)
CREATE TABLE user_companies (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, company_id)
);

-- Invites
CREATE TABLE invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role app_role NOT NULL,
  token text UNIQUE NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  used_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Invite-company assignments (which companies the invite grants)
CREATE TABLE invite_companies (
  invite_id uuid NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (invite_id, company_id)
);

-- Customers (managed by customer managers)
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tickets
CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  description text,
  status ticket_status NOT NULL DEFAULT 'open',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  customer_id uuid NOT NULL REFERENCES customers(id),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ticket messages
CREATE TABLE ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  sender_type sender_type NOT NULL,
  sender_id uuid,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_user_companies_user ON user_companies(user_id);
CREATE INDEX idx_user_companies_company ON user_companies(company_id);
CREATE INDEX idx_tickets_company ON tickets(company_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX idx_customers_company ON customers(company_id);
CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_email ON invites(email);
```

- [x] **Step 2: Verify migration applies**

Start Supabase local (if not running) and apply:

```bash
npx supabase start
npx supabase db reset
```

Expected: Migration applies without errors. Check Supabase Studio at http://127.0.0.1:54323 to verify tables exist.

- [x] **Step 3: Commit**

```bash
git add supabase/migrations/00001_create_enums_and_tables.sql
git commit -m "feat(db): create enums and tables for ServerDesk schema"
```

---

### Task 2: Create RLS policies

**Files:**
- Create: `supabase/migrations/00002_create_rls_policies.sql`

- [x] **Step 1: Write RLS policies**

Create `supabase/migrations/00002_create_rls_policies.sql`:

```sql
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
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid()
$$;

-- Helper: get current user's company IDs
CREATE OR REPLACE FUNCTION auth.user_company_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT company_id FROM user_companies WHERE user_id = auth.uid()
$$;

-- ==================
-- PROFILES
-- ==================

-- Users can read their own profile
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT USING (user_id = auth.uid());

-- Admin can read all profiles
CREATE POLICY profiles_select_admin ON profiles
  FOR SELECT USING (auth.user_role() = 'admin');

-- Admin can update any profile
CREATE POLICY profiles_update_admin ON profiles
  FOR UPDATE USING (auth.user_role() = 'admin');

-- Users can update their own profile (name only, not role)
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE USING (user_id = auth.uid());

-- ==================
-- COMPANIES
-- ==================

-- Admin: full CRUD
CREATE POLICY companies_admin ON companies
  FOR ALL USING (auth.user_role() = 'admin');

-- Agent: read own companies
CREATE POLICY companies_select_agent ON companies
  FOR SELECT USING (
    auth.user_role() = 'agent'
    AND id IN (SELECT auth.user_company_ids())
  );

-- Customer manager: read own company
CREATE POLICY companies_select_cm ON companies
  FOR SELECT USING (
    auth.user_role() = 'customer_manager'
    AND id IN (SELECT auth.user_company_ids())
  );

-- ==================
-- USER_COMPANIES
-- ==================

-- Admin: full access
CREATE POLICY user_companies_admin ON user_companies
  FOR ALL USING (auth.user_role() = 'admin');

-- Users can read their own assignments
CREATE POLICY user_companies_select_own ON user_companies
  FOR SELECT USING (user_id = auth.uid());

-- ==================
-- INVITES
-- ==================

-- Admin: full access
CREATE POLICY invites_admin ON invites
  FOR ALL USING (auth.user_role() = 'admin');

-- Anyone can read invite by token (for signup validation)
-- Using a permissive policy for anonymous access during signup
CREATE POLICY invites_select_by_token ON invites
  FOR SELECT USING (true);

-- ==================
-- INVITE_COMPANIES
-- ==================

-- Admin: full access
CREATE POLICY invite_companies_admin ON invite_companies
  FOR ALL USING (auth.user_role() = 'admin');

-- Readable during signup (linked to invite)
CREATE POLICY invite_companies_select ON invite_companies
  FOR SELECT USING (true);

-- ==================
-- CUSTOMERS
-- ==================

-- Admin: full access
CREATE POLICY customers_admin ON customers
  FOR ALL USING (auth.user_role() = 'admin');

-- Customer manager: CRUD on own company's customers
CREATE POLICY customers_select_cm ON customers
  FOR SELECT USING (
    auth.user_role() = 'customer_manager'
    AND company_id IN (SELECT auth.user_company_ids())
  );

CREATE POLICY customers_insert_cm ON customers
  FOR INSERT WITH CHECK (
    auth.user_role() = 'customer_manager'
    AND company_id IN (SELECT auth.user_company_ids())
  );

CREATE POLICY customers_update_cm ON customers
  FOR UPDATE USING (
    auth.user_role() = 'customer_manager'
    AND company_id IN (SELECT auth.user_company_ids())
  );

-- ==================
-- TICKETS
-- ==================

-- Admin: full access
CREATE POLICY tickets_admin ON tickets
  FOR ALL USING (auth.user_role() = 'admin');

-- Agent: read/update tickets in their companies
CREATE POLICY tickets_select_agent ON tickets
  FOR SELECT USING (
    auth.user_role() = 'agent'
    AND company_id IN (SELECT auth.user_company_ids())
  );

CREATE POLICY tickets_update_agent ON tickets
  FOR UPDATE USING (
    auth.user_role() = 'agent'
    AND company_id IN (SELECT auth.user_company_ids())
  );

-- Customer manager: read/insert/update tickets in their company
CREATE POLICY tickets_select_cm ON tickets
  FOR SELECT USING (
    auth.user_role() = 'customer_manager'
    AND company_id IN (SELECT auth.user_company_ids())
  );

CREATE POLICY tickets_insert_cm ON tickets
  FOR INSERT WITH CHECK (
    auth.user_role() = 'customer_manager'
    AND company_id IN (SELECT auth.user_company_ids())
  );

CREATE POLICY tickets_update_cm ON tickets
  FOR UPDATE USING (
    auth.user_role() = 'customer_manager'
    AND company_id IN (SELECT auth.user_company_ids())
  );

-- ==================
-- TICKET_MESSAGES
-- ==================

-- Admin: full access
CREATE POLICY ticket_messages_admin ON ticket_messages
  FOR ALL USING (auth.user_role() = 'admin');

-- Agent: read/insert messages for tickets in their companies
CREATE POLICY ticket_messages_select_agent ON ticket_messages
  FOR SELECT USING (
    auth.user_role() = 'agent'
    AND ticket_id IN (
      SELECT id FROM tickets WHERE company_id IN (SELECT auth.user_company_ids())
    )
  );

CREATE POLICY ticket_messages_insert_agent ON ticket_messages
  FOR INSERT WITH CHECK (
    auth.user_role() = 'agent'
    AND ticket_id IN (
      SELECT id FROM tickets WHERE company_id IN (SELECT auth.user_company_ids())
    )
  );

-- Customer manager: read/insert messages for tickets in their company
CREATE POLICY ticket_messages_select_cm ON ticket_messages
  FOR SELECT USING (
    auth.user_role() = 'customer_manager'
    AND ticket_id IN (
      SELECT id FROM tickets WHERE company_id IN (SELECT auth.user_company_ids())
    )
  );

CREATE POLICY ticket_messages_insert_cm ON ticket_messages
  FOR INSERT WITH CHECK (
    auth.user_role() = 'customer_manager'
    AND ticket_id IN (
      SELECT id FROM tickets WHERE company_id IN (SELECT auth.user_company_ids())
    )
  );
```

- [x] **Step 2: Apply and verify**

```bash
npx supabase db reset
```

Expected: Both migrations apply without errors.

- [x] **Step 3: Commit**

```bash
git add supabase/migrations/00002_create_rls_policies.sql
git commit -m "feat(db): add RLS policies for all tables"
```

---

### Task 3: Create signup trigger

**Files:**
- Create: `supabase/migrations/00003_create_signup_trigger.sql`

- [x] **Step 1: Write the trigger function**

Create `supabase/migrations/00003_create_signup_trigger.sql`:

```sql
-- Trigger function: auto-create profile on signup
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
  -- Get the name from user metadata (passed during signup)
  _user_name := COALESCE(
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );

  -- Check if this is the first user
  SELECT count(*) INTO _profile_count FROM profiles;

  IF _profile_count = 0 THEN
    -- First user becomes admin
    INSERT INTO profiles (user_id, name, role)
    VALUES (NEW.id, _user_name, 'admin');
    RETURN NEW;
  END IF;

  -- Look up valid invite
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

  -- Create profile with role from invite
  INSERT INTO profiles (user_id, name, role)
  VALUES (NEW.id, _user_name, _invite.role);

  -- Copy invite_companies to user_companies
  INSERT INTO user_companies (user_id, company_id)
  SELECT NEW.id, ic.company_id
  FROM invite_companies ic
  WHERE ic.invite_id = _invite.id;

  -- Mark invite as used
  UPDATE invites SET used_at = now() WHERE id = _invite.id;

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

- [x] **Step 2: Apply and verify**

```bash
npx supabase db reset
```

Expected: All 3 migrations apply without errors.

- [x] **Step 3: Commit**

```bash
git add supabase/migrations/00003_create_signup_trigger.sql
git commit -m "feat(db): add signup trigger for auto-profile creation"
```

---

### Task 4: Generate TypeScript types from database

**Files:**
- Create: `src/lib/database.types.ts`
- Modify: `src/lib/supabase.ts`
- Modify: `src/lib/types.ts`

- [x] **Step 1: Generate types**

```bash
npx supabase gen types typescript --local > src/lib/database.types.ts
```

- [x] **Step 2: Update Supabase client with typed client**

Replace `src/lib/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

- [x] **Step 3: Update shared types**

Replace `src/lib/types.ts`:

```ts
import type { Database } from "./database.types";

// Database row types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type UserCompany = Database["public"]["Tables"]["user_companies"]["Row"];
export type Invite = Database["public"]["Tables"]["invites"]["Row"];
export type InviteCompany = Database["public"]["Tables"]["invite_companies"]["Row"];
export type Customer = Database["public"]["Tables"]["customers"]["Row"];
export type Ticket = Database["public"]["Tables"]["tickets"]["Row"];
export type TicketMessage = Database["public"]["Tables"]["ticket_messages"]["Row"];

// Enum types
export type AppRole = Database["public"]["Enums"]["app_role"];
export type TicketStatus = Database["public"]["Enums"]["ticket_status"];
export type TicketPriority = Database["public"]["Enums"]["ticket_priority"];
export type SenderType = Database["public"]["Enums"]["sender_type"];
```

- [x] **Step 4: Verify build**

```bash
npm run build
```

Expected: Build succeeds with no type errors.

- [x] **Step 5: Commit**

```bash
git add src/lib/database.types.ts src/lib/supabase.ts src/lib/types.ts
git commit -m "feat(db): generate TypeScript types from database schema"
```

---

## Phase B: Authentication

### Task 5: AuthProvider and auth hooks

**Files:**
- Create: `src/features/auth/hooks/useAuth.ts`
- Create: `src/features/auth/hooks/useProfile.ts`
- Create: `src/features/auth/AuthProvider.tsx`

- [x] **Step 1: Create useAuth hook**

Create `src/features/auth/hooks/useAuth.ts`:

```ts
import { supabase } from "@/lib/supabase";

export const useAuth = () => {
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return { signIn, signUp, signOut };
};
```

- [x] **Step 2: Create useProfile hook**

Create `src/features/auth/hooks/useProfile.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

export const useProfile = (userId: string | undefined) => {
  return useQuery<Profile | null>({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};
```

- [x] **Step 3: Create AuthProvider**

Create `src/features/auth/AuthProvider.tsx`:

```tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useProfile } from "./hooks/useProfile";
import type { Profile } from "@/lib/types";

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  session: null,
  loading: true,
});

export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;
  const { data: profile } = useProfile(user?.id);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: profile ?? null,
        session,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
```

- [x] **Step 4: Verify build**

```bash
npm run build
```

Expected: Build succeeds. The AuthProvider is not wired into the app yet — that happens in Task 7.

- [x] **Step 5: Commit**

```bash
git add src/features/auth/
git commit -m "feat(auth): add AuthProvider, useAuth, and useProfile hooks"
```

---

### Task 6: Login and Signup pages

**Files:**
- Create: `src/features/auth/components/LoginForm.tsx`
- Create: `src/features/auth/components/SignupForm.tsx`

- [x] **Step 1: Install required shadcn components**

```bash
npx shadcn@latest add input label card separator -y
```

- [x] **Step 2: Create LoginForm**

Create `src/features/auth/components/LoginForm.tsx`:

```tsx
import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "../hooks/useAuth";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;

export const LoginForm = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginValues) => {
    try {
      setError(null);
      await signIn(values.email, values.password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Sign in to ServerDesk</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
```

- [x] **Step 3: Create SignupForm**

Create `src/features/auth/components/SignupForm.tsx`:

```tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuth } from "../hooks/useAuth";

const signupSchema = z.object({
  email: z.email(),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignupValues = z.infer<typeof signupSchema>;

export const SignupForm = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token?: string }>();
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [validating, setValidating] = useState(!!token);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
  });

  useEffect(() => {
    if (!token) {
      setValidating(false);
      return;
    }

    const validateToken = async () => {
      const { data, error } = await supabase
        .from("invites")
        .select("email, used_at, expires_at")
        .eq("token", token)
        .single();

      if (error || !data) {
        setError("Invalid invite link");
        setValidating(false);
        return;
      }

      if (data.used_at) {
        setError("This invite has already been used");
        setValidating(false);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError("This invite has expired");
        setValidating(false);
        return;
      }

      setInviteEmail(data.email);
      setValue("email", data.email);
      setValidating(false);
    };

    validateToken();
  }, [token, setValue]);

  const onSubmit = async (values: SignupValues) => {
    try {
      setError(null);
      await signUp(values.email, values.password, values.name);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    }
  };

  if (validating) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Validating invite...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error && !inviteEmail && token) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">
          {token ? "Complete your registration" : "Create admin account"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              readOnly={!!inviteEmail}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Your full name"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
```

- [x] **Step 4: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [x] **Step 5: Commit**

```bash
git add src/features/auth/components/ src/components/ui/
git commit -m "feat(auth): add LoginForm and SignupForm components"
```

---

### Task 7: Route protection and app wiring

**Files:**
- Create: `src/features/auth/components/ProtectedRoute.tsx`
- Create: `src/features/auth/components/RoleGuard.tsx`
- Modify: `src/routes/index.tsx`
- Modify: `src/App.tsx`
- Modify: `src/layouts/AppLayout.tsx`

- [x] **Step 1: Create ProtectedRoute**

Create `src/features/auth/components/ProtectedRoute.tsx`:

```tsx
import { Navigate, Outlet } from "react-router";
import { useAuthContext } from "../AuthProvider";

export const ProtectedRoute = () => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
```

- [x] **Step 2: Create RoleGuard**

Create `src/features/auth/components/RoleGuard.tsx`:

```tsx
import { Navigate, Outlet } from "react-router";
import { useAuthContext } from "../AuthProvider";
import type { AppRole } from "@/lib/types";

type RoleGuardProps = {
  allowedRoles: AppRole[];
};

export const RoleGuard = ({ allowedRoles }: RoleGuardProps) => {
  const { profile, loading } = useAuthContext();

  if (loading || !profile) {
    return null;
  }

  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
```

- [x] **Step 3: Update AppLayout with role-based navigation**

Replace `src/layouts/AppLayout.tsx`:

```tsx
import { NavLink, Outlet } from "react-router";
import { useAuthContext } from "@/features/auth/AuthProvider";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", roles: ["admin", "agent", "customer_manager"] },
  { to: "/tickets", label: "Tickets", roles: ["admin", "agent", "customer_manager"] },
  { to: "/companies", label: "Companies", roles: ["admin"] },
  { to: "/agents", label: "Agents", roles: ["admin"] },
  { to: "/customers", label: "Customers", roles: ["customer_manager"] },
] as const;

export const AppLayout = () => {
  const { profile, user } = useAuthContext();
  const { signOut } = useAuth();

  const visibleItems = navItems.filter(
    (item) => profile && (item.roles as readonly string[]).includes(profile.role),
  );

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r bg-muted/40 p-4">
        <h2 className="mb-6 text-lg font-semibold">ServerDesk</h2>
        <nav className="flex flex-1 flex-col gap-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t pt-4">
          <p className="mb-2 truncate text-sm text-muted-foreground">
            {user?.email}
          </p>
          <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
};
```

- [x] **Step 4: Update routes**

Replace `src/routes/index.tsx`:

```tsx
import { createBrowserRouter } from "react-router";
import { AuthLayout } from "@/layouts/AuthLayout";
import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { RoleGuard } from "@/features/auth/components/RoleGuard";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { SignupForm } from "@/features/auth/components/SignupForm";

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: "/login", element: <LoginForm /> },
      { path: "/signup", element: <SignupForm /> },
      { path: "/signup/:token", element: <SignupForm /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: "/", element: <div>Dashboard — coming soon</div> },
          {
            path: "/tickets",
            element: <div>Tickets — coming soon</div>,
          },
          {
            element: <RoleGuard allowedRoles={["admin"]} />,
            children: [
              {
                path: "/companies",
                element: <div>Companies — coming soon</div>,
              },
              {
                path: "/agents",
                element: <div>Agents — coming soon</div>,
              },
            ],
          },
          {
            element: <RoleGuard allowedRoles={["customer_manager"]} />,
            children: [
              {
                path: "/customers",
                element: <div>Customers — coming soon</div>,
              },
            ],
          },
        ],
      },
    ],
  },
]);
```

- [x] **Step 5: Wrap App with AuthProvider**

Replace `src/App.tsx`:

```tsx
import { RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { router } from "@/routes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
};
```

- [x] **Step 6: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

- [x] **Step 7: Commit**

```bash
git add src/features/auth/components/ src/routes/index.tsx src/App.tsx src/layouts/AppLayout.tsx
git commit -m "feat(auth): add route protection, role guards, and app wiring"
```

---

## Phase C: Admin Features

### Task 8: Companies — hooks and list page

**Files:**
- Create: `src/features/companies/types.ts`
- Create: `src/features/companies/hooks/useCompanies.ts`
- Create: `src/features/companies/hooks/useCompany.ts`
- Create: `src/features/companies/components/CompanyList.tsx`
- Modify: `src/routes/index.tsx`

- [x] **Step 1: Install shadcn table and dialog components**

```bash
npx shadcn@latest add table dialog badge textarea select -y
```

- [x] **Step 2: Create company types**

Create `src/features/companies/types.ts`:

```ts
import type { Company } from "@/lib/types";

export type CompanyWithCounts = Company & {
  customer_count: number;
  ticket_count: number;
};
```

- [x] **Step 3: Create useCompanies hook**

Create `src/features/companies/hooks/useCompanies.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Company } from "@/lib/types";

export const useCompanies = () => {
  return useQuery<Company[]>({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("companies")
        .insert({ name })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
};

export const useUpdateCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from("companies")
        .update({ name, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
};

export const useDeleteCompany = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
};
```

- [x] **Step 4: Create useCompany hook**

Create `src/features/companies/hooks/useCompany.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Company } from "@/lib/types";

export const useCompany = (id: string | undefined) => {
  return useQuery<Company | null>({
    queryKey: ["company", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};
```

- [x] **Step 5: Create CompanyList component**

Create `src/features/companies/components/CompanyList.tsx`:

```tsx
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompanies } from "../hooks/useCompanies";
import { CompanyForm } from "./CompanyForm";

export const CompanyList = () => {
  const { data: companies, isLoading } = useCompanies();
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) {
    return <p className="text-muted-foreground">Loading companies...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Companies</h1>
        <Button onClick={() => setShowCreate(true)}>New Company</Button>
      </div>

      {showCreate && (
        <CompanyForm onClose={() => setShowCreate(false)} />
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Created</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies?.map((company) => (
            <TableRow key={company.id}>
              <TableCell className="font-medium">{company.name}</TableCell>
              <TableCell>
                {new Date(company.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Link to={`/companies/${company.id}`}>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
          {companies?.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                No companies yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
```

- [x] **Step 6: Create CompanyForm component**

Create `src/features/companies/components/CompanyForm.tsx`:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateCompany } from "../hooks/useCompanies";

const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
});

type CompanyValues = z.infer<typeof companySchema>;

type CompanyFormProps = {
  onClose: () => void;
};

export const CompanyForm = ({ onClose }: CompanyFormProps) => {
  const createCompany = useCreateCompany();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyValues>({
    resolver: zodResolver(companySchema),
  });

  const onSubmit = async (values: CompanyValues) => {
    await createCompany.mutateAsync(values.name);
    onClose();
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <Label htmlFor="company-name">Company name</Label>
            <Input
              id="company-name"
              placeholder="Enter company name"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <Button type="submit" disabled={createCompany.isPending}>
            {createCompany.isPending ? "Creating..." : "Create"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
```

- [x] **Step 7: Wire CompanyList into routes**

Update `src/routes/index.tsx` — replace the companies placeholder route:

Change:
```tsx
{ path: "/companies", element: <div>Companies — coming soon</div> }
```
To:
```tsx
{ path: "/companies", element: <CompanyList /> }
```

Add the import at the top:
```tsx
import { CompanyList } from "@/features/companies/components/CompanyList";
```

- [x] **Step 8: Verify build**

```bash
npm run build
```

- [x] **Step 9: Commit**

```bash
git add src/features/companies/ src/components/ui/ src/routes/index.tsx
git commit -m "feat(companies): add company list, create form, and hooks"
```

---

### Task 9: Company detail page with CM invite

**Files:**
- Create: `src/features/companies/components/CompanyDetail.tsx`
- Create: `src/features/companies/components/InviteCMDialog.tsx`
- Create: `src/features/companies/hooks/useCreateInvite.ts`
- Modify: `src/routes/index.tsx`

- [x] **Step 1: Create useCreateInvite hook**

Create `src/features/companies/hooks/useCreateInvite.ts`:

```ts
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AppRole } from "@/lib/types";

type CreateInviteParams = {
  email: string;
  role: AppRole;
  companyIds: string[];
};

const generateToken = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
};

export const useCreateInvite = () => {
  return useMutation({
    mutationFn: async ({ email, role, companyIds }: CreateInviteParams) => {
      const token = generateToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 day expiry

      const { data: invite, error: inviteError } = await supabase
        .from("invites")
        .insert({
          email,
          role,
          token,
          invited_by: (await supabase.auth.getUser()).data.user!.id,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      if (companyIds.length > 0) {
        const { error: icError } = await supabase
          .from("invite_companies")
          .insert(
            companyIds.map((companyId) => ({
              invite_id: invite.id,
              company_id: companyId,
            })),
          );
        if (icError) throw icError;
      }

      return { invite, token };
    },
  });
};
```

- [x] **Step 2: Create InviteCMDialog**

Create `src/features/companies/components/InviteCMDialog.tsx`:

```tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCreateInvite } from "../hooks/useCreateInvite";

const inviteSchema = z.object({
  email: z.email("Please enter a valid email"),
});

type InviteValues = z.infer<typeof inviteSchema>;

type InviteCMDialogProps = {
  companyId: string;
  companyName: string;
};

export const InviteCMDialog = ({
  companyId,
  companyName,
}: InviteCMDialogProps) => {
  const [open, setOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const createInvite = useCreateInvite();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
  });

  const onSubmit = async (values: InviteValues) => {
    const result = await createInvite.mutateAsync({
      email: values.email,
      role: "customer_manager",
      companyIds: [companyId],
    });
    setInviteLink(`${window.location.origin}/signup/${result.token}`);
  };

  const handleCopy = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setInviteLink(null);
    setCopied(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button variant="outline">Invite Customer Manager</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Customer Manager to {companyName}</DialogTitle>
        </DialogHeader>
        {inviteLink ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this link with the customer manager:
            </p>
            <div className="flex gap-2">
              <Input value={inviteLink} readOnly />
              <Button onClick={handleCopy}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <Button variant="outline" className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="manager@company.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={createInvite.isPending}
            >
              {createInvite.isPending ? "Creating invite..." : "Generate invite link"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
```

- [x] **Step 3: Create CompanyDetail**

Create `src/features/companies/components/CompanyDetail.tsx`:

```tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompany } from "../hooks/useCompany";
import { useUpdateCompany, useDeleteCompany } from "../hooks/useCompanies";
import { InviteCMDialog } from "./InviteCMDialog";

const editSchema = z.object({
  name: z.string().min(1, "Company name is required"),
});

type EditValues = z.infer<typeof editSchema>;

export const CompanyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: company, isLoading } = useCompany(id);
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();
  const [editing, setEditing] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditValues>({
    values: { name: company?.name ?? "" },
    resolver: zodResolver(editSchema),
  });

  if (isLoading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  if (!company) {
    return <p className="text-destructive">Company not found</p>;
  }

  const onSubmit = async (values: EditValues) => {
    await updateCompany.mutateAsync({ id: company.id, name: values.name });
    setEditing(false);
  };

  const handleDelete = async () => {
    if (confirm("Delete this company? This will also delete all related data.")) {
      await deleteCompany.mutateAsync(company.id);
      navigate("/companies");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{company.name}</h1>
        <div className="flex gap-2">
          <InviteCMDialog companyId={company.id} companyName={company.name} />
          <Button variant="outline" onClick={() => setEditing(!editing)}>
            {editing ? "Cancel" : "Edit"}
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      {editing && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Company</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" {...register("name")} />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={updateCompany.isPending}>
                Save
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Company Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Created:</span>{" "}
            {new Date(company.created_at).toLocaleDateString()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
```

- [x] **Step 4: Add company detail route**

In `src/routes/index.tsx`, add the import and route:

Add import:
```tsx
import { CompanyDetail } from "@/features/companies/components/CompanyDetail";
```

Add route inside the admin `RoleGuard` children, after the `/companies` route:
```tsx
{ path: "/companies/:id", element: <CompanyDetail /> },
```

- [x] **Step 5: Verify build**

```bash
npm run build
```

- [x] **Step 6: Commit**

```bash
git add src/features/companies/ src/routes/index.tsx
git commit -m "feat(companies): add company detail page with CM invite dialog"
```

---

### Task 10: Agents — list, invite, and company assignment

**Files:**
- Create: `src/features/agents/types.ts`
- Create: `src/features/agents/hooks/useAgents.ts`
- Create: `src/features/agents/hooks/useAgent.ts`
- Create: `src/features/agents/hooks/useAgentCompanies.ts`
- Create: `src/features/agents/components/AgentList.tsx`
- Create: `src/features/agents/components/InviteAgentDialog.tsx`
- Create: `src/features/agents/components/AssignCompaniesDialog.tsx`
- Modify: `src/routes/index.tsx`

- [x] **Step 1: Create agent types**

Create `src/features/agents/types.ts`:

```ts
import type { Profile, Company } from "@/lib/types";

export type AgentWithCompanies = Profile & {
  email: string;
  companies: Company[];
};
```

- [x] **Step 2: Create useAgents hook**

Create `src/features/agents/hooks/useAgents.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AgentWithCompanies } from "../types";

export const useAgents = () => {
  return useQuery<AgentWithCompanies[]>({
    queryKey: ["agents"],
    queryFn: async () => {
      // Get all agent profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "agent")
        .order("name");

      if (profilesError) throw profilesError;

      // Get emails from auth (via a join on user_id)
      // Since we can't directly query auth.users, we'll use the admin API
      // For now, get user_companies and companies for each agent
      const agents: AgentWithCompanies[] = [];

      for (const profile of profiles) {
        const { data: userCompanies } = await supabase
          .from("user_companies")
          .select("company_id, companies(*)")
          .eq("user_id", profile.user_id);

        const { data: userData } = await supabase.auth.admin.getUserById(
          profile.user_id,
        );

        agents.push({
          ...profile,
          email: userData?.user?.email ?? "",
          companies:
            userCompanies?.map(
              (uc) => uc.companies as unknown as AgentWithCompanies["companies"][number],
            ) ?? [],
        });
      }

      return agents;
    },
  });
};
```

- [x] **Step 3: Create useAgentCompanies hook**

Create `src/features/agents/hooks/useAgentCompanies.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const useUpdateAgentCompanies = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agentId,
      companyIds,
    }: {
      agentId: string;
      companyIds: string[];
    }) => {
      // Delete existing assignments
      const { error: deleteError } = await supabase
        .from("user_companies")
        .delete()
        .eq("user_id", agentId);

      if (deleteError) throw deleteError;

      // Insert new assignments
      if (companyIds.length > 0) {
        const { error: insertError } = await supabase
          .from("user_companies")
          .insert(
            companyIds.map((companyId) => ({
              user_id: agentId,
              company_id: companyId,
            })),
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });
};
```

- [x] **Step 4: Create InviteAgentDialog**

Create `src/features/agents/components/InviteAgentDialog.tsx`:

```tsx
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCompanies } from "@/features/companies/hooks/useCompanies";
import { useCreateInvite } from "@/features/companies/hooks/useCreateInvite";

const inviteSchema = z.object({
  email: z.email("Please enter a valid email"),
});

type InviteValues = z.infer<typeof inviteSchema>;

export const InviteAgentDialog = () => {
  const [open, setOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const { data: companies } = useCompanies();
  const createInvite = useCreateInvite();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
  });

  const toggleCompany = (companyId: string) => {
    setSelectedCompanies((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId],
    );
  };

  const onSubmit = async (values: InviteValues) => {
    const result = await createInvite.mutateAsync({
      email: values.email,
      role: "agent",
      companyIds: selectedCompanies,
    });
    setInviteLink(`${window.location.origin}/signup/${result.token}`);
  };

  const handleCopy = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setInviteLink(null);
    setCopied(false);
    setSelectedCompanies([]);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        <Button>Invite Agent</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Agent</DialogTitle>
        </DialogHeader>
        {inviteLink ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this link with the agent:
            </p>
            <div className="flex gap-2">
              <Input value={inviteLink} readOnly />
              <Button onClick={handleCopy}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <Button variant="outline" className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent-email">Email address</Label>
              <Input
                id="agent-email"
                type="email"
                placeholder="agent@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Assign to companies (optional)</Label>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                {companies?.map((company) => (
                  <label
                    key={company.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCompanies.includes(company.id)}
                      onChange={() => toggleCompany(company.id)}
                    />
                    {company.name}
                  </label>
                ))}
                {companies?.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No companies created yet
                  </p>
                )}
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={createInvite.isPending}
            >
              {createInvite.isPending
                ? "Creating invite..."
                : "Generate invite link"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
```

- [x] **Step 5: Create AssignCompaniesDialog**

Create `src/features/agents/components/AssignCompaniesDialog.tsx`:

```tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useCompanies } from "@/features/companies/hooks/useCompanies";
import { useUpdateAgentCompanies } from "../hooks/useAgentCompanies";
import type { AgentWithCompanies } from "../types";

type AssignCompaniesDialogProps = {
  agent: AgentWithCompanies;
};

export const AssignCompaniesDialog = ({
  agent,
}: AssignCompaniesDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { data: companies } = useCompanies();
  const updateCompanies = useUpdateAgentCompanies();

  useEffect(() => {
    if (open) {
      setSelectedIds(agent.companies.map((c) => c.id));
    }
  }, [open, agent.companies]);

  const toggleCompany = (companyId: string) => {
    setSelectedIds((prev) =>
      prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId],
    );
  };

  const handleSave = async () => {
    await updateCompanies.mutateAsync({
      agentId: agent.user_id,
      companyIds: selectedIds,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Edit companies
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign companies to {agent.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Companies</Label>
            <div className="max-h-60 space-y-2 overflow-y-auto rounded-md border p-3">
              {companies?.map((company) => (
                <label
                  key={company.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(company.id)}
                    onChange={() => toggleCompany(company.id)}
                  />
                  {company.name}
                </label>
              ))}
            </div>
          </div>
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={updateCompanies.isPending}
          >
            {updateCompanies.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

- [x] **Step 6: Create AgentList**

Create `src/features/agents/components/AgentList.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAgents } from "../hooks/useAgents";
import { InviteAgentDialog } from "./InviteAgentDialog";
import { AssignCompaniesDialog } from "./AssignCompaniesDialog";

export const AgentList = () => {
  const { data: agents, isLoading } = useAgents();

  if (isLoading) {
    return <p className="text-muted-foreground">Loading agents...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agents</h1>
        <InviteAgentDialog />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Companies</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {agents?.map((agent) => (
            <TableRow key={agent.user_id}>
              <TableCell className="font-medium">{agent.name}</TableCell>
              <TableCell>{agent.email}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {agent.companies.map((c) => (
                    <Badge key={c.id} variant="secondary">
                      {c.name}
                    </Badge>
                  ))}
                  {agent.companies.length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      No companies
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <AssignCompaniesDialog agent={agent} />
              </TableCell>
            </TableRow>
          ))}
          {agents?.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No agents yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
```

- [x] **Step 7: Wire AgentList into routes**

In `src/routes/index.tsx`, add the import:
```tsx
import { AgentList } from "@/features/agents/components/AgentList";
```

Replace the agents placeholder:
```tsx
{ path: "/agents", element: <AgentList /> },
```

- [x] **Step 8: Verify build**

```bash
npm run build
```

- [x] **Step 9: Commit**

```bash
git add src/features/agents/ src/routes/index.tsx
git commit -m "feat(agents): add agent list, invite dialog, and company assignment"
```

---

## Phase D: Customer Manager Features

### Task 11: Customers — list and form

**Files:**
- Create: `src/features/customers/types.ts`
- Create: `src/features/customers/hooks/useCustomers.ts`
- Create: `src/features/customers/components/CustomerList.tsx`
- Create: `src/features/customers/components/CustomerForm.tsx`
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Create customer types**

Create `src/features/customers/types.ts`:

```ts
import type { Customer } from "@/lib/types";

export type CustomerFormValues = {
  name: string;
  email: string;
};

export type { Customer };
```

- [ ] **Step 2: Create useCustomers hook**

Create `src/features/customers/hooks/useCustomers.ts`:

```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Customer } from "@/lib/types";

export const useCustomers = () => {
  return useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      email,
      companyId,
    }: {
      name: string;
      email: string;
      companyId: string;
    }) => {
      const { data, error } = await supabase
        .from("customers")
        .insert({ name, email, company_id: companyId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      email,
    }: {
      id: string;
      name: string;
      email: string;
    }) => {
      const { data, error } = await supabase
        .from("customers")
        .update({ name, email })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
};
```

- [ ] **Step 3: Create CustomerForm**

Create `src/features/customers/components/CustomerForm.tsx`:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCreateCustomer, useUpdateCustomer } from "../hooks/useCustomers";
import type { Customer } from "@/lib/types";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Please enter a valid email"),
});

type CustomerValues = z.infer<typeof customerSchema>;

type CustomerFormProps = {
  companyId: string;
  customer?: Customer;
  onClose: () => void;
};

export const CustomerForm = ({
  companyId,
  customer,
  onClose,
}: CustomerFormProps) => {
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const isEditing = !!customer;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer
      ? { name: customer.name, email: customer.email }
      : undefined,
  });

  const onSubmit = async (values: CustomerValues) => {
    if (isEditing) {
      await updateCustomer.mutateAsync({
        id: customer.id,
        name: values.name,
        email: values.email,
      });
    } else {
      await createCustomer.mutateAsync({
        name: values.name,
        email: values.email,
        companyId,
      });
    }
    onClose();
  };

  const isPending = createCustomer.isPending || updateCustomer.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Customer" : "New Customer"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer-name">Name</Label>
            <Input id="customer-name" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-email">Email</Label>
            <Input id="customer-email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEditing ? "Save" : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 4: Create CustomerList**

Create `src/features/customers/components/CustomerList.tsx`:

```tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCustomers } from "../hooks/useCustomers";
import { useAuthContext } from "@/features/auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { CustomerForm } from "./CustomerForm";
import type { Customer } from "@/lib/types";

export const CustomerList = () => {
  const { data: customers, isLoading } = useCustomers();
  const { user } = useAuthContext();
  const [showCreate, setShowCreate] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Get the CM's company ID
  const { data: userCompany } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_companies")
        .select("company_id")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading) {
    return <p className="text-muted-foreground">Loading customers...</p>;
  }

  const companyId = userCompany?.company_id;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Button onClick={() => setShowCreate(true)}>New Customer</Button>
      </div>

      {showCreate && companyId && (
        <CustomerForm
          companyId={companyId}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editingCustomer && companyId && (
        <CustomerForm
          companyId={companyId}
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
        />
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Created</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers?.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell className="font-medium">{customer.name}</TableCell>
              <TableCell>{customer.email}</TableCell>
              <TableCell>
                {new Date(customer.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingCustomer(customer)}
                >
                  Edit
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {customers?.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No customers yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
```

- [ ] **Step 5: Wire CustomerList into routes**

In `src/routes/index.tsx`, add the import:
```tsx
import { CustomerList } from "@/features/customers/components/CustomerList";
```

Replace the customers placeholder:
```tsx
{ path: "/customers", element: <CustomerList /> },
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add src/features/customers/ src/routes/index.tsx
git commit -m "feat(customers): add customer list, create/edit form"
```

---

## Phase E: Ticket Management

### Task 12: Tickets — hooks and list with filters

**Files:**
- Create: `src/features/tickets/types.ts`
- Create: `src/features/tickets/hooks/useTickets.ts`
- Create: `src/features/tickets/hooks/useUpdateTicket.ts`
- Create: `src/features/tickets/components/TicketStatusBadge.tsx`
- Create: `src/features/tickets/components/TicketPriorityBadge.tsx`
- Create: `src/features/tickets/components/TicketFilters.tsx`
- Create: `src/features/tickets/components/TicketList.tsx`
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Create ticket types**

Create `src/features/tickets/types.ts`:

```ts
import type { Ticket, TicketStatus, TicketPriority } from "@/lib/types";

export type TicketWithRelations = Ticket & {
  customers: { name: string; email: string } | null;
  companies: { name: string } | null;
};

export type TicketFiltersState = {
  status?: TicketStatus;
  priority?: TicketPriority;
  companyId?: string;
};
```

- [ ] **Step 2: Create useTickets hook**

Create `src/features/tickets/hooks/useTickets.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { TicketWithRelations, TicketFiltersState } from "../types";

export const useTickets = (filters: TicketFiltersState = {}) => {
  return useQuery<TicketWithRelations[]>({
    queryKey: ["tickets", filters],
    queryFn: async () => {
      let query = supabase
        .from("tickets")
        .select("*, customers(name, email), companies(name)")
        .order("created_at", { ascending: false });

      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.priority) {
        query = query.eq("priority", filters.priority);
      }
      if (filters.companyId) {
        query = query.eq("company_id", filters.companyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TicketWithRelations[];
    },
  });
};
```

- [ ] **Step 3: Create useUpdateTicket hook**

Create `src/features/tickets/hooks/useUpdateTicket.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { TicketStatus, TicketPriority } from "@/lib/types";

type UpdateTicketParams = {
  id: string;
  status?: TicketStatus;
  priority?: TicketPriority;
};

export const useUpdateTicket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTicketParams) => {
      const { data, error } = await supabase
        .from("tickets")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
};
```

- [ ] **Step 4: Create TicketStatusBadge and TicketPriorityBadge**

Create `src/features/tickets/components/TicketStatusBadge.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import type { TicketStatus } from "@/lib/types";

const statusConfig: Record<TicketStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  open: { label: "Open", variant: "default" },
  in_progress: { label: "In Progress", variant: "secondary" },
  waiting: { label: "Waiting", variant: "outline" },
  resolved: { label: "Resolved", variant: "secondary" },
  closed: { label: "Closed", variant: "outline" },
};

export const TicketStatusBadge = ({ status }: { status: TicketStatus }) => {
  const config = statusConfig[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
};
```

Create `src/features/tickets/components/TicketPriorityBadge.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import type { TicketPriority } from "@/lib/types";

const priorityConfig: Record<TicketPriority, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  low: { label: "Low", variant: "outline" },
  medium: { label: "Medium", variant: "secondary" },
  high: { label: "High", variant: "default" },
  urgent: { label: "Urgent", variant: "destructive" },
};

export const TicketPriorityBadge = ({ priority }: { priority: TicketPriority }) => {
  const config = priorityConfig[priority];
  return <Badge variant={config.variant}>{config.label}</Badge>;
};
```

- [ ] **Step 5: Create TicketFilters**

Create `src/features/tickets/components/TicketFilters.tsx`:

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCompanies } from "@/features/companies/hooks/useCompanies";
import { useAuthContext } from "@/features/auth/AuthProvider";
import type { TicketFiltersState } from "../types";
import type { TicketStatus, TicketPriority } from "@/lib/types";

type TicketFiltersProps = {
  filters: TicketFiltersState;
  onChange: (filters: TicketFiltersState) => void;
};

const statuses: TicketStatus[] = [
  "open",
  "in_progress",
  "waiting",
  "resolved",
  "closed",
];

const priorities: TicketPriority[] = ["low", "medium", "high", "urgent"];

export const TicketFilters = ({ filters, onChange }: TicketFiltersProps) => {
  const { profile } = useAuthContext();
  const { data: companies } = useCompanies();
  const isAdmin = profile?.role === "admin";

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={filters.status ?? "all"}
        onValueChange={(v) =>
          onChange({
            ...filters,
            status: v === "all" ? undefined : (v as TicketStatus),
          })
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {statuses.map((s) => (
            <SelectItem key={s} value={s}>
              {s.replace("_", " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority ?? "all"}
        onValueChange={(v) =>
          onChange({
            ...filters,
            priority: v === "all" ? undefined : (v as TicketPriority),
          })
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All priorities</SelectItem>
          {priorities.map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isAdmin && (
        <Select
          value={filters.companyId ?? "all"}
          onValueChange={(v) =>
            onChange({
              ...filters,
              companyId: v === "all" ? undefined : v,
            })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            {companies?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {(filters.status || filters.priority || filters.companyId) && (
        <Button variant="ghost" onClick={() => onChange({})}>
          Clear filters
        </Button>
      )}
    </div>
  );
};
```

- [ ] **Step 6: Create TicketList**

Create `src/features/tickets/components/TicketList.tsx`:

```tsx
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthContext } from "@/features/auth/AuthProvider";
import { useTickets } from "../hooks/useTickets";
import { TicketFilters } from "./TicketFilters";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { TicketPriorityBadge } from "./TicketPriorityBadge";
import type { TicketFiltersState } from "../types";

export const TicketList = () => {
  const { profile } = useAuthContext();
  const [filters, setFilters] = useState<TicketFiltersState>({});
  const { data: tickets, isLoading } = useTickets(filters);
  const isAdmin = profile?.role === "admin";
  const isCM = profile?.role === "customer_manager";

  if (isLoading) {
    return <p className="text-muted-foreground">Loading tickets...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tickets</h1>
        {isCM && (
          <Link to="/tickets/new">
            <Button>New Ticket</Button>
          </Link>
        )}
      </div>

      <TicketFilters filters={filters} onChange={setFilters} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Customer</TableHead>
            {isAdmin && <TableHead>Company</TableHead>}
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets?.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell>
                <Link
                  to={`/tickets/${ticket.id}`}
                  className="font-medium hover:underline"
                >
                  {ticket.subject}
                </Link>
              </TableCell>
              <TableCell>
                <TicketStatusBadge status={ticket.status} />
              </TableCell>
              <TableCell>
                <TicketPriorityBadge priority={ticket.priority} />
              </TableCell>
              <TableCell>{ticket.customers?.name ?? "—"}</TableCell>
              {isAdmin && (
                <TableCell>{ticket.companies?.name ?? "—"}</TableCell>
              )}
              <TableCell>
                {new Date(ticket.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
          {tickets?.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={isAdmin ? 6 : 5}
                className="text-center text-muted-foreground"
              >
                No tickets found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
```

- [ ] **Step 7: Wire TicketList into routes**

In `src/routes/index.tsx`, add the import:
```tsx
import { TicketList } from "@/features/tickets/components/TicketList";
```

Replace the tickets placeholder:
```tsx
{ path: "/tickets", element: <TicketList /> },
```

- [ ] **Step 8: Verify build**

```bash
npm run build
```

- [ ] **Step 9: Commit**

```bash
git add src/features/tickets/ src/routes/index.tsx
git commit -m "feat(tickets): add ticket list with filters, status/priority badges"
```

---

### Task 13: Ticket detail page with message thread

**Files:**
- Create: `src/features/tickets/hooks/useTicket.ts`
- Create: `src/features/tickets/hooks/useTicketMessages.ts`
- Create: `src/features/tickets/hooks/useCreateMessage.ts`
- Create: `src/features/tickets/components/TicketMessageThread.tsx`
- Create: `src/features/tickets/components/TicketDetail.tsx`
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Create useTicket hook**

Create `src/features/tickets/hooks/useTicket.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { TicketWithRelations } from "../types";

export const useTicket = (id: string | undefined) => {
  return useQuery<TicketWithRelations | null>({
    queryKey: ["ticket", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("tickets")
        .select("*, customers(name, email), companies(name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as TicketWithRelations;
    },
    enabled: !!id,
  });
};
```

- [ ] **Step 2: Create useTicketMessages hook**

Create `src/features/tickets/hooks/useTicketMessages.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { TicketMessage } from "@/lib/types";

export type MessageWithSender = TicketMessage & {
  sender_name: string;
};

export const useTicketMessages = (ticketId: string | undefined) => {
  return useQuery<MessageWithSender[]>({
    queryKey: ["ticket-messages", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Resolve sender names
      const messages: MessageWithSender[] = [];
      for (const msg of data) {
        let senderName = "System";
        if (msg.sender_type === "agent" && msg.sender_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name")
            .eq("user_id", msg.sender_id)
            .single();
          senderName = profile?.name ?? "Agent";
        } else if (msg.sender_type === "customer" && msg.sender_id) {
          const { data: customer } = await supabase
            .from("customers")
            .select("name")
            .eq("id", msg.sender_id)
            .single();
          senderName = customer?.name ?? "Customer";
        }
        messages.push({ ...msg, sender_name: senderName });
      }

      return messages;
    },
    enabled: !!ticketId,
  });
};
```

- [ ] **Step 3: Create useCreateMessage hook**

Create `src/features/tickets/hooks/useCreateMessage.ts`:

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

type CreateMessageParams = {
  ticketId: string;
  body: string;
  senderType: "agent" | "customer_manager";
  senderId: string;
};

export const useCreateMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      body,
      senderType,
      senderId,
    }: CreateMessageParams) => {
      const { data, error } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: ticketId,
          body,
          sender_type: senderType === "customer_manager" ? "agent" : senderType,
          sender_id: senderId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["ticket-messages", variables.ticketId],
      });
    },
  });
};
```

- [ ] **Step 4: Create TicketMessageThread**

Create `src/features/tickets/components/TicketMessageThread.tsx`:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthContext } from "@/features/auth/AuthProvider";
import { useTicketMessages } from "../hooks/useTicketMessages";
import { useCreateMessage } from "../hooks/useCreateMessage";
import { cn } from "@/lib/utils";

const replySchema = z.object({
  body: z.string().min(1, "Message cannot be empty"),
});

type ReplyValues = z.infer<typeof replySchema>;

type TicketMessageThreadProps = {
  ticketId: string;
};

export const TicketMessageThread = ({
  ticketId,
}: TicketMessageThreadProps) => {
  const { user, profile } = useAuthContext();
  const { data: messages, isLoading } = useTicketMessages(ticketId);
  const createMessage = useCreateMessage();

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<ReplyValues>({
      resolver: zodResolver(replySchema),
    });

  const onSubmit = async (values: ReplyValues) => {
    if (!user || !profile) return;
    await createMessage.mutateAsync({
      ticketId,
      body: values.body,
      senderType: profile.role === "agent" ? "agent" : "customer_manager",
      senderId: user.id,
    });
    reset();
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Loading messages...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {messages?.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "rounded-lg border p-4",
              msg.sender_type === "customer"
                ? "bg-muted/50"
                : msg.sender_type === "system"
                  ? "bg-muted/30 text-center text-sm italic"
                  : "bg-background",
            )}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium">{msg.sender_name}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(msg.created_at).toLocaleString()}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{msg.body}</p>
          </div>
        ))}
        {messages?.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            No messages yet
          </p>
        )}
      </div>

      {profile && profile.role !== "admin" && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
          <Textarea
            placeholder="Type your reply..."
            rows={3}
            {...register("body")}
          />
          {errors.body && (
            <p className="text-sm text-destructive">{errors.body.message}</p>
          )}
          <Button type="submit" disabled={createMessage.isPending}>
            {createMessage.isPending ? "Sending..." : "Send reply"}
          </Button>
        </form>
      )}
    </div>
  );
};
```

- [ ] **Step 5: Create TicketDetail**

Create `src/features/tickets/components/TicketDetail.tsx`:

```tsx
import { useParams, Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthContext } from "@/features/auth/AuthProvider";
import { useTicket } from "../hooks/useTicket";
import { useUpdateTicket } from "../hooks/useUpdateTicket";
import { TicketStatusBadge } from "./TicketStatusBadge";
import { TicketPriorityBadge } from "./TicketPriorityBadge";
import { TicketMessageThread } from "./TicketMessageThread";
import type { TicketStatus, TicketPriority } from "@/lib/types";

const statuses: TicketStatus[] = [
  "open",
  "in_progress",
  "waiting",
  "resolved",
  "closed",
];
const priorities: TicketPriority[] = ["low", "medium", "high", "urgent"];

export const TicketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: ticket, isLoading } = useTicket(id);
  const { profile } = useAuthContext();
  const updateTicket = useUpdateTicket();
  const canEdit = profile?.role === "agent" || profile?.role === "customer_manager";

  if (isLoading) {
    return <p className="text-muted-foreground">Loading ticket...</p>;
  }

  if (!ticket) {
    return <p className="text-destructive">Ticket not found</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/tickets">
          <Button variant="ghost" size="sm">
            &larr; Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">{ticket.subject}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {ticket.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <TicketMessageThread ticketId={ticket.id} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Status</p>
                {canEdit ? (
                  <Select
                    value={ticket.status}
                    onValueChange={(v) =>
                      updateTicket.mutate({
                        id: ticket.id,
                        status: v as TicketStatus,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <TicketStatusBadge status={ticket.status} />
                )}
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">Priority</p>
                {canEdit ? (
                  <Select
                    value={ticket.priority}
                    onValueChange={(v) =>
                      updateTicket.mutate({
                        id: ticket.id,
                        priority: v as TicketPriority,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <TicketPriorityBadge priority={ticket.priority} />
                )}
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">Customer</p>
                <p className="text-sm">{ticket.customers?.name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {ticket.customers?.email}
                </p>
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">Company</p>
                <p className="text-sm">{ticket.companies?.name ?? "—"}</p>
              </div>

              <div>
                <p className="mb-1 text-sm text-muted-foreground">Created</p>
                <p className="text-sm">
                  {new Date(ticket.created_at).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 6: Add ticket detail route**

In `src/routes/index.tsx`, add the import:
```tsx
import { TicketDetail } from "@/features/tickets/components/TicketDetail";
```

Add route after the `/tickets` route (inside the AppLayout children, NOT inside a RoleGuard):
```tsx
{ path: "/tickets/:id", element: <TicketDetail /> },
```

- [ ] **Step 7: Verify build**

```bash
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add src/features/tickets/ src/routes/index.tsx
git commit -m "feat(tickets): add ticket detail page with message thread"
```

---

### Task 14: Create ticket form (customer manager only)

**Files:**
- Create: `src/features/tickets/components/CreateTicketForm.tsx`
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Create CreateTicketForm**

Create `src/features/tickets/components/CreateTicketForm.tsx`:

```tsx
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuthContext } from "@/features/auth/AuthProvider";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import type { TicketPriority } from "@/lib/types";

const createTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  description: z.string().optional(),
  customerId: z.string().min(1, "Please select a customer"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

type CreateTicketValues = z.infer<typeof createTicketSchema>;

export const CreateTicketForm = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { data: customers } = useCustomers();
  const queryClient = useQueryClient();

  // Get the CM's company
  const { data: userCompany } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_companies")
        .select("company_id")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateTicketValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: { priority: "medium" },
  });

  const createTicket = useMutation({
    mutationFn: async (values: CreateTicketValues) => {
      const { data, error } = await supabase
        .from("tickets")
        .insert({
          subject: values.subject,
          description: values.description || null,
          customer_id: values.customerId,
          company_id: userCompany!.company_id,
          created_by: user!.id,
          priority: values.priority as TicketPriority,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      navigate(`/tickets/${data.id}`);
    },
  });

  const onSubmit = (values: CreateTicketValues) => {
    createTicket.mutate(values);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">New Ticket</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" {...register("subject")} />
              {errors.subject && (
                <p className="text-sm text-destructive">
                  {errors.subject.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={4}
                {...register("description")}
              />
            </div>

            <div className="space-y-2">
              <Label>Customer</Label>
              <Select
                value={watch("customerId") ?? ""}
                onValueChange={(v) => setValue("customerId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.customerId && (
                <p className="text-sm text-destructive">
                  {errors.customerId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={watch("priority")}
                onValueChange={(v) =>
                  setValue("priority", v as CreateTicketValues["priority"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={createTicket.isPending}>
                {createTicket.isPending ? "Creating..." : "Create Ticket"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/tickets")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
```

- [ ] **Step 2: Add create ticket route**

In `src/routes/index.tsx`, add the import:
```tsx
import { CreateTicketForm } from "@/features/tickets/components/CreateTicketForm";
```

Add a route inside the `customer_manager` RoleGuard children:
```tsx
{ path: "/tickets/new", element: <CreateTicketForm /> },
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/features/tickets/components/CreateTicketForm.tsx src/routes/index.tsx
git commit -m "feat(tickets): add create ticket form for customer managers"
```

---

## Phase F: Dashboard

### Task 15: Dashboard with role-specific stats

**Files:**
- Create: `src/features/dashboard/types.ts`
- Create: `src/features/dashboard/hooks/useDashboardStats.ts`
- Create: `src/features/dashboard/components/StatCard.tsx`
- Create: `src/features/dashboard/components/DashboardStats.tsx`
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Create dashboard types**

Create `src/features/dashboard/types.ts`:

```ts
import type { TicketStatus } from "@/lib/types";

export type DashboardStatsData = {
  companyCount?: number;
  agentCount?: number;
  customerCount?: number;
  ticketCount: number;
  ticketsByStatus: Record<TicketStatus, number>;
};
```

- [ ] **Step 2: Create useDashboardStats hook**

Create `src/features/dashboard/hooks/useDashboardStats.ts`:

```ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthContext } from "@/features/auth/AuthProvider";
import type { DashboardStatsData } from "../types";
import type { TicketStatus } from "@/lib/types";

const allStatuses: TicketStatus[] = [
  "open",
  "in_progress",
  "waiting",
  "resolved",
  "closed",
];

export const useDashboardStats = () => {
  const { profile } = useAuthContext();

  return useQuery<DashboardStatsData>({
    queryKey: ["dashboard-stats", profile?.role],
    queryFn: async () => {
      const stats: DashboardStatsData = {
        ticketCount: 0,
        ticketsByStatus: {
          open: 0,
          in_progress: 0,
          waiting: 0,
          resolved: 0,
          closed: 0,
        },
      };

      // Ticket count (RLS handles scoping)
      const { count: ticketCount } = await supabase
        .from("tickets")
        .select("*", { count: "exact", head: true });
      stats.ticketCount = ticketCount ?? 0;

      // Tickets by status
      for (const status of allStatuses) {
        const { count } = await supabase
          .from("tickets")
          .select("*", { count: "exact", head: true })
          .eq("status", status);
        stats.ticketsByStatus[status] = count ?? 0;
      }

      // Role-specific stats
      if (profile?.role === "admin") {
        const { count: companyCount } = await supabase
          .from("companies")
          .select("*", { count: "exact", head: true });
        stats.companyCount = companyCount ?? 0;

        const { count: agentCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "agent");
        stats.agentCount = agentCount ?? 0;
      }

      if (profile?.role === "customer_manager") {
        const { count: customerCount } = await supabase
          .from("customers")
          .select("*", { count: "exact", head: true });
        stats.customerCount = customerCount ?? 0;
      }

      return stats;
    },
    enabled: !!profile,
  });
};
```

- [ ] **Step 3: Create StatCard**

Create `src/features/dashboard/components/StatCard.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: number;
};

export const StatCard = ({ label, value }: StatCardProps) => {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
};
```

- [ ] **Step 4: Create DashboardStats**

Create `src/features/dashboard/components/DashboardStats.tsx`:

```tsx
import { useAuthContext } from "@/features/auth/AuthProvider";
import { useDashboardStats } from "../hooks/useDashboardStats";
import { StatCard } from "./StatCard";

export const DashboardStats = () => {
  const { profile } = useAuthContext();
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading || !stats || !profile) {
    return <p className="text-muted-foreground">Loading dashboard...</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        {profile.role === "admin" && stats.companyCount !== undefined && (
          <StatCard label="Companies" value={stats.companyCount} />
        )}
        {profile.role === "admin" && stats.agentCount !== undefined && (
          <StatCard label="Agents" value={stats.agentCount} />
        )}
        {profile.role === "customer_manager" &&
          stats.customerCount !== undefined && (
            <StatCard label="Customers" value={stats.customerCount} />
          )}
        <StatCard label="Total Tickets" value={stats.ticketCount} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Tickets by Status</h2>
        <div className="grid gap-4 md:grid-cols-5">
          <StatCard label="Open" value={stats.ticketsByStatus.open} />
          <StatCard
            label="In Progress"
            value={stats.ticketsByStatus.in_progress}
          />
          <StatCard label="Waiting" value={stats.ticketsByStatus.waiting} />
          <StatCard label="Resolved" value={stats.ticketsByStatus.resolved} />
          <StatCard label="Closed" value={stats.ticketsByStatus.closed} />
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 5: Wire DashboardStats into routes**

In `src/routes/index.tsx`, add the import:
```tsx
import { DashboardStats } from "@/features/dashboard/components/DashboardStats";
```

Replace the dashboard placeholder:
```tsx
{ path: "/", element: <DashboardStats /> },
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add src/features/dashboard/ src/routes/index.tsx
git commit -m "feat(dashboard): add role-specific dashboard with stats"
```

---

## Summary

After completing all 15 tasks, ServerDesk Phase 1 will have:

- **Database**: Complete schema with enums, 8 tables, indexes, RLS policies, and signup trigger
- **Auth**: Login, signup (open first + invite token), logout, route protection, role guards
- **Companies**: CRUD (admin), detail page with CM invite dialog
- **Agents**: List with company badges, invite dialog, company assignment
- **Customers**: List and create/edit form (CM only, scoped to company)
- **Tickets**: List with filters, detail page with message thread and reply, create form (CM only)
- **Dashboard**: Role-specific stat cards with ticket status breakdown
- **Generated TypeScript types** from Supabase schema
