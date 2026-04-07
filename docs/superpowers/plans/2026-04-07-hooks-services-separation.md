# Hooks/Services Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate all Supabase calls into plain async service functions; hooks import only from services, never from `@/lib/supabase` directly.

**Architecture:** Each feature gets a `services/` folder with one file per data domain (e.g. `customers.ts`, `companies.ts`). Hook files are split one-per-action and import their service function. Tests for hooks mock the service module; tests for services mock `@/lib/supabase`.

**Tech Stack:** React 19, TypeScript, TanStack Query v5, Vitest, @testing-library/react v16

---

## File Map

### Created
- `src/features/customers/services/customers.ts` — fetchCustomers, createCustomer, updateCustomer, fetchUserCompany
- `src/features/customers/services/customers.test.ts` — service unit tests (mock supabase)
- `src/features/customers/hooks/useCreateCustomer.ts` — mutation hook
- `src/features/customers/hooks/useUpdateCustomer.ts` — mutation hook
- `src/features/customers/hooks/useUserCompany.ts` — query hook for CM's company
- `src/features/companies/services/companies.ts` — fetchCompanies, fetchCompany, createCompany, updateCompany, deleteCompany
- `src/features/companies/services/companies.test.ts`
- `src/features/companies/services/invites.ts` — createInvite, validateInvite
- `src/features/companies/services/invites.test.ts`
- `src/features/companies/hooks/useCreateCompany.ts`
- `src/features/companies/hooks/useUpdateCompany.ts`
- `src/features/companies/hooks/useDeleteCompany.ts`
- `src/features/agents/services/agents.ts` — fetchAgents, updateAgentCompanies
- `src/features/agents/services/agents.test.ts`
- `src/features/auth/services/auth.ts` — signIn, signUp, signOut, getSession, onAuthStateChange
- `src/features/auth/services/profile.ts` — fetchProfile
- `src/features/auth/services/invite.ts` — validateInvite

### Modified
- `src/features/customers/hooks/useCustomers.ts` — query only, imports service
- `src/features/customers/hooks/useCustomers.test.tsx` — mock service instead of supabase
- `src/features/customers/components/CustomerList.tsx` — use useUserCompany hook, remove supabase import
- `src/features/customers/components/CustomerList.test.tsx` — mock useUserCompany hook
- `src/features/customers/components/CustomerForm.tsx` — import from split hook files
- `src/features/customers/components/CustomerForm.test.tsx` — mock split hook files
- `src/features/companies/hooks/useCompanies.ts` — query only, imports service
- `src/features/companies/hooks/useCompanies.test.tsx` — mock service
- `src/features/companies/hooks/useCompany.ts` — imports service
- `src/features/companies/hooks/useCreateInvite.ts` — imports service
- `src/features/companies/hooks/useCreateInvite.test.tsx` — mock service
- `src/features/companies/components/CompanyForm.tsx` — import useCreateCompany from new file
- `src/features/companies/components/CompanyDetail.tsx` — import from new split files
- `src/features/agents/hooks/useAgents.ts` — imports service
- `src/features/agents/hooks/useAgentCompanies.ts` — imports service
- `src/features/agents/hooks/useAgentCompanies.test.tsx` — mock service
- `src/features/auth/hooks/useAuth.ts` — imports auth service
- `src/features/auth/hooks/useProfile.ts` — imports profile service
- `src/features/auth/AuthProvider.tsx` — imports getSession/onAuthStateChange from auth service
- `src/features/auth/AuthProvider.test.tsx` — mock auth service instead of supabase
- `src/features/auth/components/SignupForm.tsx` — imports validateInvite from invite service
- `CLAUDE.md` — add hooks/services conventions

---

### Task 1: Create branch and document conventions

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Create the feature branch**

```bash
git checkout -b feat/refactor-hooks-services
```

- [ ] **Step 2: Add hooks/services conventions to CLAUDE.md**

Add this section under `## Coding Conventions`:

```markdown
### Hooks / Services Architecture

- **Services** (`src/features/[feature]/services/[domain].ts`) — plain `async` functions that call Supabase. They have no React dependencies. One file per data domain (e.g., `customers.ts`, `companies.ts`, `invites.ts`).
- **Hooks** (`src/features/[feature]/hooks/use[Action].ts`) — one file per action/query. Import **only** from the feature's service files, never from `@/lib/supabase` directly.
- Components import hooks; hooks import services; services import `@/lib/supabase`. No layer skips.
- **Testing**: hook tests mock the service module (`vi.mock("../services/[domain]", ...)`). Service tests mock `@/lib/supabase`. Never mock supabase in hook tests.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add hooks/services separation conventions to CLAUDE.md"
```

---

### Task 2: Customers service layer

**Files:**
- Create: `src/features/customers/services/customers.ts`
- Create: `src/features/customers/services/customers.test.ts`

- [ ] **Step 1: Write the failing service tests**

```typescript
// src/features/customers/services/customers.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchCustomers,
  createCustomer,
  updateCustomer,
  fetchUserCompany,
} from "./customers";

const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const makeChain = (resolve: unknown) => {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockResolvedValue(resolve);
  chain.single = vi.fn().mockResolvedValue(resolve);
  return chain;
};

describe("fetchCustomers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns ordered customers", async () => {
    const rows = [{ id: "c1", name: "Alice", email: "a@x.com", company_id: "co1", created_at: "" }];
    mockFrom.mockReturnValue(makeChain({ data: rows, error: null }));
    const result = await fetchCustomers();
    expect(result).toEqual(rows);
  });

  it("throws on error", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "Permission denied" } }));
    await expect(fetchCustomers()).rejects.toEqual({ message: "Permission denied" });
  });
});

describe("createCustomer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts with company_id snake_case and returns row", async () => {
    const row = { id: "c1", name: "Bob", email: "b@x.com", company_id: "co1", created_at: "" };
    const chain = makeChain({ data: row, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await createCustomer({ name: "Bob", email: "b@x.com", companyId: "co1" });
    expect(result).toEqual(row);
    expect(chain.insert).toHaveBeenCalledWith({ name: "Bob", email: "b@x.com", company_id: "co1" });
  });

  it("throws on error", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "Unique violation" } }));
    await expect(createCustomer({ name: "Bob", email: "b@x.com", companyId: "co1" })).rejects.toEqual({
      message: "Unique violation",
    });
  });
});

describe("updateCustomer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates name and email only — no company_id", async () => {
    const row = { id: "c1", name: "Alice Updated", email: "a@x.com", company_id: "co1", created_at: "" };
    const chain = makeChain({ data: row, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await updateCustomer({ id: "c1", name: "Alice Updated", email: "a@x.com" });
    expect(result).toEqual(row);
    expect(chain.update).toHaveBeenCalledWith({ name: "Alice Updated", email: "a@x.com" });
    expect(chain.eq).toHaveBeenCalledWith("id", "c1");
  });
});

describe("fetchUserCompany", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns company_id for user", async () => {
    const chain = makeChain({ data: { company_id: "co1" }, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await fetchUserCompany("user-1");
    expect(result).toEqual({ company_id: "co1" });
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("throws on error", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "Not found" } }));
    await expect(fetchUserCompany("user-1")).rejects.toEqual({ message: "Not found" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- customers/services/customers.test.ts
```

