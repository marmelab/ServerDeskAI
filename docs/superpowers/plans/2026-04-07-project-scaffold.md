# ServerDesk Project Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the ServerDesk project from an empty git repo to a working dev environment with Vite, React, TypeScript, shadcn/ui, Supabase, Vitest, and Playwright all configured and wired together.

**Architecture:** Vite SPA with React 19 + TypeScript strict mode. Supabase handles auth, database, and edge functions. shadcn/ui provides the component library on top of Tailwind CSS v4. Vitest for unit tests, Playwright for e2e.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui, Supabase, React Router, TanStack Query, zod, react-hook-form, Vitest, Playwright

---

## File Structure

After scaffolding, the project will contain:

```
/
├── package.json                    # npm scripts, dependencies
├── tsconfig.json                   # TypeScript config (strict)
├── tsconfig.app.json               # App-specific TS config
├── tsconfig.node.json              # Node TS config (vite config)
├── vite.config.ts                  # Vite configuration
├── vitest.config.ts                # Vitest configuration
├── playwright.config.ts            # Playwright configuration
├── components.json                 # shadcn/ui configuration
├── eslint.config.js                # ESLint flat config
├── .gitignore                      # Git ignore rules
├── .env.local.example              # Example env vars (Supabase keys)
├── index.html                      # Vite HTML entry
├── src/
│   ├── main.tsx                    # React entry point
│   ├── App.tsx                     # Root app component with providers
│   ├── app.css                     # Global styles + Tailwind imports
│   ├── components/
│   │   └── ui/                     # shadcn/ui primitives (added via CLI)
│   ├── features/                   # Feature modules (empty dirs for now)
│   │   ├── auth/
│   │   ├── tickets/
│   │   ├── companies/
│   │   ├── customers/
│   │   ├── agents/
│   │   ├── invites/
│   │   ├── agent-assignments/
│   │   └── dashboard/
│   ├── hooks/                      # Custom React hooks
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client init
│   │   ├── utils.ts                # shadcn cn() utility
│   │   └── types.ts                # Shared TypeScript types
│   ├── routes/
│   │   └── index.tsx               # Route definitions
│   └── layouts/
│       ├── AuthLayout.tsx          # Layout for login/signup pages
│       └── AppLayout.tsx           # Layout for authenticated pages
├── supabase/
│   ├── config.toml                 # Supabase local config
│   ├── migrations/                 # SQL migrations (empty)
│   ├── functions/                  # Edge Functions (empty)
│   └── seed.sql                    # Seed data (empty)
├── tests/
│   └── e2e/                        # Playwright e2e tests
│       └── example.spec.ts         # Smoke test
└── CLAUDE.md                       # Project documentation (exists)
```

---

### Task 1: Initialize Vite + React + TypeScript project

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `eslint.config.js`, `.gitignore`, `src/main.tsx`, `src/App.tsx`, `src/app.css`, `src/vite-env.d.ts`

- [ ] **Step 1: Scaffold Vite project**

Run in `/home/jerome/Work/ServerDeskClaude`:

```bash
npm create vite@latest . -- --template react-ts
```

Select "Ignore files and continue" if prompted about existing files.

- [ ] **Step 2: Install base dependencies**

```bash
npm install
```

- [ ] **Step 3: Verify the app starts**

```bash
npm run dev -- --port 5173 &
sleep 2
curl -s http://localhost:5173 | head -5
kill %1
```

Expected: HTML output containing `<div id="root">`.

- [ ] **Step 4: Clean up Vite boilerplate**

Remove default Vite demo content. Replace `src/App.tsx` with:

```tsx
export const App = () => {
  return (
    <div>
      <h1>ServerDesk</h1>
    </div>
  );
};
```

Replace `src/main.tsx` with:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./app.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

Rename `src/App.css` to `src/app.css` and clear its contents (will be populated with Tailwind in next task). Delete `src/index.css` if it exists. Delete `src/assets/` directory. Remove any logo SVG files.

- [ ] **Step 5: Enable TypeScript strict mode**

Edit `tsconfig.app.json` — ensure `compilerOptions` includes:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

- [ ] **Step 6: Configure path aliases in Vite**

Install the Node types needed and update `vite.config.ts`:

```bash
npm install -D @types/node
```

Replace `vite.config.ts` with:

```ts
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 7: Verify build succeeds**

```bash
npm run build
```

Expected: Build completes with no errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TypeScript project"
```

---

### Task 2: Set up Tailwind CSS v4 + shadcn/ui

**Files:**
- Modify: `src/app.css`
- Create: `src/lib/utils.ts`, `components.json`
- Modify: `package.json` (new deps)

