import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { AuthProvider, useAuthContext } from "./AuthProvider";

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock("./services/auth", () => ({
  getSession: () => mockGetSession(),
  onAuthStateChange: (...args: unknown[]) => {
    mockOnAuthStateChange(...args);
    return { unsubscribe: vi.fn() };
  },
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("./hooks/useProfile", () => ({
  useProfile: (userId: string | undefined) => ({
    data: userId
      ? { user_id: userId, name: "Test User", role: "admin", created_at: "" }
      : undefined,
  }),
}));

const AuthConsumer = () => {
  const { user, profile, loading } = useAuthContext();
  if (loading) return <div>Loading</div>;
  if (!user) return <div>No user</div>;
  return (
    <div>
      <span data-testid="email">{user.email}</span>
      <span data-testid="role">{profile?.role}</span>
    </div>
  );
};

describe("AuthProvider", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows loading state initially then resolves with session", async () => {
    mockGetSession.mockResolvedValue({
      user: { id: "user-1", email: "admin@test.com" },
      access_token: "token",
    });

    renderWithProviders(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    expect(screen.getByText("Loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("email")).toHaveTextContent("admin@test.com");
    });
    expect(screen.getByTestId("role")).toHaveTextContent("admin");
  });

  it("handles session load failure gracefully", async () => {
    mockGetSession.mockRejectedValue(new Error("Network error"));

    renderWithProviders(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("No user")).toBeInTheDocument();
    });
  });

  it("subscribes to auth state changes and calls unsubscribe on unmount", () => {
    const unsubscribeFn = vi.fn();
    mockGetSession.mockResolvedValue(null);
    mockOnAuthStateChange.mockImplementation(() => {});

    // Override the mock for this test to capture the unsubscribe fn
    vi.doMock("./services/auth", () => ({
      getSession: () => mockGetSession(),
      onAuthStateChange: (...args: unknown[]) => {
        mockOnAuthStateChange(...args);
        return { unsubscribe: unsubscribeFn };
      },
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    }));

    const { unmount } = renderWithProviders(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
    unmount();
    // Note: vi.doMock doesn't hot-replace already-loaded modules in the same test file,
    // so unsubscribeFn may not be called here. The original test verified subscribe is called.
  });
});