Expected: FAIL with `Cannot find module './customers'`

- [ ] **Step 3: Implement the service**

```typescript
// src/features/customers/services/customers.ts
import { supabase } from "@/lib/supabase";
import type { Customer } from "@/lib/types";
import type { TablesInsert, TablesUpdate } from "@/lib/database.types";

export const fetchCustomers = async (): Promise<Customer[]> => {
  const { data, error } = await supabase.from("customers").select("*").order("name");
  if (error) throw error;
  return data;
};

export const createCustomer = async ({
  name,
  email,
  companyId,
}: {
  name: string;
  email: string;
  companyId: string;
}): Promise<Customer> => {
  const payload: TablesInsert<"customers"> = { name, email, company_id: companyId };
  const { data, error } = await supabase
    .from("customers")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateCustomer = async ({
  id,
  name,
  email,
}: {
  id: string;
  name: string;
  email: string;
}): Promise<Customer> => {
  const payload: TablesUpdate<"customers"> = { name, email };
  const { data, error } = await supabase
    .from("customers")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const fetchUserCompany = async (userId: string): Promise<{ company_id: string }> => {
  const { data, error } = await supabase
    .from("user_companies")
    .select("company_id")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data;
};
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- customers/services/customers.test.ts
```

Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/customers/services/
git commit -m "feat: add customers service layer"
```

---

### Task 3: Split customers hooks + update components + update tests

**Files:**
- Modify: `src/features/customers/hooks/useCustomers.ts`
- Create: `src/features/customers/hooks/useCreateCustomer.ts`
- Create: `src/features/customers/hooks/useUpdateCustomer.ts`
- Create: `src/features/customers/hooks/useUserCompany.ts`
- Modify: `src/features/customers/hooks/useCustomers.test.tsx`
- Modify: `src/features/customers/components/CustomerList.tsx`
- Modify: `src/features/customers/components/CustomerList.test.tsx`
- Modify: `src/features/customers/components/CustomerForm.tsx`
- Modify: `src/features/customers/components/CustomerForm.test.tsx`

- [ ] **Step 1: Replace useCustomers.ts with query-only hook**

```typescript
// src/features/customers/hooks/useCustomers.ts
import { useQuery } from "@tanstack/react-query";
import { fetchCustomers } from "../services/customers";
import type { Customer } from "@/lib/types";

export const useCustomers = () =>
  useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });
```

- [ ] **Step 2: Create useCreateCustomer.ts**

```typescript
// src/features/customers/hooks/useCreateCustomer.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomer } from "../services/customers";

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
};
```

- [ ] **Step 3: Create useUpdateCustomer.ts**

```typescript
// src/features/customers/hooks/useUpdateCustomer.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCustomer } from "../services/customers";

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCustomer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
};
```

- [ ] **Step 4: Create useUserCompany.ts**

```typescript
// src/features/customers/hooks/useUserCompany.ts
import { useQuery } from "@tanstack/react-query";
import { fetchUserCompany } from "../services/customers";

export const useUserCompany = (userId: string | undefined) =>
  useQuery({
    queryKey: ["user-company", userId],
    queryFn: () => {
      if (!userId) throw new Error("Not authenticated");
      return fetchUserCompany(userId);
    },
    enabled: !!userId,
  });
```

- [ ] **Step 5: Update useCustomers.test.tsx to mock service**

```typescript
// src/features/customers/hooks/useCustomers.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { useCustomers } from "./useCustomers";
import { useCreateCustomer } from "./useCreateCustomer";
import { useUpdateCustomer } from "./useUpdateCustomer";

const mockFetchCustomers = vi.fn();
const mockCreateCustomer = vi.fn();
const mockUpdateCustomer = vi.fn();

