import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import { AuthProvider, useAuthContext } from "./AuthProvider";

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("shows loading state initially then resolves with session", async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: "user-1", email: "admin@test.com" },
          access_token: "token",
        },
      },
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

  it("subscribes to auth state changes and cleans up", () => {
    const unsubscribe = vi.fn();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe } },
    });

    const { unmount } = renderWithProviders(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>,
    );

    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