- [ ] **Step 1: Install Tailwind CSS v4**

```bash
npm install tailwindcss @tailwindcss/vite
```

- [ ] **Step 2: Add Tailwind Vite plugin**

Update `vite.config.ts`:

```ts
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Set up CSS imports**

Replace `src/app.css` with:

```css
@import "tailwindcss";
```

- [ ] **Step 4: Verify Tailwind works**

Temporarily add a Tailwind class to `src/App.tsx`:

```tsx
export const App = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-blue-600">ServerDesk</h1>
    </div>
  );
};
```

Run `npm run build` — should succeed with no errors.

- [ ] **Step 5: Initialize shadcn/ui**

```bash
npx shadcn@latest init -d
```

This will auto-detect Vite + React + Tailwind v4, create `components.json`, update `src/app.css` with CSS variables, and create `src/lib/utils.ts` with the `cn()` utility.

If prompted, select:
- Style: New York
- Base color: Neutral
- CSS variables: Yes

- [ ] **Step 6: Add a test shadcn component to verify setup**

```bash
npx shadcn@latest add button
```

This creates `src/components/ui/button.tsx`.

- [ ] **Step 7: Verify shadcn component works**

Update `src/App.tsx`:

```tsx
import { Button } from "@/components/ui/button";

export const App = () => {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">ServerDesk</h1>
      <Button className="mt-4">Get Started</Button>
    </div>
  );
};
```

Run `npm run build` — should succeed.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: set up Tailwind CSS v4 and shadcn/ui"
```

---

### Task 3: Install and configure core dependencies

**Files:**
- Modify: `package.json` (new deps)

- [ ] **Step 1: Install React Router**

```bash
npm install react-router
```

- [ ] **Step 2: Install TanStack Query**

```bash
npm install @tanstack/react-query
```

- [ ] **Step 3: Install form libraries**

```bash
npm install react-hook-form @hookform/resolvers zod
```

- [ ] **Step 4: Install Supabase client**

```bash
npm install @supabase/supabase-js
```

- [ ] **Step 5: Verify build still succeeds**

```bash
npm run build
```

Expected: Build completes with no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: install core dependencies (router, query, forms, supabase)"
```

---

### Task 4: Set up Supabase local dev

**Files:**
- Create: `supabase/config.toml`, `supabase/seed.sql`, `supabase/migrations/`, `supabase/functions/`
- Create: `src/lib/supabase.ts`
- Create: `.env.local.example`

- [ ] **Step 1: Initialize Supabase**

```bash
npx supabase init
```

This creates the `supabase/` directory with `config.toml`.

- [ ] **Step 2: Create empty seed file**

Create `supabase/seed.sql`:

```sql
-- Seed data for local development
-- Add seed data here as needed
```

- [ ] **Step 3: Create environment example file**

Create `.env.local.example`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

- [ ] **Step 4: Create .env.local with local defaults**

Create `.env.local`:

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

Note: This is the default local Supabase anon key — safe to commit for local dev, but `.env.local` should be gitignored.

- [ ] **Step 5: Add .env.local to .gitignore**

Append to `.gitignore`:

```
# Local env
.env.local
```

- [ ] **Step 6: Create Supabase client**

Create `src/lib/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 7: Create shared types file**

Create `src/lib/types.ts`:

```ts
// Database types will be generated by: npx supabase gen types typescript --local
// For now, define the app-level role enum used across the app

export type UserRole = "admin" | "agent" | "customer_manager";

export type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";

export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type SenderType = "customer" | "agent" | "system";
```

- [ ] **Step 8: Verify build succeeds**

```bash
npm run build
```

Expected: Build completes with no errors.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: set up Supabase local dev and client library"
```

---

### Task 5: Set up app shell (routing, layouts, providers)

**Files:**
- Create: `src/routes/index.tsx`
- Create: `src/layouts/AuthLayout.tsx`, `src/layouts/AppLayout.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Create AuthLayout**

Create `src/layouts/AuthLayout.tsx`:

```tsx
import { Outlet } from "react-router";

export const AuthLayout = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="w-full max-w-md p-6">
        <Outlet />
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create AppLayout**

Create `src/layouts/AppLayout.tsx`:

```tsx
import { Outlet } from "react-router";