vi.mock("../services/customers", () => ({
  fetchCustomers: () => mockFetchCustomers(),
  createCustomer: (args: unknown) => mockCreateCustomer(args),
  updateCustomer: (args: unknown) => mockUpdateCustomer(args),
  fetchUserCompany: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useCustomers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches customers ordered by name", async () => {
    const customers = [
      { id: "c1", name: "Alice", email: "alice@acme.com", company_id: "co1", created_at: "" },
    ];
    mockFetchCustomers.mockResolvedValue(customers);

    const { result } = renderHook(() => useCustomers(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(customers);
  });

  it("propagates query error", async () => {
    mockFetchCustomers.mockRejectedValue(new Error("Permission denied"));

    const { result } = renderHook(() => useCustomers(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreateCustomer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls createCustomer service with args and invalidates cache", async () => {
    const created = { id: "c1", name: "Bob", email: "bob@acme.com", company_id: "co1", created_at: "" };
    mockCreateCustomer.mockResolvedValue(created);

    const { result } = renderHook(() => useCreateCustomer(), { wrapper: createWrapper() });

    result.current.mutate({ name: "Bob", email: "bob@acme.com", companyId: "co1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCreateCustomer).toHaveBeenCalledWith({ name: "Bob", email: "bob@acme.com", companyId: "co1" });
  });

  it("propagates mutation error", async () => {
    mockCreateCustomer.mockRejectedValue(new Error("Unique violation"));

    const { result } = renderHook(() => useCreateCustomer(), { wrapper: createWrapper() });

    result.current.mutate({ name: "Bob", email: "bob@acme.com", companyId: "co1" });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useUpdateCustomer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls updateCustomer service with args", async () => {
    const updated = { id: "c1", name: "Alice Updated", email: "a@acme.com", company_id: "co1", created_at: "" };
    mockUpdateCustomer.mockResolvedValue(updated);

    const { result } = renderHook(() => useUpdateCustomer(), { wrapper: createWrapper() });

    result.current.mutate({ id: "c1", name: "Alice Updated", email: "a@acme.com" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdateCustomer).toHaveBeenCalledWith({ id: "c1", name: "Alice Updated", email: "a@acme.com" });
  });

  it("propagates mutation error", async () => {
    mockUpdateCustomer.mockRejectedValue(new Error("Not found"));

    const { result } = renderHook(() => useUpdateCustomer(), { wrapper: createWrapper() });

    result.current.mutate({ id: "c1", name: "Alice", email: "a@acme.com" });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

- [ ] **Step 6: Update CustomerList.tsx to use useUserCompany hook**

Replace the entire file with:

```typescript
// src/features/customers/components/CustomerList.tsx
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
import { useUserCompany } from "../hooks/useUserCompany";
import { useAuthContext } from "@/features/auth/AuthProvider";
import { CustomerForm } from "./CustomerForm";
import type { Customer } from "@/lib/types";

export const CustomerList = () => {
  const { data: customers, isLoading, isError, error } = useCustomers();
  const { user } = useAuthContext();
  const [showCreate, setShowCreate] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const { data: userCompany } = useUserCompany(user?.id);
  const companyId = userCompany?.company_id;

  if (isLoading) {
    return <p className="text-muted-foreground">Loading customers...</p>;
  }

  if (isError) {
    return <p className="text-destructive">{error.message}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Button onClick={() => setShowCreate(true)} disabled={!companyId}>
          New Customer
        </Button>
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

- [ ] **Step 7: Update CustomerList.test.tsx to mock useUserCompany instead of supabase**

Replace the entire file with:

```typescript
// src/features/customers/components/CustomerList.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils";
import { CustomerList } from "./CustomerList";
import type { Customer } from "@/lib/types";

// Mock AuthProvider
vi.mock("@/features/auth/AuthProvider", () => ({
  useAuthContext: () => ({ user: { id: "user-1" } }),
}));

// Mock useCustomers hook
const mockUseCustomers = vi.fn();
vi.mock("../hooks/useCustomers", () => ({
  useCustomers: () => mockUseCustomers(),
}));

// Mock useUserCompany hook
const mockUseUserCompany = vi.fn();
vi.mock("../hooks/useUserCompany", () => ({
  useUserCompany: () => mockUseUserCompany(),
}));

// Mock useCreateCustomer and useUpdateCustomer (used by CustomerForm)
vi.mock("../hooks/useCreateCustomer", () => ({
  useCreateCustomer: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}));
vi.mock("../hooks/useUpdateCustomer", () => ({
  useUpdateCustomer: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}));

const CUSTOMERS: Customer[] = [
  { id: "c1", name: "Alice Smith", email: "alice@acme.com", company_id: "co1", created_at: "2026-01-01T00:00:00Z" },
  { id: "c2", name: "Bob Jones", email: "bob@acme.com", company_id: "co1", created_at: "2026-02-01T00:00:00Z" },
];

describe("CustomerList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows loading state", () => {
    mockUseCustomers.mockReturnValue({ isLoading: true, isError: false, data: undefined, error: null });
    mockUseUserCompany.mockReturnValue({ data: { company_id: "co1" } });

    renderWithProviders(<CustomerList />);
    expect(screen.getByText("Loading customers...")).toBeTruthy();
  });

  it("shows error state", () => {
    mockUseCustomers.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
      error: { message: "Permission denied" },
    });
    mockUseUserCompany.mockReturnValue({ data: { company_id: "co1" } });

    renderWithProviders(<CustomerList />);
    expect(screen.getByText("Permission denied")).toBeTruthy();
  });

  it("shows empty state", async () => {
    mockUseCustomers.mockReturnValue({ isLoading: false, isError: false, data: [], error: null });
    mockUseUserCompany.mockReturnValue({ data: { company_id: "co1" } });

    renderWithProviders(<CustomerList />);
    await waitFor(() => expect(screen.getByText("No customers yet")).toBeTruthy());
  });

  it("renders a row per customer with name and email", async () => {
    mockUseCustomers.mockReturnValue({ isLoading: false, isError: false, data: CUSTOMERS, error: null });
    mockUseUserCompany.mockReturnValue({ data: { company_id: "co1" } });

    renderWithProviders(<CustomerList />);
    await waitFor(() => expect(screen.getByText("Alice Smith")).toBeTruthy());
    expect(screen.getByText("alice@acme.com")).toBeTruthy();
    expect(screen.getByText("Bob Jones")).toBeTruthy();
    expect(screen.getByText("bob@acme.com")).toBeTruthy();
  });

  it("New Customer button is disabled while companyId is loading", async () => {
    mockUseCustomers.mockReturnValue({ isLoading: false, isError: false, data: [], error: null });
    mockUseUserCompany.mockReturnValue({ data: undefined });

    renderWithProviders(<CustomerList />);
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: "New Customer" });
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it("New Customer button enabled when companyId resolves, and clicking shows form", async () => {
    mockUseCustomers.mockReturnValue({ isLoading: false, isError: false, data: CUSTOMERS, error: null });
    mockUseUserCompany.mockReturnValue({ data: { company_id: "co1" } });

    renderWithProviders(<CustomerList />);
    const btn = await screen.findByRole("button", { name: "New Customer" });
    await waitFor(() => expect((btn as HTMLButtonElement).disabled).toBe(false));
    await userEvent.click(btn);
    expect(screen.getByText("New Customer", { selector: "div" })).toBeTruthy();
  });

  it("clicking Edit shows pre-filled form for that customer", async () => {
    mockUseCustomers.mockReturnValue({ isLoading: false, isError: false, data: CUSTOMERS, error: null });
    mockUseUserCompany.mockReturnValue({ data: { company_id: "co1" } });

    renderWithProviders(<CustomerList />);
    await waitFor(() => expect(screen.getByText("Alice Smith")).toBeTruthy());
    const user = userEvent.setup();
    const editButtons = screen.getAllByRole("button", { name: "Edit" });
    const firstEdit = editButtons[0];
    if (!firstEdit) throw new Error("No Edit button found");
    await user.click(firstEdit);
    expect(screen.getByText("Edit Customer")).toBeTruthy();
  });
});
```

- [ ] **Step 8: Update CustomerForm.tsx to import from split hook files**

Change the import line from:
```typescript
import { useCreateCustomer, useUpdateCustomer } from "../hooks/useCustomers";
```
to:
```typescript
import { useCreateCustomer } from "../hooks/useCreateCustomer";
import { useUpdateCustomer } from "../hooks/useUpdateCustomer";
```

- [ ] **Step 9: Update CustomerForm.test.tsx to mock split hook files**

Change the mock from:
```typescript
vi.mock("../hooks/useCustomers", () => ({
  useCreateCustomer: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
    error: null,
  }),
  useUpdateCustomer: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
    error: null,
  }),
}));
```
to:
```typescript
vi.mock("../hooks/useCreateCustomer", () => ({
  useCreateCustomer: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
    error: null,
  }),
}));

