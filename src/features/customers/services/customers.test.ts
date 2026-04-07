import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchCustomers,
  createCustomer,
  updateCustomer,
  fetchUserCompany,
} from "./customers";

const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const makeChain = (resolve: unknown) => {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockResolvedValue(resolve);
  chain.single = vi.fn().mockResolvedValue(resolve);
  return chain;
};

describe("fetchCustomers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns ordered customers", async () => {
    const rows = [{ id: "c1", name: "Alice", email: "a@x.com", company_id: "co1", created_at: "" }];
    mockFrom.mockReturnValue(makeChain({ data: rows, error: null }));
    const result = await fetchCustomers();
    expect(result).toEqual(rows);
  });

  it("throws on error", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "Permission denied" } }));
    await expect(fetchCustomers()).rejects.toEqual({ message: "Permission denied" });
  });
});

describe("createCustomer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts with company_id snake_case and returns row", async () => {
    const row = { id: "c1", name: "Bob", email: "b@x.com", company_id: "co1", created_at: "" };
    const chain = makeChain({ data: row, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await createCustomer({ name: "Bob", email: "b@x.com", companyId: "co1" });
    expect(result).toEqual(row);
    expect(chain.insert).toHaveBeenCalledWith({ name: "Bob", email: "b@x.com", company_id: "co1" });
  });

  it("throws on error", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "Unique violation" } }));
    await expect(createCustomer({ name: "Bob", email: "b@x.com", companyId: "co1" })).rejects.toEqual({
      message: "Unique violation",
    });
  });
});

describe("updateCustomer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates name and email only — no company_id", async () => {
    const row = { id: "c1", name: "Alice Updated", email: "a@x.com", company_id: "co1", created_at: "" };
    const chain = makeChain({ data: row, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await updateCustomer({ id: "c1", name: "Alice Updated", email: "a@x.com" });
    expect(result).toEqual(row);
    expect(chain.update).toHaveBeenCalledWith({ name: "Alice Updated", email: "a@x.com" });
    expect(chain.eq).toHaveBeenCalledWith("id", "c1");
  });

  it("throws on error", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "Not found" } }));
    await expect(updateCustomer({ id: "c1", name: "Alice", email: "a@x.com" })).rejects.toEqual({
      message: "Not found",
    });
  });
});

describe("fetchUserCompany", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns company_id for user", async () => {
    const chain = makeChain({ data: { company_id: "co1" }, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await fetchUserCompany("user-1");
    expect(result).toEqual({ company_id: "co1" });
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("throws on error", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "Not found" } }));
    await expect(fetchUserCompany("user-1")).rejects.toEqual({ message: "Not found" });
  });
});
