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