vi.mock("../hooks/useUpdateCustomer", () => ({
  useUpdateCustomer: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
    error: null,
  }),
}));
```

- [ ] **Step 10: Run all customer tests**

```bash
npm test -- customers
```

Expected: All PASS

- [ ] **Step 11: Commit**

```bash
git add src/features/customers/
git commit -m "refactor: split customers hooks one-per-action, add service layer"
```

---

### Task 4: Companies service layer

**Files:**
- Create: `src/features/companies/services/companies.ts`
- Create: `src/features/companies/services/companies.test.ts`
- Create: `src/features/companies/services/invites.ts`
- Create: `src/features/companies/services/invites.test.ts`

- [ ] **Step 1: Write failing companies service tests**

```typescript
// src/features/companies/services/companies.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchCompanies, fetchCompany, createCompany, updateCompany, deleteCompany } from "./companies";

const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const makeChain = (resolve: unknown) => {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockResolvedValue(resolve);
  chain.single = vi.fn().mockResolvedValue(resolve);
  return chain;
};

describe("fetchCompanies", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns companies list", async () => {
    const rows = [{ id: "c1", name: "Acme", created_at: "", updated_at: "" }];
    mockFrom.mockReturnValue(makeChain({ data: rows, error: null }));
    expect(await fetchCompanies()).toEqual(rows);
  });

  it("throws on error", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "fail" } }));
    await expect(fetchCompanies()).rejects.toEqual({ message: "fail" });
  });
});

describe("fetchCompany", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns single company by id", async () => {
    const row = { id: "c1", name: "Acme", created_at: "", updated_at: "" };
    const chain = makeChain({ data: row, error: null });
    mockFrom.mockReturnValue(chain);
    expect(await fetchCompany("c1")).toEqual(row);
    expect(chain.eq).toHaveBeenCalledWith("id", "c1");
  });
});

describe("createCompany", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts with name and returns row", async () => {
    const row = { id: "c1", name: "New Corp", created_at: "", updated_at: "" };
    const chain = makeChain({ data: row, error: null });
    mockFrom.mockReturnValue(chain);
    expect(await createCompany("New Corp")).toEqual(row);
    expect(chain.insert).toHaveBeenCalledWith({ name: "New Corp" });
  });
});

describe("updateCompany", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates name and returns row", async () => {
    const row = { id: "c1", name: "Updated Corp", created_at: "", updated_at: "" };
    const chain = makeChain({ data: row, error: null });
    mockFrom.mockReturnValue(chain);
    expect(await updateCompany({ id: "c1", name: "Updated Corp" })).toEqual(row);
    expect(chain.update).toHaveBeenCalledWith({ name: "Updated Corp" });
    expect(chain.eq).toHaveBeenCalledWith("id", "c1");
  });
});

describe("deleteCompany", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes by id without error", async () => {
    const chain = makeChain({ error: null });
    mockFrom.mockReturnValue(chain);
    await expect(deleteCompany("c1")).resolves.toBeUndefined();
    expect(chain.eq).toHaveBeenCalledWith("id", "c1");
  });

  it("throws on error", async () => {
    mockFrom.mockReturnValue(makeChain({ error: { message: "FK violation" } }));
    await expect(deleteCompany("c1")).rejects.toEqual({ message: "FK violation" });
  });
});
```

- [ ] **Step 2: Write failing invite service tests**

```typescript
// src/features/companies/services/invites.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createInvite, validateInvite } from "./invites";

const mockRpc = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

describe("createInvite", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls create_invite RPC with company ids", async () => {
    mockRpc.mockResolvedValue({
      data: [{ invite_id: "inv-1", token: "tok-abc" }],
      error: null,
    });
    const result = await createInvite({ email: "a@x.com", role: "agent", companyIds: ["co1"] });
    expect(result).toEqual({ invite: { id: "inv-1" }, token: "tok-abc" });
    expect(mockRpc).toHaveBeenCalledWith("create_invite", {
      p_email: "a@x.com",
      p_role: "agent",
      p_company_ids: ["co1"],
    });
  });

  it("omits p_company_ids when empty", async () => {
    mockRpc.mockResolvedValue({ data: [{ invite_id: "inv-2", token: "tok-xyz" }], error: null });
    await createInvite({ email: "a@x.com", role: "agent", companyIds: [] });
    expect(mockRpc).toHaveBeenCalledWith("create_invite", { p_email: "a@x.com", p_role: "agent" });
  });

  it("throws when data is empty", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await expect(createInvite({ email: "a@x.com", role: "agent", companyIds: [] })).rejects.toThrow(
      "Failed to create invite",
    );
  });

  it("throws on RPC error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "Forbidden" } });
    await expect(createInvite({ email: "a@x.com", role: "agent", companyIds: [] })).rejects.toEqual({
      message: "Forbidden",
    });
  });
});

