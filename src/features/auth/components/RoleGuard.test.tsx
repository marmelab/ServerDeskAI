import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { RoleGuard } from "./RoleGuard";
import { Route, Routes } from "react-router";

const mockUseAuthContext = vi.fn();

vi.mock("../AuthProvider", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

const renderRoleGuard = (allowedRoles: ("admin" | "agent" | "customer_manager")[], initialEntries = ["/admin"]) => {
  return renderWithProviders(
    <Routes>
      <Route element={<RoleGuard allowedRoles={allowedRoles} />}>
        <Route path="/admin" element={<div>Admin Content</div>} />
      </Route>
      <Route path="/" element={<div>Home Page</div>} />
    </Routes>,
    { initialEntries },
  );
};

describe("RoleGuard", () => {
  it("renders nothing while loading or profile is null", () => {
    mockUseAuthContext.mockReturnValue({ profile: null, loading: true });
    const { container } = renderRoleGuard(["admin"]);
    expect(container.innerHTML).toBe("");
  });

  it("redirects to / when role is not allowed", () => {
    mockUseAuthContext.mockReturnValue({
      profile: { user_id: "u1", name: "Agent", role: "agent", created_at: "" },
      loading: false,
    });
    renderRoleGuard(["admin"]);
    expect(screen.getByText("Home Page")).toBeInTheDocument();
  });

  it("renders outlet when role is allowed", () => {
    mockUseAuthContext.mockReturnValue({
      profile: { user_id: "u1", name: "Admin", role: "admin", created_at: "" },
      loading: false,
    });
    renderRoleGuard(["admin"]);
    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });

  it("allows multiple roles", () => {
    mockUseAuthContext.mockReturnValue({
      profile: { user_id: "u1", name: "CM", role: "customer_manager", created_at: "" },
      loading: false,
    });
    renderRoleGuard(["admin", "customer_manager"]);
    expect(screen.getByText("Admin Content")).toBeInTheDocument();
  });
});
