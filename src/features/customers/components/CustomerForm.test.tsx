import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test-utils";
import { CustomerForm } from "./CustomerForm";
import type { Customer } from "@/lib/types";

const mockCreateMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();

vi.mock("../hooks/useCreateCustomer", () => ({
  useCreateCustomer: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
    error: null,
  }),
}));

vi.mock("../hooks/useUpdateCustomer", () => ({
  useUpdateCustomer: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
    error: null,
  }),
}));

const mockOnClose = vi.fn();
const COMPANY_ID = "co-1";

const EXISTING_CUSTOMER: Customer = {
  id: "cust-1",
  name: "Alice Smith",
  email: "alice@acme.com",
  company_id: COMPANY_ID,
  created_at: "2026-01-01T00:00:00Z",
};

describe("CustomerForm — create mode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders New Customer title with empty fields", () => {
    renderWithProviders(
      <CustomerForm companyId={COMPANY_ID} onClose={mockOnClose} />,
    );
    expect(screen.getByText("New Customer")).toBeTruthy();
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("");
    expect(screen.getByRole("button", { name: "Create" })).toBeTruthy();
  });

  it("shows validation error for empty name", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CustomerForm companyId={COMPANY_ID} onClose={mockOnClose} />,
    );
    await user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(screen.getByText("Name is required")).toBeTruthy());
    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
  });

  it("shows validation error for invalid email", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CustomerForm companyId={COMPANY_ID} onClose={mockOnClose} />,
    );
    await user.type(screen.getByLabelText("Name"), "Bob");
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() =>
      expect(screen.getByText("Please enter a valid email")).toBeTruthy(),
    );
    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
  });

  it("calls createCustomer.mutateAsync with correct args and then onClose", async () => {
    const user = userEvent.setup();
    mockCreateMutateAsync.mockResolvedValue({});
    renderWithProviders(
      <CustomerForm companyId={COMPANY_ID} onClose={mockOnClose} />,
    );
    await user.type(screen.getByLabelText("Name"), "Bob Jones");
    await user.type(screen.getByLabelText("Email"), "bob@acme.com");
    await user.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() =>
      expect(mockCreateMutateAsync).toHaveBeenCalledWith({
        name: "Bob Jones",
        email: "bob@acme.com",
        companyId: COMPANY_ID,
      }),
    );
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("calls onClose when Cancel is clicked without submitting", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CustomerForm companyId={COMPANY_ID} onClose={mockOnClose} />,
    );
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mockOnClose).toHaveBeenCalled();
    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
  });
});

describe("CustomerForm — edit mode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders Edit Customer title with pre-filled fields", () => {
    renderWithProviders(
      <CustomerForm
        companyId={COMPANY_ID}
        customer={EXISTING_CUSTOMER}
        onClose={mockOnClose}
      />,
    );
    expect(screen.getByText("Edit Customer")).toBeTruthy();
    expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Alice Smith");
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("alice@acme.com");
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
  });

  it("calls updateCustomer.mutateAsync with id, name, email — no companyId", async () => {
    const user = userEvent.setup();
    mockUpdateMutateAsync.mockResolvedValue({});
    renderWithProviders(
      <CustomerForm
        companyId={COMPANY_ID}
        customer={EXISTING_CUSTOMER}
        onClose={mockOnClose}
      />,
    );
    const nameField = screen.getByLabelText("Name");
    await user.clear(nameField);
    await user.type(nameField, "Alice Updated");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
        id: "cust-1",
        name: "Alice Updated",
        email: "alice@acme.com",
      }),
    );
    expect(mockOnClose).toHaveBeenCalled();
  });
});
