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

  it("handles create error", async () => {
    mockCreateCompany.mockRejectedValue(new Error("Duplicate name"));

    const { result } = renderHook(() => useCreateCompany(), { wrapper: createWrapper() });

    result.current.mutate("New Corp");

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
