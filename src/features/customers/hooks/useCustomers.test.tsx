import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { useCustomers, useCreateCustomer, useUpdateCustomer } from "./useCustomers";

const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const makeChain = (terminal: () => Promise<unknown>) => {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockImplementation(terminal);
  chain.single = vi.fn().mockImplementation(terminal);
  return chain;
};

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
    const terminal = vi.fn().mockResolvedValue({ data: customers, error: null });
    mockFrom.mockReturnValue(makeChain(terminal));

    const { result } = renderHook(() => useCustomers(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(customers);
  });

  it("propagates query error", async () => {
    const terminal = vi.fn().mockResolvedValue({ data: null, error: { message: "Permission denied" } });
    mockFrom.mockReturnValue(makeChain(terminal));

    const { result } = renderHook(() => useCustomers(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreateCustomer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts with correct payload mapping camelCase to snake_case", async () => {
    const created = { id: "c1", name: "Bob", email: "bob@acme.com", company_id: "co1", created_at: "" };
    const terminal = vi.fn().mockResolvedValue({ data: created, error: null });
    const insertChain = makeChain(terminal);
    mockFrom.mockReturnValue(insertChain);

    const { result } = renderHook(() => useCreateCustomer(), { wrapper: createWrapper() });

    result.current.mutate({ name: "Bob", email: "bob@acme.com", companyId: "co1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(insertChain.insert).toHaveBeenCalledWith({
      name: "Bob",
      email: "bob@acme.com",
      company_id: "co1",
    });
  });

  it("propagates mutation error", async () => {
    const terminal = vi.fn().mockResolvedValue({ data: null, error: { message: "Unique violation" } });
    mockFrom.mockReturnValue(makeChain(terminal));

    const { result } = renderHook(() => useCreateCustomer(), { wrapper: createWrapper() });

    result.current.mutate({ name: "Bob", email: "bob@acme.com", companyId: "co1" });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useUpdateCustomer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates with name and email only — no company_id in payload", async () => {
    const updated = { id: "c1", name: "Alice Updated", email: "a@acme.com", company_id: "co1", created_at: "" };
    const terminal = vi.fn().mockResolvedValue({ data: updated, error: null });
    const updateChain = makeChain(terminal);
    mockFrom.mockReturnValue(updateChain);

    const { result } = renderHook(() => useUpdateCustomer(), { wrapper: createWrapper() });

    result.current.mutate({ id: "c1", name: "Alice Updated", email: "a@acme.com" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateChain.update).toHaveBeenCalledWith({ name: "Alice Updated", email: "a@acme.com" });
    expect(updateChain.eq).toHaveBeenCalledWith("id", "c1");
  });

  it("propagates mutation error", async () => {
    const terminal = vi.fn().mockResolvedValue({ data: null, error: { message: "Not found" } });
    mockFrom.mockReturnValue(makeChain(terminal));

    const { result } = renderHook(() => useUpdateCustomer(), { wrapper: createWrapper() });

    result.current.mutate({ id: "c1", name: "Alice", email: "a@acme.com" });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