export const AppLayout = () => {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-muted/40 p-4">
        <h2 className="text-lg font-semibold">ServerDesk</h2>
        {/* Sidebar nav will go here */}
      </aside>
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
};
```

- [ ] **Step 3: Create route definitions**

Create `src/routes/index.tsx`:

```tsx
import { createBrowserRouter } from "react-router";
import { AuthLayout } from "@/layouts/AuthLayout";
import { AppLayout } from "@/layouts/AppLayout";

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      {
        path: "/login",
        element: <div>Login Page</div>,
      },
      {
        path: "/signup/:token",
        element: <div>Signup Page</div>,
      },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      {
        path: "/",
        element: <div>Dashboard</div>,
      },
      {
        path: "/tickets",
        element: <div>Tickets</div>,
      },
      {
        path: "/companies",
        element: <div>Companies</div>,
      },
    ],
  },
]);
```

- [ ] **Step 4: Create feature directory placeholders**

Create `.gitkeep` files in each feature directory so they are tracked in git:

```bash
mkdir -p src/features/{auth,tickets,companies,customers,agents,invites,agent-assignments,dashboard}
mkdir -p src/hooks
touch src/features/auth/.gitkeep
touch src/features/tickets/.gitkeep
touch src/features/companies/.gitkeep
touch src/features/customers/.gitkeep
touch src/features/agents/.gitkeep
touch src/features/invites/.gitkeep
touch src/features/agent-assignments/.gitkeep
touch src/features/dashboard/.gitkeep
touch src/hooks/.gitkeep
```

- [ ] **Step 5: Wire up App with providers and router**

Replace `src/App.tsx`:

```tsx
import { RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};
```

- [ ] **Step 6: Verify build succeeds**

```bash
npm run build
```

Expected: Build completes with no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: set up routing, layouts, and providers"
```

---

### Task 6: Set up Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts + devDeps)
- Create: `src/lib/utils.test.ts`

- [ ] **Step 1: Install Vitest and testing dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Create Vitest config**

Create `vitest.config.ts`:

```ts
import path from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 3: Create test setup file**

Create `src/test-setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add test scripts to package.json**

Add to `package.json` scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 5: Write a smoke test**

Create `src/lib/utils.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn utility", () => {
  it("merges class names", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("handles conditional classes", () => {
    expect(cn("px-2", false && "py-1")).toBe("px-2");
  });

  it("deduplicates conflicting tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
```

- [ ] **Step 6: Run the test**

```bash
npm test
```

Expected: 3 tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: set up Vitest with React Testing Library"
```

---

### Task 7: Set up Playwright

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/smoke.spec.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install Playwright**

```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

- [ ] **Step 2: Create Playwright config**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 3: Create e2e test directory and smoke test**

```bash
mkdir -p tests/e2e
```

Create `tests/e2e/smoke.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("app loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/ServerDesk/);
});
```

- [ ] **Step 4: Update index.html title**

In `index.html`, change the `<title>` tag to:

```html
<title>ServerDesk</title>
```

- [ ] **Step 5: Add Playwright artifacts to .gitignore**

Append to `.gitignore`:

```
# Playwright
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/
```

- [ ] **Step 6: Add e2e script to package.json**

Add to `package.json` scripts:

```json
{
  "scripts": {
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 7: Run the smoke test**

```bash
npx playwright test
```

Expected: 1 test passes (app loads with correct title).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: set up Playwright for e2e testing"
```

---

### Task 8: Final cleanup and initial push

**Files:**
- Modify: `.gitignore` (final review)
- Modify: `CLAUDE.md` (if needed)

- [ ] **Step 1: Review .gitignore is complete**

Ensure `.gitignore` includes at minimum:

```
# Dependencies
node_modules/

# Build
dist/

# Local env
.env.local
.env.*.local

# IDE
.vscode/
.idea/

# OS
.DS_Store

# Playwright
/test-results/
/playwright-report/
/blob-report/
/playwright/.cache/

# Supabase
supabase/.temp/
```

- [ ] **Step 2: Verify full build + test pipeline**

```bash
npm run build && npm test
```

Expected: Build succeeds, all unit tests pass.

- [ ] **Step 3: Commit any remaining changes**

```bash
git add -A
git status
git commit -m "chore: final scaffold cleanup"
```

- [ ] **Step 4: Push to GitHub**

```bash
git push -u origin main
```

Expected: Code pushed to `marmelab/ServerDeskAI`.

---

## Summary

After completing all 8 tasks, the project will have:

- Vite + React 19 + TypeScript (strict) scaffolded
- Tailwind CSS v4 + shadcn/ui initialized with Button component
- React Router, TanStack Query, zod, react-hook-form installed
- Supabase client configured with local dev setup
- App shell with AuthLayout, AppLayout, and placeholder routes
- Vitest configured with a passing smoke test
- Playwright configured with a passing e2e smoke test
- Clean git history pushed to marmelab/ServerDeskAI
