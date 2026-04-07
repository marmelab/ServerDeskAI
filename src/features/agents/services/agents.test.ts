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
  chain.in = vi.fn().mockResolvedValue(resolve);
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

  it("returns agent with empty companies when no user_companies", async () => {
    const profiles = [{ user_id: "u1", name: "Agent A", role: "agent", created_at: "" }];
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: profiles, error: null });
      return makeChain({ data: [], error: null });
    });

    const result = await fetchAgents();
    expect(result).toHaveLength(1);
    expect((result as AgentWithCompanies[])[0].companies).toHaveLength(0);
  });

  it("throws on user_companies error", async () => {
    const profiles = [{ user_id: "u1", name: "Agent A", role: "agent", created_at: "" }];
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: profiles, error: null });
      return makeChain({ data: null, error: { message: "user_companies failed" } });
    });

    await expect(fetchAgents()).rejects.toEqual({ message: "user_companies failed" });
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