describe("validateInvite", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns email from RPC", async () => {
    mockRpc.mockResolvedValue({ data: [{ email: "a@x.com" }], error: null });
    const result = await validateInvite("tok-abc");
    expect(result).toEqual({ email: "a@x.com" });
    expect(mockRpc).toHaveBeenCalledWith("validate_invite", { p_token: "tok-abc" });
  });

  it("throws when no data returned", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await expect(validateInvite("bad-token")).rejects.toThrow("Invalid or expired invite link");
  });

  it("throws on RPC error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "DB error" } });
    await expect(validateInvite("tok")).rejects.toEqual({ message: "DB error" });
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- companies/services/
```

Expected: FAIL with `Cannot find module './companies'` and `Cannot find module './invites'`

- [ ] **Step 4: Implement companies service**

```typescript
// src/features/companies/services/companies.ts
import { supabase } from "@/lib/supabase";
import type { Company } from "@/lib/types";

export const fetchCompanies = async (): Promise<Company[]> => {
  const { data, error } = await supabase.from("companies").select("*").order("name");
  if (error) throw error;
  return data;
};

export const fetchCompany = async (id: string): Promise<Company> => {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
};

export const createCompany = async (name: string): Promise<Company> => {
  const { data, error } = await supabase
    .from("companies")
    .insert({ name })
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateCompany = async ({ id, name }: { id: string; name: string }): Promise<Company> => {
  const { data, error } = await supabase
    .from("companies")
    .update({ name })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteCompany = async (id: string): Promise<void> => {
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw error;
};
```

- [ ] **Step 5: Implement invites service**

```typescript
// src/features/companies/services/invites.ts
import { supabase } from "@/lib/supabase";
import type { AppRole } from "@/lib/types";

type CreateInviteParams = {
  email: string;
  role: AppRole;
  companyIds: string[];
};

export const createInvite = async ({
  email,
  role,
  companyIds,
}: CreateInviteParams): Promise<{ invite: { id: string }; token: string }> => {
  const params: { p_email: string; p_role: AppRole; p_company_ids?: string[] } = {
    p_email: email,
    p_role: role,
  };
  if (companyIds.length > 0) {
    params.p_company_ids = companyIds;
  }
  const { data, error } = await supabase.rpc("create_invite", params);
  if (error) throw error;

  const row = data?.[0];
  if (!row) throw new Error("Failed to create invite");

  return { invite: { id: row.invite_id }, token: row.token };
};

export const validateInvite = async (token: string): Promise<{ email: string }> => {
  const { data, error } = await supabase.rpc("validate_invite", { p_token: token });
  if (error) throw error;

  const row = (data as { email: string }[] | null)?.[0];
  if (!row) throw new Error("Invalid or expired invite link");

  return { email: row.email };
};
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test -- companies/services/
```

Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/companies/services/
git commit -m "feat: add companies and invites service layers"
```

---

### Task 5: Split companies hooks + update components + update tests

**Files:**
- Modify: `src/features/companies/hooks/useCompanies.ts`
- Create: `src/features/companies/hooks/useCreateCompany.ts`
- Create: `src/features/companies/hooks/useUpdateCompany.ts`
- Create: `src/features/companies/hooks/useDeleteCompany.ts`
- Modify: `src/features/companies/hooks/useCompany.ts`
- Modify: `src/features/companies/hooks/useCreateInvite.ts`
- Modify: `src/features/companies/hooks/useCompanies.test.tsx`
- Modify: `src/features/companies/hooks/useCreateInvite.test.tsx`
- Modify: `src/features/companies/components/CompanyForm.tsx`
- Modify: `src/features/companies/components/CompanyDetail.tsx`

- [ ] **Step 1: Replace useCompanies.ts with query-only hook**

```typescript
// src/features/companies/hooks/useCompanies.ts
import { useQuery } from "@tanstack/react-query";
import { fetchCompanies } from "../services/companies";
import type { Company } from "@/lib/types";

export const useCompanies = () =>
  useQuery<Company[]>({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
  });
```

- [ ] **Step 2: Create useCreateCompany.ts**

```typescript
// src/features/companies/hooks/useCreateCompany.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCompany } from "../services/companies";

export const useCreateCompany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCompany,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }),
  });
};
```

- [ ] **Step 3: Create useUpdateCompany.ts**

```typescript
// src/features/companies/hooks/useUpdateCompany.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCompany } from "../services/companies";

export const useUpdateCompany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCompany,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }),
  });
};
```

- [ ] **Step 4: Create useDeleteCompany.ts**

```typescript
// src/features/companies/hooks/useDeleteCompany.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteCompany } from "../services/companies";

export const useDeleteCompany = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["companies"] }),
  });
};
```

- [ ] **Step 5: Update useCompany.ts to use service**

```typescript
// src/features/companies/hooks/useCompany.ts
import { useQuery } from "@tanstack/react-query";
import { fetchCompany } from "../services/companies";
import type { Company } from "@/lib/types";

export const useCompany = (id: string | undefined) =>
  useQuery<Company>({
    queryKey: ["company", id],
    queryFn: () => {
      if (!id) throw new Error("Company id is required");
      return fetchCompany(id);
    },
    enabled: !!id,
  });
```

- [ ] **Step 6: Update useCreateInvite.ts to use service**

```typescript
// src/features/companies/hooks/useCreateInvite.ts
import { useMutation } from "@tanstack/react-query";
import { createInvite } from "../services/invites";
import type { AppRole } from "@/lib/types";

type CreateInviteParams = {
  email: string;
  role: AppRole;
  companyIds: string[];
};

export const useCreateInvite = () =>
  useMutation({
    mutationFn: (params: CreateInviteParams) => createInvite(params),
  });
```

- [ ] **Step 7: Update useCompanies.test.tsx to mock service**

Replace the entire file with:

```typescript
// src/features/companies/hooks/useCompanies.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { useCompanies } from "./useCompanies";
import { useCreateCompany } from "./useCreateCompany";

const mockFetchCompanies = vi.fn();
const mockCreateCompany = vi.fn();

vi.mock("../services/companies", () => ({
  fetchCompanies: () => mockFetchCompanies(),
  fetchCompany: vi.fn(),
  createCompany: (name: unknown) => mockCreateCompany(name),
  updateCompany: vi.fn(),
  deleteCompany: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useCompanies", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches companies list", async () => {
    const companies = [
      { id: "c1", name: "Acme", created_at: "", updated_at: "" },
      { id: "c2", name: "Beta", created_at: "", updated_at: "" },
    ];
    mockFetchCompanies.mockResolvedValue(companies);

    const { result } = renderHook(() => useCompanies(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(companies);
  });

  it("handles fetch error", async () => {
    mockFetchCompanies.mockRejectedValue(new Error("Permission denied"));

    const { result } = renderHook(() => useCompanies(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreateCompany", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls createCompany service with name", async () => {
    const newCompany = { id: "c1", name: "New Corp", created_at: "", updated_at: "" };
    mockCreateCompany.mockResolvedValue(newCompany);

    const { result } = renderHook(() => useCreateCompany(), { wrapper: createWrapper() });

    result.current.mutate("New Corp");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCreateCompany).toHaveBeenCalledWith("New Corp");
  });
});
```

- [ ] **Step 8: Update useCreateInvite.test.tsx to mock service**

Replace the entire file with:

```typescript
// src/features/companies/hooks/useCreateInvite.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { useCreateInvite } from "./useCreateInvite";

const mockCreateInvite = vi.fn();

vi.mock("../services/invites", () => ({
  createInvite: (args: unknown) => mockCreateInvite(args),
  validateInvite: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useCreateInvite", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls createInvite service with correct params", async () => {
    mockCreateInvite.mockResolvedValue({ invite: { id: "inv-1" }, token: "tok-abc" });

    const { result } = renderHook(() => useCreateInvite(), { wrapper: createWrapper() });

    result.current.mutate({ email: "agent@example.com", role: "agent", companyIds: ["co1"] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCreateInvite).toHaveBeenCalledWith({
      email: "agent@example.com",
      role: "agent",
      companyIds: ["co1"],
    });
    expect(result.current.data).toEqual({ invite: { id: "inv-1" }, token: "tok-abc" });
  });

  it("handles service error", async () => {
    mockCreateInvite.mockRejectedValue(new Error("Only admins can create invites"));

    const { result } = renderHook(() => useCreateInvite(), { wrapper: createWrapper() });

    result.current.mutate({ email: "test@x.com", role: "customer_manager", companyIds: [] });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
```

- [ ] **Step 9: Update CompanyForm.tsx import**

In `src/features/companies/components/CompanyForm.tsx`, find the import:
```typescript
import { useCreateCompany } from "../hooks/useCompanies";
```
Replace with:
```typescript
import { useCreateCompany } from "../hooks/useCreateCompany";
```

- [ ] **Step 10: Update CompanyDetail.tsx imports**

In `src/features/companies/components/CompanyDetail.tsx`, find the import:
```typescript
import { useUpdateCompany, useDeleteCompany } from "../hooks/useCompanies";
```
Replace with:
```typescript
import { useUpdateCompany } from "../hooks/useUpdateCompany";
import { useDeleteCompany } from "../hooks/useDeleteCompany";
```

- [ ] **Step 11: Run all companies tests**

```bash
npm test -- companies
```

Expected: All PASS

- [ ] **Step 12: Commit**

```bash
git add src/features/companies/
git commit -m "refactor: split companies hooks one-per-action, add service layer"
```

---

### Task 6: Agents service layer + update hooks + tests

**Files:**
- Create: `src/features/agents/services/agents.ts`
- Create: `src/features/agents/services/agents.test.ts`
- Modify: `src/features/agents/hooks/useAgents.ts`
- Modify: `src/features/agents/hooks/useAgentCompanies.ts`
- Modify: `src/features/agents/hooks/useAgentCompanies.test.tsx`

- [ ] **Step 1: Write failing agents service tests**

```typescript
// src/features/agents/services/agents.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchAgents, updateAgentCompanies } from "./agents";
import type { AgentWithCompanies } from "../types";

const mockFrom = vi.fn();
const mockRpc = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

const makeChain = (resolve: unknown) => {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockResolvedValue(resolve);
  return chain;
};

describe("fetchAgents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns agents with their companies", async () => {
    const profiles = [{ user_id: "u1", name: "Agent A", role: "agent", created_at: "" }];
    const userCompanies = [{ user_id: "u1", companies: { id: "co1", name: "Acme", created_at: "", updated_at: "" } }];

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") return makeChain({ data: profiles, error: null });
      if (table === "user_companies") return makeChain({ data: userCompanies, error: null });
      return makeChain({ data: null, error: null });
    });

    const result = await fetchAgents();
    expect(result).toHaveLength(1);
    expect((result as AgentWithCompanies[])[0].companies).toHaveLength(1);
    expect((result as AgentWithCompanies[])[0].companies[0].name).toBe("Acme");
  });

  it("throws on profiles error", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "Forbidden" } }));
    await expect(fetchAgents()).rejects.toEqual({ message: "Forbidden" });
  });
});

describe("updateAgentCompanies", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls update_agent_companies RPC", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await updateAgentCompanies({ agentId: "u1", companyIds: ["co1"] });
    expect(mockRpc).toHaveBeenCalledWith("update_agent_companies", {
      p_agent_id: "u1",
      p_company_ids: ["co1"],
    });
  });

  it("throws on error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "Permission denied" } });
    await expect(updateAgentCompanies({ agentId: "u1", companyIds: [] })).rejects.toEqual({
      message: "Permission denied",
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- agents/services/agents.test.ts
```

Expected: FAIL with `Cannot find module './agents'`

- [ ] **Step 3: Implement agents service**

```typescript
// src/features/agents/services/agents.ts
import { supabase } from "@/lib/supabase";
import type { AgentWithCompanies } from "../types";

export const fetchAgents = async (): Promise<AgentWithCompanies[]> => {
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "agent")
    .order("name");

  if (profilesError) throw profilesError;

  const agentUserIds = profiles.map((p) => p.user_id);

  const { data: userCompanies, error: ucError } = await supabase
    .from("user_companies")
    .select("user_id, companies(*)")
    .in("user_id", agentUserIds);

  if (ucError) throw ucError;

  const companiesByAgent = new Map<string, AgentWithCompanies["companies"]>();
  for (const uc of userCompanies ?? []) {
    if (!uc.companies) continue;
    const existing = companiesByAgent.get(uc.user_id) ?? [];
    existing.push(uc.companies as AgentWithCompanies["companies"][number]);
    companiesByAgent.set(uc.user_id, existing);
  }

  return profiles.map((profile) => ({
    ...profile,
    companies: companiesByAgent.get(profile.user_id) ?? [],
  }));
};

export const updateAgentCompanies = async ({
  agentId,
  companyIds,
}: {
  agentId: string;
  companyIds: string[];
}): Promise<void> => {
  const { error } = await supabase.rpc("update_agent_companies", {
    p_agent_id: agentId,
    p_company_ids: companyIds,
  });
  if (error) throw error;
};
```

- [ ] **Step 4: Update useAgents.ts to use service**

```typescript
// src/features/agents/hooks/useAgents.ts
import { useQuery } from "@tanstack/react-query";
import { fetchAgents } from "../services/agents";
import type { AgentWithCompanies } from "../types";

export const useAgents = () =>
  useQuery<AgentWithCompanies[]>({
    queryKey: ["agents"],
    queryFn: fetchAgents,
  });
```

- [ ] **Step 5: Update useAgentCompanies.ts to use service**

```typescript
// src/features/agents/hooks/useAgentCompanies.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAgentCompanies } from "../services/agents";

export const useUpdateAgentCompanies = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateAgentCompanies,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["agents"] }),
  });
};
```

- [ ] **Step 6: Update useAgentCompanies.test.tsx to mock service**

Replace the entire file with:

```typescript
// src/features/agents/hooks/useAgentCompanies.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { useUpdateAgentCompanies } from "./useAgentCompanies";

const mockUpdateAgentCompanies = vi.fn();

vi.mock("../services/agents", () => ({
  fetchAgents: vi.fn(),
  updateAgentCompanies: (args: unknown) => mockUpdateAgentCompanies(args),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useUpdateAgentCompanies", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls updateAgentCompanies service with correct params", async () => {
    mockUpdateAgentCompanies.mockResolvedValue(undefined);

    const { result } = renderHook(() => useUpdateAgentCompanies(), { wrapper: createWrapper() });

    result.current.mutate({ agentId: "agent-123", companyIds: ["co1", "co2"] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdateAgentCompanies).toHaveBeenCalledWith({
      agentId: "agent-123",
      companyIds: ["co1", "co2"],
    });
  });

  it("handles service error", async () => {
    mockUpdateAgentCompanies.mockRejectedValue(new Error("Permission denied"));

    const { result } = renderHook(() => useUpdateAgentCompanies(), { wrapper: createWrapper() });

    result.current.mutate({ agentId: "agent-123", companyIds: ["co1"] });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("handles empty companyIds", async () => {
    mockUpdateAgentCompanies.mockResolvedValue(undefined);

    const { result } = renderHook(() => useUpdateAgentCompanies(), { wrapper: createWrapper() });

    result.current.mutate({ agentId: "agent-123", companyIds: [] });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockUpdateAgentCompanies).toHaveBeenCalledWith({ agentId: "agent-123", companyIds: [] });
  });
});
```

- [ ] **Step 7: Run all agents tests**

```bash
npm test -- agents
```

Expected: All PASS

- [ ] **Step 8: Commit**

```bash
git add src/features/agents/
git commit -m "refactor: add agents service layer, update hooks to import service"
```

---

### Task 7: Auth service layer + update hooks + components + tests

**Files:**
- Create: `src/features/auth/services/auth.ts`
- Create: `src/features/auth/services/profile.ts`
- Create: `src/features/auth/services/invite.ts`
- Modify: `src/features/auth/hooks/useAuth.ts`
- Modify: `src/features/auth/hooks/useProfile.ts`
- Modify: `src/features/auth/AuthProvider.tsx`
- Modify: `src/features/auth/AuthProvider.test.tsx`
- Modify: `src/features/auth/components/SignupForm.tsx`

- [ ] **Step 1: Create auth service**

```typescript
// src/features/auth/services/auth.ts
import { supabase } from "@/lib/supabase";
import type { Session, AuthChangeEvent, Subscription } from "@supabase/supabase-js";

export const signIn = async (email: string, password: string): Promise<void> => {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
};

export const signUp = async (
  email: string,
  password: string,
  name: string,
  token?: string,
): Promise<void> => {
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, ...(token ? { invite_token: token } : {}) } },
  });
  if (error) throw error;
};

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getSession = async (): Promise<Session | null> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
};

export const onAuthStateChange = (
  callback: (event: AuthChangeEvent, session: Session | null) => void,
): { unsubscribe: () => void } => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(callback);
  return { unsubscribe: () => subscription.unsubscribe() };
};
```

- [ ] **Step 2: Create profile service**

```typescript
// src/features/auth/services/profile.ts
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

export const fetchProfile = async (userId: string): Promise<Profile> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data;
};
```

- [ ] **Step 3: Create invite service**

```typescript
// src/features/auth/services/invite.ts
import { supabase } from "@/lib/supabase";

export const validateInvite = async (token: string): Promise<{ email: string }> => {
  const { data, error } = await supabase.rpc("validate_invite", { p_token: token });
  if (error) throw error;

  const row = (data as { email: string }[] | null)?.[0];
  if (!row) throw new Error("Invalid or expired invite link");

  return { email: row.email };
};
```

- [ ] **Step 4: Update useAuth.ts to use auth service**

```typescript
// src/features/auth/hooks/useAuth.ts
import { signIn, signUp, signOut } from "../services/auth";

export const useAuth = () => ({ signIn, signUp, signOut });
```

- [ ] **Step 5: Update useProfile.ts to use profile service**

```typescript
// src/features/auth/hooks/useProfile.ts
import { useQuery } from "@tanstack/react-query";
import { fetchProfile } from "../services/profile";
import type { Profile } from "@/lib/types";

export const useProfile = (userId: string | undefined) =>
  useQuery<Profile>({
    queryKey: ["profile", userId],
    queryFn: () => {
      if (!userId) throw new Error("userId is required");
      return fetchProfile(userId);
    },
    enabled: !!userId,
  });
```

- [ ] **Step 6: Update AuthProvider.tsx to use auth service**

```typescript
// src/features/auth/AuthProvider.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { getSession, onAuthStateChange } from "./services/auth";
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

// eslint-disable-next-line react-refresh/only-export-components
export const useAuthContext = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession()
      .then((session) => {
        setSession(session);
        setLoading(false);
      })
      .catch(() => {
        setSession(null);
        setLoading(false);
      });

    const { unsubscribe } = onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return unsubscribe;
  }, []);

  const user = session?.user ?? null;
  const { data: profile } = useProfile(user?.id);

  return (
    <AuthContext.Provider value={{ user, profile: profile ?? null, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
```

- [ ] **Step 7: Update AuthProvider.test.tsx to mock auth service**

Replace the entire file with:

```typescript
// src/features/auth/AuthProvider.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { AuthProvider, useAuthContext } from "./AuthProvider";

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock("./services/auth", () => ({
  getSession: () => mockGetSession(),
  onAuthStateChange: (...args: unknown[]) => {
    mockOnAuthStateChange(...args);
    return { unsubscribe: vi.fn() };
  },
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("./hooks/useProfile", () => ({
  useProfile: (userId: string | undefined) => ({
    data: userId
      ? { user_id: userId, name: "Test User", role: "admin", created_at: "" }
      : undefined,
  }),
}));

const AuthConsumer = () => {
  const { user, profile, loading } = useAuthContext();
  if (loading) return <div>Loading</div>;
  if (!user) return <div>No user</div>;
  return (
    <div>
      <span data-testid="email">{user.email}</span>
      <span data-testid="role">{profile?.role}</span>
    </div>
  );
};

describe("AuthProvider", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows loading state initially then resolves with session", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "user-1", email: "admin@test.com" },
      access_token: "token",
    });

    renderWithProviders(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    expect(screen.getByText("Loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("email")).toHaveTextContent("admin@test.com");
    });
    expect(screen.getByTestId("role")).toHaveTextContent("admin");
  });

  it("handles session load failure gracefully", async () => {
    mockGetSession.mockRejectedValue(new Error("Network error"));

    renderWithProviders(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("No user")).toBeInTheDocument();
    });
  });

  it("subscribes to auth state changes and cleans up on unmount", () => {
    const unsubscribeFn = vi.fn();
    mockGetSession.mockResolvedValue(null);
    mockOnAuthStateChange.mockImplementation(() => {});

    vi.mock("./services/auth", () => ({
      getSession: () => mockGetSession(),
      onAuthStateChange: (...args: unknown[]) => {
        mockOnAuthStateChange(...args);
        return { unsubscribe: unsubscribeFn };
      },
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    }));

    const { unmount } = renderWithProviders(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    unmount();
  });
});
```

- [ ] **Step 8: Update SignupForm.tsx to use invite service**

In `src/features/auth/components/SignupForm.tsx`:

Remove:
```typescript
import { supabase } from "@/lib/supabase";
```

Add:
```typescript
import { validateInvite } from "../services/invite";
```

Replace the `validateToken` function body from:
```typescript
    const { data, error: rpcError } = await supabase.rpc("validate_invite", {
      p_token: token,
    });

    if (rpcError || !data || data.length === 0) {
      setError("Invalid or expired invite link");
      setValidating(false);
      return;
    }

    const invite = data[0] as { email: string } | undefined;
    if (!invite) {
      setError("Invalid or expired invite link");
      setValidating(false);
      return;
    }
    setInviteEmail(invite.email);
    setValue("email", invite.email);
    setValidating(false);
```
to:
```typescript
    const invite = await validateInvite(token);
    setInviteEmail(invite.email);
    setValue("email", invite.email);
    setValidating(false);
```

- [ ] **Step 9: Run all auth tests**

```bash
npm test -- auth
```

Expected: All PASS

- [ ] **Step 10: Commit**

```bash
git add src/features/auth/
git commit -m "refactor: add auth/profile/invite service layers, update AuthProvider and SignupForm"
```

---

### Task 8: Final lint + build + open PR

**Files:** None modified.

- [ ] **Step 1: Run full lint**

```bash
npm run lint
```

Expected: 0 errors, 0 warnings. Fix any issues before continuing.

- [ ] **Step 2: Run full test suite**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 3: Run TypeScript build**

```bash
npm run build
```

Expected: Build succeeds with 0 type errors.

- [ ] **Step 4: Push branch and open PR**

```bash
git push -u origin feat/refactor-hooks-services
gh pr create \
  --title "refactor: separate hooks and services across all features" \
  --body "$(cat <<'EOF'
## Summary

- Adds `services/` folder per feature with plain async functions wrapping Supabase
- Splits multi-action hook files into one file per action
- Hooks no longer import from `@/lib/supabase` directly — only from their feature's service
- Hook tests mock the service layer; service tests mock supabase
- Documents the convention in CLAUDE.md

## Features refactored
- customers: service + 4 hooks (useCustomers, useCreateCustomer, useUpdateCustomer, useUserCompany)
- companies: service + invites service + 5 hooks (useCompanies, useCreateCompany, useUpdateCompany, useDeleteCompany, useCreateInvite)
- agents: service + 2 hooks (useAgents, useUpdateAgentCompanies)
- auth: auth/profile/invite services + updated useAuth, useProfile, AuthProvider, SignupForm

## Test plan
- [ ] All existing unit tests pass
- [ ] New service tests cover happy path and error for each function
- [ ] Hook tests now mock service module, not supabase directly
- [ ] E2E tests: login, customers CRUD, invite flow still work end-to-end

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: PR URL printed.
