import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { useUpdateAgentCompanies } from "./useAgentCompanies";

const mockRpc = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
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

describe("useUpdateAgentCompanies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the update_agent_companies RPC with correct params", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useUpdateAgentCompanies(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      agentId: "agent-123",
      companyIds: ["company-1", "company-2"],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRpc).toHaveBeenCalledWith("update_agent_companies", {
      p_agent_id: "agent-123",
      p_company_ids: ["company-1", "company-2"],
    });
  });

  it("handles RPC error", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "Permission denied" },
    });

    const { result } = renderHook(() => useUpdateAgentCompanies(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      agentId: "agent-123",
      companyIds: ["company-1"],
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({ message: "Permission denied" });
  });

  it("handles empty companyIds", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useUpdateAgentCompanies(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      agentId: "agent-123",
      companyIds: [],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRpc).toHaveBeenCalledWith("update_agent_companies", {
      p_agent_id: "agent-123",
      p_company_ids: [],
    });
  });
});
