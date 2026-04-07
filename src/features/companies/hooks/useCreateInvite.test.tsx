import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { useCreateInvite } from "./useCreateInvite";

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

describe("useCreateInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the create_invite RPC with correct params", async () => {
    mockRpc.mockResolvedValue({
      data: [{ invite_id: "inv-1", token: "generated-token-abc" }],
      error: null,
    });

    const { result } = renderHook(() => useCreateInvite(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      email: "agent@example.com",
      role: "agent",
      companyIds: ["company-1"],
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRpc).toHaveBeenCalledWith("create_invite", {
      p_email: "agent@example.com",
      p_role: "agent",
      p_company_ids: ["company-1"],
    });

    expect(result.current.data).toEqual({
      invite: { id: "inv-1" },
      token: "generated-token-abc",
    });
  });

  it("handles RPC error", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "Only admins can create invites" },
    });

    const { result } = renderHook(() => useCreateInvite(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      email: "test@example.com",
      role: "customer_manager",
      companyIds: [],
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual({
      message: "Only admins can create invites",
    });
  });

  it("handles empty data response", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useCreateInvite(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      email: "test@example.com",
      role: "agent",
      companyIds: [],
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe(
      "Failed to create invite",
    );
  });
});
