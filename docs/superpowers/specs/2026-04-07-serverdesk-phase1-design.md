# ServerDesk Phase 1 — Design Spec

**Goal:** Build the core ServerDesk application: database schema, authentication with invite system, company/agent/customer management, and ticket CRUD with message threads. All scoped by role via Supabase RLS.

**Phase 2 (later):** Email integration (inbound/outbound via Edge Functions), dashboard with stats, Supabase Realtime subscriptions.

---

## Architecture

Feature-first module structure. Each feature (`auth`, `tickets`, `companies`, etc.) contains its own components, hooks, and types. Supabase queries live in feature-specific hooks using TanStack Query for caching. Auth state managed via a shared `AuthProvider` context. RLS handles all authorization at the database level.

**Stack:** React 19, TypeScript (strict), Vite, Tailwind CSS v4, shadcn/ui, Supabase (Auth, Database, RLS), React Router, TanStack Query, zod, react-hook-form, Vitest, Playwright.

---

## Database Schema

### Enums

- `app_role`: `admin`, `agent`, `customer_manager`
- `ticket_status`: `open`, `in_progress`, `waiting`, `resolved`, `closed`
- `ticket_priority`: `low`, `medium`, `high`, `urgent`
- `sender_type`: `customer`, `agent`, `system`

### Tables

#### `profiles`
| Column | Type | Constraints |
|--------|------|-------------|
| user_id | uuid | PK, FK auth.users ON DELETE CASCADE |
| name | text | NOT NULL |
| role | app_role | NOT NULL |
| created_at | timestamptz | DEFAULT now() |

#### `companies`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| name | text | NOT NULL |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

#### `user_companies`
Junction table for both agents and customer managers. Agents can have multiple rows (multiple companies). Customer managers have one row.

| Column | Type | Constraints |
|--------|------|-------------|
| user_id | uuid | PK, FK auth.users ON DELETE CASCADE |
| company_id | uuid | PK, FK companies ON DELETE CASCADE |
| created_at | timestamptz | DEFAULT now() |

#### `invites`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| email | text | NOT NULL |
| role | app_role | NOT NULL |
| token | text | UNIQUE, NOT NULL |
| invited_by | uuid | FK auth.users |
| used_at | timestamptz | nullable |
| expires_at | timestamptz | NOT NULL |
| created_at | timestamptz | DEFAULT now() |

#### `invite_companies`
Junction table linking invites to companies. Required for customer_manager invites (exactly one company). Optional for agent invites (zero or more companies).

| Column | Type | Constraints |
|--------|------|-------------|
| invite_id | uuid | PK, FK invites ON DELETE CASCADE |
| company_id | uuid | PK, FK companies ON DELETE CASCADE |
| created_at | timestamptz | DEFAULT now() |

#### `customers`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| email | text | UNIQUE, NOT NULL |
| name | text | NOT NULL |
| company_id | uuid | FK companies ON DELETE CASCADE |
| created_at | timestamptz | DEFAULT now() |

#### `tickets`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| subject | text | NOT NULL |
| description | text | |
| status | ticket_status | NOT NULL, DEFAULT 'open' |
| priority | ticket_priority | NOT NULL, DEFAULT 'medium' |
| customer_id | uuid | FK customers |
| company_id | uuid | FK companies ON DELETE CASCADE |
| created_by | uuid | nullable, FK auth.users |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

`created_by` is the app user who created the ticket (null when created via email in Phase 2).

#### `ticket_messages`
| Column | Type | Constraints |
|--------|------|-------------|
| id | uuid | PK, DEFAULT gen_random_uuid() |
| ticket_id | uuid | FK tickets ON DELETE CASCADE |
| sender_type | sender_type | NOT NULL |
| sender_id | uuid | nullable |
| body | text | NOT NULL |
| created_at | timestamptz | DEFAULT now() |

`sender_id` references auth.users (for agents/CMs) or customers (for customers). The `sender_type` enum disambiguates.

### Trigger: auto-create profile on signup

