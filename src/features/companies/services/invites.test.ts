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
