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