On `INSERT` into `auth.users`:

1. Count existing profiles. If zero → create profile with role `admin`, done.
2. Otherwise, look up `invites` by the new user's email WHERE `used_at IS NULL` AND `expires_at > now()`.
3. If no valid invite found → raise exception (block signup).
4. Create profile with role from invite.
5. Copy rows from `invite_companies` into `user_companies` for the new user.
6. Set `used_at = now()` on the invite.

### RLS Policies

All tables have RLS enabled.

**Admin** (role = 'admin'):
- Full SELECT, INSERT, UPDATE, DELETE on all tables.

**Agent** (role = 'agent'):
- `tickets`: SELECT, UPDATE WHERE `company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())`
- `ticket_messages`: SELECT, INSERT WHERE ticket's `company_id` is in agent's companies
- `companies`: SELECT WHERE `id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())`
- `profiles`: SELECT own profile

**Customer Manager** (role = 'customer_manager'):
- `tickets`: SELECT, INSERT, UPDATE WHERE `company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())`
- `ticket_messages`: SELECT, INSERT WHERE ticket's `company_id` is in their company
- `customers`: SELECT, INSERT, UPDATE WHERE `company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid())`
- `companies`: SELECT own company
- `profiles`: SELECT own profile

---

## Auth Flow

### First user (admin)
1. User visits the app. No users exist.
2. App shows open registration form (email, password, name).
3. On submit → Supabase creates auth.user → trigger creates profile with `admin` role.
4. User is logged in, redirected to dashboard.

### Invite signup (agent / customer manager)
1. Admin generates an invite link from the Companies page (for CM) or Agents page (for agent).
2. Invited person visits `/signup/:token`.
3. App validates the token (checks it exists, is unused, not expired).
4. Shows signup form pre-filled with email from invite. User enters password and name.
5. On submit → Supabase creates auth.user → trigger creates profile + user_companies from invite.
6. User is logged in, redirected to dashboard.

### Login
- Standard email/password via `supabase.auth.signInWithPassword()`.
- After login, fetch profile (role) to determine navigation.

### Logout
- `supabase.auth.signOut()` → redirect to `/login`.

### Route protection
- `AuthProvider` context: exposes `user`, `profile`, `loading`, `signIn`, `signUp`, `signOut`.
- `ProtectedRoute` component: redirects to `/login` if not authenticated.
- `RoleGuard` component: checks user's role against allowed roles for a route.

---

## Navigation & Pages

### Per-role navigation

| Page | Admin | Agent | Customer Manager |
|------|-------|-------|-----------------|
| Dashboard | Stats: companies, agents, tickets | Stats: tickets | Stats: customers, tickets |
| Tickets | All tickets, all filters | Scoped to assigned companies | Scoped to their company |
| Companies | CRUD + invite CM button | — | — |
| Agents | List + invite + assign companies | — | — |
| Customers | — | — | CRUD, scoped to company |

### Page details

**Dashboard** (`/`)
- Role-specific stat cards (counts) and ticket status breakdown.
- Phase 1: static counts via Supabase queries. Phase 2: realtime + charts.

**Tickets** (`/tickets`)
- List view with columns: subject, status, priority, customer, company (admin only), date.
- Filters: status, priority, company (admin only).
- Click row → ticket detail page.

**Ticket Detail** (`/tickets/:id`)
- Header: subject, status badge, priority badge, customer info, company.
- Actions: change status, change priority (agents and CMs).
- Message thread: chronological list of messages (chat-like). Each message shows sender name, type, timestamp.
- Reply form at bottom (agents and CMs).

**Companies** (`/companies`, admin only)
- List with company name.
- "New Company" button → form (name only).
- Click row → company detail.
- Company detail: edit name, "Invite Customer Manager" button.
- Invite CM button → dialog: enter email → generates invite link → shows link + copy button.

**Agents** (`/agents`, admin only)
- List with name, email, assigned companies (as tags/badges).
- "Invite Agent" button → dialog: enter email, optional company multi-select → generates link → copy button.
- Click agent → edit page: assign/remove companies via multi-select.

