# ServerDesk - Ticket Support System

## Project Overview

ServerDesk is a ticket support application where customers interact exclusively via email, while internal users (admin, agents, customer managers) manage tickets through a web application (SPA).

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **UI**: shadcn/ui + Tailwind CSS v4
- **Backend**: Supabase (Auth, Database, Edge Functions, Realtime, Storage)
- **Email**: Supabase Edge Functions + email service webhook (SendGrid/Resend/Mailgun)
- **Testing**: Vitest (unit tests) + Playwright (e2e tests)
- **Package Manager**: npm

## Architecture

### Roles & Personas

There are 4 roles in the system:

| Role               | Auth | App Access | Description                                                      |
|--------------------|------|------------|------------------------------------------------------------------|
| **Admin**          | Yes  | Full SPA   | First user. Manages everything. Invites agents & customer managers via token. |
| **Agent**          | Yes  | Full SPA   | Handles tickets, replies to customers. Invited by admin. Assigned to one or more companies by admin. |
| **Customer Manager** | Yes | Full SPA  | Manages tickets scoped to their company only. Invited by admin.  |
| **Customer**       | No   | Email only | Sends tickets by email. Receives agent replies by email.         |

### Auth Flow

- **Supabase Auth** for login, signup, logout (admin, agent, customer manager only).
- **First user** registered becomes admin automatically.
- **Invite system**: Admin generates a token-based invite link for agents and customer managers. Signup is only possible with a valid invite token.
- **Role table**: A `profiles` table linked to `auth.users` via foreign key.
- **Database trigger**: On `INSERT` into `auth.users`, a trigger automatically creates a row in `profiles` with the appropriate role (derived from the invite token, or `admin` for the first user).

### Data Model (Core Tables)

- `profiles` — user_id (FK to auth.users, PK), name, role (enum: admin, agent, customer_manager), created_at
- `invites` — id, email, role, token (unique), invited_by (FK), used_at, expires_at, created_at
- `invite_companies` — invite_id (FK), company_id (FK), created_at (PK: invite_id + company_id)
- `user_companies` — user_id (FK to auth.users), company_id (FK), created_at (PK: user_id + company_id; many-to-many for agents and customer managers)
- `companies` — id, name, domain, created_at, updated_at
- `customers` — id, email (unique), name, company_id (FK), created_at
- `tickets` — id, subject, description, status (enum: open, in_progress, waiting, resolved, closed), priority (enum: low, medium, high, urgent), customer_id (FK), assigned_agent_id (FK, nullable), company_id (FK), created_by (FK, nullable), created_at, updated_at
- `ticket_messages` — id, ticket_id (FK), sender_type (enum: customer, agent, system), sender_id, body, created_at
- `email_logs` — id, ticket_id (FK), direction (enum: inbound, outbound), email_metadata (jsonb), created_at

### Email Integration

- **Inbound**: Email service webhook → Supabase Edge Function → creates ticket or appends message to existing ticket (matched by subject/thread ID).
- **Outbound**: Agent replies in SPA → Supabase Edge Function → sends email to customer.
- Customers never log into the app. All customer interaction is via email.

### Access Control (RLS)

- **Admin**: Full access to all tables.
- **Agent**: Read/write on tickets and ticket_messages scoped to their assigned companies (via `user_companies`). Read on customers and companies they are assigned to.
- **Customer Manager**: Read/write only on tickets, customers, and messages scoped to their company_id.
- All policies enforced via Supabase Row Level Security (RLS).

## Project Structure

```
src/
├── components/          # Reusable UI components (shadcn-based)
│   ├── ui/              # shadcn/ui primitives
│   └── ...              # App-specific components
├── features/            # Feature modules
│   ├── auth/            # Login, signup, logout, invite handling
│   ├── tickets/         # Ticket list, detail, create, reply
│   ├── companies/       # Company management (admin)
│   ├── customers/       # Customer management
│   ├── agents/          # Agent management (admin)
│   ├── invites/         # Invite management (admin)
│   ├── agent-assignments/ # Assign agents to companies (admin)
│   └── dashboard/       # Dashboard / overview
├── hooks/               # Custom React hooks
├── lib/                 # Utilities, Supabase client, types
│   ├── supabase.ts      # Supabase client init
│   └── types.ts         # Generated/shared TypeScript types
├── routes/              # Route definitions
├── layouts/             # Layout components (auth layout, app layout)
└── main.tsx             # Entry point
supabase/
├── migrations/          # SQL migrations
├── functions/           # Edge Functions (email inbound/outbound)
└── seed.sql             # Seed data
tests/
├── unit/                # Vitest unit tests
└── e2e/                 # Playwright e2e tests
```

## Coding Conventions

- Use functional React components with hooks only.
- Use TypeScript strict mode. No `any` types.
- Use named exports, not default exports.
- Use `const` arrow functions for components: `export const MyComponent = () => { ... }`.
- Colocate tests next to source files for unit tests (`*.test.ts`), Playwright tests go in `tests/e2e/`.
- Use Supabase generated types from `supabase gen types typescript`.
- All database queries go through the Supabase client, never raw SQL in frontend.
- Use React Router for routing.
- Use Tanstack Query (React Query) for server state management.
- Form validation with zod + react-hook-form.
- Import zod consistently as `import { z } from "zod"` across all files (not `"zod/v4"`).
- Use Supabase generated types (`TablesInsert<>`, `TablesUpdate<>`) for mutation payloads — avoid duplicating column shapes manually.
- Never use `as unknown as T` double casts — fix the query or type definition instead.
- Prefer single joined queries over N+1 loops (e.g., fetch all related rows with `.in()` instead of per-item queries in a `for` loop).

