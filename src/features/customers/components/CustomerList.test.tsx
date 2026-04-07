import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils";
import { CustomerList } from "./CustomerList";
import type { Customer } from "@/lib/types";

// Mock AuthProvider
vi.mock("@/features/auth/AuthProvider", () => ({
  useAuthContext: () => ({ user: { id: "user-1" } }),
}));

// Mock useCustomers hook
const mockUseCustomers = vi.fn();
vi.mock("../hooks/useCustomers", () => ({
  useCustomers: () => mockUseCustomers(),
}));

// Mock useUserCompany hook
const mockUseUserCompany = vi.fn();
vi.mock("../hooks/useUserCompany", () => ({
  useUserCompany: () => mockUseUserCompany(),
}));

// Mock useCreateCustomer and useUpdateCustomer (used by CustomerForm)
vi.mock("../hooks/useCreateCustomer", () => ({
  useCreateCustomer: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}));
vi.mock("../hooks/useUpdateCustomer", () => ({
  useUpdateCustomer: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}));

const CUSTOMERS: Customer[] = [
  { id: "c1", name: "Alice Smith", email: "alice@acme.com", company_id: "co1", created_at: "2026-01-01T00:00:00Z" },
  { id: "c2", name: "Bob Jones", email: "bob@acme.com", company_id: "co1", created_at: "2026-02-01T00:00:00Z" },
];

describe("CustomerList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows loading state", () => {
    mockUseCustomers.mockReturnValue({ isLoading: true, isError: false, data: undefined, error: null });
    mockUseUserCompany.mockReturnValue({ data: { company_id: "co1" } });

    renderWithProviders(<CustomerList />);
    expect(screen.getByText("Loading customers...")).toBeTruthy();
  });

  it("shows error state", () => {
    mockUseCustomers.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
      error: { message: "Permission denied" },
    });
    mockUseUserCompany.mockReturnValue({ data: { company_id: "co1" } });

    renderWithProviders(<CustomerList />);
    expect(screen.getByText("Permission denied")).toBeTruthy();
  });

  it("shows empty state", async () => {
    mockUseCustomers.mockReturnValue({ isLoading: false, isError: false, data: [], error: null });
    mockUseUserCompany.mockReturnValue({ data: { company_id: "co1" } });

    renderWithProviders(<CustomerList />);
    await waitFor(() => expect(screen.getByText("No customers yet")).toBeTruthy());
  });

  it("renders a row per customer with name and email", async () => {
    mockUseCustomers.mockReturnValue({ isLoading: false, isError: false, data: CUSTOMERS, error: null });
    mockUseUserCompany.mockReturnValue({ data: { company_id: "co1" } });

    renderWithProviders(<CustomerList />);
    await waitFor(() => expect(screen.getByText("Alice Smith")).toBeTruthy());
    expect(screen.getByText("alice@acme.com")).toBeTruthy();
    expect(screen.getByText("Bob Jones")).toBeTruthy();
    expect(screen.getByText("bob@acme.com")).toBeTruthy();
  });

  it("New Customer button is disabled while companyId is loading", async () => {
    mockUseCustomers.mockReturnValue({ isLoading: false, isError: false, data: [], error: null });
    mockUseUserCompany.mockReturnValue({ data: undefined });

    renderWithProviders(<CustomerList />);
    await waitFor(() => {
      const btn = screen.getByRole("button", { name: "New Customer" });
      expect((btn as HTMLButtonElement).disabled).toBe(true);
    });
  });

  it("New Customer button enabled when companyId resolves, and clicking shows form", async () => {
    mockUseCustomers.mockReturnValue({ isLoading: false, isError: false, data: CUSTOMERS, error: null });
    mockUseUserCompany.mockReturnValue({ data: { company_id: "co1" } });

    renderWithProviders(<CustomerList />);
    const btn = await screen.findByRole("button", { name: "New Customer" });
    await waitFor(() => expect((btn as HTMLButtonElement).disabled).toBe(false));
    await userEvent.click(btn);
    expect(screen.getByText("New Customer", { selector: "div" })).toBeTruthy();
  });

  it("clicking Edit shows pre-filled form for that customer", async () => {
    mockUseCustomers.mockReturnValue({ isLoading: false, isError: false, data: CUSTOMERS, error: null });
    mockUseUserCompany.mockReturnValue({ data: { company_id: "co1" } });

    renderWithProviders(<CustomerList />);
    await waitFor(() => expect(screen.getByText("Alice Smith")).toBeTruthy());
    const user = userEvent.setup();
    const editButtons = screen.getAllByRole("button", { name: "Edit" });
    const firstEdit = editButtons[0];
    if (!firstEdit) throw new Error("No Edit button found");
    await user.click(firstEdit);
    expect(screen.getByText("Edit Customer")).toBeTruthy();
  });
});