**Customers** (`/customers`, customer manager only)
- List with name, email.
- "New Customer" button → form (name, email). Company is auto-set to CM's company.
- Edit customer: update name, email.

**Login** (`/login`)
- Email + password form.
- If no users exist, redirect to `/signup` (open registration for first admin).

**Signup** (`/signup/:token`)
- Validates token. Shows error if invalid/expired/used.
- Pre-fills email from invite. Fields: email (read-only), name, password.

---

## Feature Module Structure

```
src/features/
├── auth/
│   ├── components/
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── RoleGuard.tsx
│   ├── hooks/
│   │   ├── useAuth.ts          # signIn, signUp, signOut
│   │   └── useProfile.ts       # fetch current user's profile
│   └── AuthProvider.tsx         # context: user, profile, loading
├── tickets/
│   ├── components/
│   │   ├── TicketList.tsx
│   │   ├── TicketDetail.tsx
│   │   ├── TicketMessageThread.tsx
│   │   ├── TicketFilters.tsx
│   │   ├── TicketStatusBadge.tsx
│   │   ├── TicketPriorityBadge.tsx
│   │   └── CreateTicketForm.tsx  # CM only
│   ├── hooks/
│   │   ├── useTickets.ts        # list with filters
│   │   ├── useTicket.ts         # single ticket
│   │   ├── useTicketMessages.ts
│   │   ├── useCreateMessage.ts
│   │   └── useUpdateTicket.ts   # status/priority changes
│   └── types.ts
├── companies/
│   ├── components/
│   │   ├── CompanyList.tsx
│   │   ├── CompanyForm.tsx
│   │   ├── CompanyDetail.tsx
│   │   └── InviteCMDialog.tsx
│   ├── hooks/
│   │   ├── useCompanies.ts
│   │   ├── useCompany.ts
│   │   └── useCreateInvite.ts
│   └── types.ts
├── agents/
│   ├── components/
│   │   ├── AgentList.tsx
│   │   ├── InviteAgentDialog.tsx
│   │   └── AssignCompaniesDialog.tsx
│   ├── hooks/
│   │   ├── useAgents.ts
│   │   ├── useAgent.ts
│   │   └── useAgentCompanies.ts  # assign/remove
│   └── types.ts
├── customers/
│   ├── components/
│   │   ├── CustomerList.tsx
│   │   └── CustomerForm.tsx
│   ├── hooks/
│   │   └── useCustomers.ts
│   └── types.ts
└── dashboard/
    ├── components/
    │   ├── DashboardStats.tsx
    │   └── StatCard.tsx
    ├── hooks/
    │   └── useDashboardStats.ts
    └── types.ts
```

---

## Shared Components & Utilities

- `src/components/ui/` — shadcn primitives (Button, Input, Dialog, Table, Badge, Select, etc.)
- `src/layouts/AppLayout.tsx` — sidebar nav + main content area. Nav items filtered by role.
- `src/layouts/AuthLayout.tsx` — centered card layout for login/signup.
- `src/lib/supabase.ts` — Supabase client (exists).
- `src/lib/types.ts` — shared enums and types (exists, will be extended with generated DB types).

---

## Testing Strategy

**Unit tests (Vitest):**
- Hooks: test query/mutation logic with mocked Supabase client.
- Components: test rendering, user interactions, form validation.
- Utils: test any helper functions.

**E2E tests (Playwright):**
- Full auth flow: first admin signup, invite agent, agent signup, login/logout.
- Ticket CRUD: create ticket (as CM), view list, open detail, reply, change status.
- Company management: create company, invite CM.
- Agent management: invite agent, assign companies.
- Role scoping: verify agent can't see admin pages, CM can't see other companies' data.

---

## Out of Scope (Phase 2)

- Email inbound/outbound (Edge Functions + webhook)
- Supabase Realtime subscriptions (live updates)
- Dashboard charts and analytics
- File attachments on tickets
- Notification system
- Search functionality
