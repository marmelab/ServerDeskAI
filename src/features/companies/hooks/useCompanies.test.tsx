import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import {
  useCompanies,
  useCreateCompany,
} from "./useCompanies";

const mockSelect = vi.fn();
const mockInsert = vi.fn();

const chainable = (terminal: (...args: unknown[]) => unknown) => {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockImplementation((...args: unknown[]) => terminal(...args));
  chain.single = vi.fn().mockImplementation((...args: unknown[]) => terminal(...args));
  return chain;
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "companies") {
        return {
          select: (...args: unknown[]) => {
            const chain = chainable(mockSelect);
            mockSelect.call(null, ...args);
            return chain;
          },
          insert: (...args: unknown[]) => {
            mockInsert(...args);
            return chainable(() => mockInsert.mock.results[mockInsert.mock.results.length - 1]?.value ?? { data: null, error: null });
          },
          update: () => {
            return chainable(() => ({ data: null, error: null }));
          },
          delete: () => {
            return chainable(() => ({ data: null, error: null }));
          },
        };
      }
      return {};
    },
  },
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches companies list", async () => {
    const companies = [
      { id: "c1", name: "Acme", created_at: "", updated_at: "" },
      { id: "c2", name: "Beta", created_at: "", updated_at: "" },
    ];
    mockSelect.mockResolvedValue({ data: companies, error: null });

    const { result } = renderHook(() => useCompanies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(companies);
  });

  it("handles fetch error", async () => {
    mockSelect.mockResolvedValue({
      data: null,
      error: { message: "Permission denied" },
    });

    const { result } = renderHook(() => useCompanies(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("useCreateCompany", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a company", async () => {
    const newCompany = { id: "c1", name: "New Corp", created_at: "", updated_at: "" };
    mockInsert.mockResolvedValue({ data: newCompany, error: null });

    const { result } = renderHook(() => useCreateCompany(), {
      wrapper: createWrapper(),
    });

    result.current.mutate("New Corp");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockInsert).toHaveBeenCalledWith({ name: "New Corp" });
  });
});