## Linting

- **Always run `npm run lint` before considering work complete.** Fix all errors before committing.
- ESLint flat config (`eslint.config.js`) with TypeScript-ESLint, React Hooks, and React Refresh plugins.
- **TypeScript-ESLint (recommended rules)**:
  - No `any` types — use proper types or `unknown`.
  - No unused variables — remove them or prefix with `_` only if genuinely needed (e.g., rest patterns).
  - No explicit return types required, but inferred types must be correct.
  - No `@ts-ignore` — use `@ts-expect-error` with a comment if suppression is truly necessary.
  - No non-null assertions (`!`) unless you can prove the value is defined.
- **React Hooks rules**:
  - All hooks must follow the Rules of Hooks (no conditional hooks, no hooks in loops).
  - Exhaustive deps in `useEffect`, `useMemo`, `useCallback` — do not suppress the lint warning without a documented reason.
- **React Refresh**:
  - Only export React components from `.tsx` files that use Fast Refresh. Do not mix component exports with non-component exports in the same file.
- **General**:
  - No `console.log` in committed code — use a proper logger or remove before committing.
  - No `var` — use `const` or `let`.
  - Prefer `const` over `let` when the variable is never reassigned.
  - No unreachable code after `return`, `throw`, `break`, or `continue`.
  - Run `npm run lint:fix` for auto-fixable issues, then manually fix the rest.

## Testing

- **Unit tests**: Vitest — test hooks, utilities, and component logic.
  - Run: `npm test`
  - Run watch: `npm run test:watch`
- **E2E tests**: Playwright — test full user flows (login, create ticket, reply, etc.).
  - Run: `npx playwright test`
  - Test files in `tests/e2e/`.
- Write tests for all business logic and critical user paths.

## Supabase Guidelines

- Always enable RLS on every table.
- Write RLS policies that check role from `user_roles` table using `auth.uid()`.
- Use database triggers (PL/pgSQL) for side effects (e.g., auto-creating user_roles on signup).
- Use Edge Functions for email webhook processing and sending.
- Migrations go in `supabase/migrations/` with descriptive names.
- Run `supabase db push` to apply migrations locally, `supabase db reset` to reset.

### RLS Security Rules

- **Never use `USING (true)`** on SELECT policies — this exposes the entire table to any authenticated user. Scope policies to the user's role or use a `SECURITY DEFINER` function for controlled access.
- **Always add `WITH CHECK` on UPDATE/INSERT policies** to restrict which columns/values can be written. RLS cannot restrict individual columns, so use `SECURITY DEFINER` functions for column-level control (e.g., letting users update only their `name`, not their `role`).
- **Validate security-sensitive data server-side**, never client-side only. Invite tokens, role assignments, and access grants must be verified in database triggers or RPC functions, not just in the frontend.
- **Prevent sender impersonation** — INSERT policies on message tables must enforce `sender_type` and `sender_id = auth.uid()` via `WITH CHECK`.
- **Protect against race conditions** — use partial unique indexes or advisory locks for critical uniqueness guarantees (e.g., only one admin can exist via auto-signup).
- **Add `updated_at` triggers** — never rely on client-side timestamps. Create a reusable `set_updated_at()` trigger function for all tables with `updated_at` columns.
- **Keep schema in sync with CLAUDE.md** — if the data model spec says a column exists, the migration must include it. Flag deviations explicitly.

## Error Handling

- **Always check Supabase `.error`** — every Supabase query/mutation returns `{ data, error }`. Never destructure only `data` and ignore `error`.
- **Always add `.catch()` to standalone promises** — especially `getSession()`, `getUser()`, and any async call in `useEffect`. An uncaught rejection can leave the app stuck permanently.
- **Always wrap `mutateAsync()` in try/catch** — or use `mutate()` instead. If using `mutateAsync`, catch the error and let React Query's error state handle display. Show `mutation.error?.message` in the UI.
- **Never use `!` (non-null assertion) on auth data** — `getUser()` can return `null` when the session expires. Always check for null and throw a meaningful error.
- **Always render error states from queries** — destructure `isError`/`error` from `useQuery` and display them. Never show "No data" when the actual problem is a failed query.
- **Handle `signOut` errors** — async functions used as `onClick` handlers must catch rejections.
- **Use atomic operations for multi-step mutations** — delete-then-insert patterns must be wrapped in an RPC/transaction. A partial failure should not leave data in an inconsistent state.

## Commands

```bash
# Development
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Testing
npm test                 # Run Vitest unit tests
npm run test:watch       # Run Vitest in watch mode
npx playwright test      # Run Playwright e2e tests

# Supabase
npx supabase start       # Start local Supabase
npx supabase db push     # Apply migrations
npx supabase db reset    # Reset local database
npx supabase gen types typescript --local > src/lib/database.types.ts  # Generate types

# Linting
npm run lint             # Run ESLint
npm run lint:fix         # Fix auto-fixable lint issues
```
