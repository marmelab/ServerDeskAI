import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchCompanies, fetchCompany, createCompany, updateCompany, deleteCompany } from "./companies";

const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const makeChain = (resolve: unknown) => {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockResolvedValue(resolve);
  chain.single = vi.fn().mockResolvedValue(resolve);
  return chain;
};

describe("fetchCompanies", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns companies list", async () => {
    const rows = [{ id: "c1", name: "Acme", created_at: "", updated_at: "" }];
    mockFrom.mockReturnValue(makeChain({ data: rows, error: null }));
    expect(await fetchCompanies()).toEqual(rows);
  });

  it("throws on error", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "fail" } }));
    await expect(fetchCompanies()).rejects.toEqual({ message: "fail" });
  });
});

describe("fetchCompany", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns single company by id", async () => {
    const row = { id: "c1", name: "Acme", created_at: "", updated_at: "" };
    const chain = makeChain({ data: row, error: null });
    mockFrom.mockReturnValue(chain);
    expect(await fetchCompany("c1")).toEqual(row);
    expect(chain.eq).toHaveBeenCalledWith("id", "c1");
  });

  it("throws on error", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "Not found" } }));
    await expect(fetchCompany("c1")).rejects.toEqual({ message: "Not found" });
  });
});

describe("createCompany", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts with name and returns row", async () => {
    const row = { id: "c1", name: "New Corp", created_at: "", updated_at: "" };
    const chain = makeChain({ data: row, error: null });
    mockFrom.mockReturnValue(chain);
    expect(await createCompany("New Corp")).toEqual(row);
    expect(chain.insert).toHaveBeenCalledWith({ name: "New Corp" });
  });

  it("throws on error", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "Duplicate" } }));
    await expect(createCompany("New Corp")).rejects.toEqual({ message: "Duplicate" });
  });
});

describe("updateCompany", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates name and returns row", async () => {
    const row = { id: "c1", name: "Updated Corp", created_at: "", updated_at: "" };
    const chain = makeChain({ data: row, error: null });
    mockFrom.mockReturnValue(chain);
    expect(await updateCompany({ id: "c1", name: "Updated Corp" })).toEqual(row);
    expect(chain.update).toHaveBeenCalledWith({ name: "Updated Corp" });
    expect(chain.eq).toHaveBeenCalledWith("id", "c1");
  });

  it("throws on error", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "Not found" } }));
    await expect(updateCompany({ id: "c1", name: "X" })).rejects.toEqual({ message: "Not found" });
  });
});

describe("deleteCompany", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes by id without error", async () => {
    const chain = makeChain({ error: null });
    mockFrom.mockReturnValue(chain);
    await expect(deleteCompany("c1")).resolves.toBeUndefined();
    expect(chain.eq).toHaveBeenCalledWith("id", "c1");
  });

  it("throws on error", async () => {
    mockFrom.mockReturnValue(makeChain({ error: { message: "FK violation" } }));
    await expect(deleteCompany("c1")).rejects.toEqual({ message: "FK violation" });
  });
});
