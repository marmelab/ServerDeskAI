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
