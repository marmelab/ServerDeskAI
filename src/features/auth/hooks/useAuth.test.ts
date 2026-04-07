import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuth } from "./useAuth";

const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signOut: () => mockSignOut(),
    },
  },
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signIn", () => {
    it("calls supabase signInWithPassword with email and password", async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password123");

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });

    it("throws on supabase error", async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: new Error("Invalid credentials"),
      });
      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.signIn("bad@example.com", "wrong"),
      ).rejects.toThrow("Invalid credentials");
    });
  });

  describe("signUp", () => {
    it("calls supabase signUp with email, password, and name", async () => {
      mockSignUp.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useAuth());

      await result.current.signUp("test@example.com", "password123", "Test User");

      expect(mockSignUp).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
        options: { data: { name: "Test User" } },
      });
    });

    it("includes invite_token in metadata when provided", async () => {
      mockSignUp.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useAuth());

      await result.current.signUp(
        "test@example.com",
        "password123",
        "Test User",
        "abc-invite-token",
      );

      expect(mockSignUp).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
        options: {
          data: { name: "Test User", invite_token: "abc-invite-token" },
        },
      });
    });

    it("throws on supabase error", async () => {
      mockSignUp.mockResolvedValue({
        error: new Error("Email already registered"),
      });
      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.signUp("taken@example.com", "password123", "Name"),
      ).rejects.toThrow("Email already registered");
    });
  });

  describe("signOut", () => {
    it("calls supabase signOut", async () => {
      mockSignOut.mockResolvedValue({ error: null });
      const { result } = renderHook(() => useAuth());

      await result.current.signOut();

      expect(mockSignOut).toHaveBeenCalled();
    });

    it("throws on supabase error", async () => {
      mockSignOut.mockResolvedValue({
        error: new Error("Network error"),
      });
      const { result } = renderHook(() => useAuth());

      await expect(result.current.signOut()).rejects.toThrow("Network error");
    });
  });
});
