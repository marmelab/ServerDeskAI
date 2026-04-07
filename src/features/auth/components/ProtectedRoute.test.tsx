import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { ProtectedRoute } from "./ProtectedRoute";
import { Route, Routes } from "react-router";

const mockUseAuthContext = vi.fn();

vi.mock("../AuthProvider", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

const renderProtectedRoute = (initialEntries = ["/"]) => {
  return renderWithProviders(
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<div>Protected Content</div>} />
      </Route>
      <Route path="/login" element={<div>Login Page</div>} />
    </Routes>,
    { initialEntries },
  );
};

describe("ProtectedRoute", () => {
  it("shows loading state while auth is loading", () => {
    mockUseAuthContext.mockReturnValue({ user: null, loading: true });
    renderProtectedRoute();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("redirects to /login when user is not authenticated", () => {
    mockUseAuthContext.mockReturnValue({ user: null, loading: false });
    renderProtectedRoute();
    expect(screen.getByText("Login Page")).toBeInTheDocument();
  });

  it("renders outlet when user is authenticated", () => {
    mockUseAuthContext.mockReturnValue({
      user: { id: "user-1", email: "admin@test.com" },
      loading: false,
    });
    renderProtectedRoute();
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });
});
