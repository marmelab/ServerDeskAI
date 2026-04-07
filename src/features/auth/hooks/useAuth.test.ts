import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuth } from "./useAuth";

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();

vi.mock("../services/auth", () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
  signUp: (...args: unknown[]) => mockSignUp(...args),
  signOut: () => mockSignOut(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signIn", () => {
    it("calls signIn with email and password", async () => {
      mockSignIn.mockResolvedValue(undefined);
      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password123");

      expect(mockSignIn).toHaveBeenCalledWith(
        "test@example.com",
        "password123",
      );
    });

    it("throws on service error", async () => {
      mockSignIn.mockRejectedValue(new Error("Invalid credentials"));
      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.signIn("bad@example.com", "wrong"),
      ).rejects.toThrow("Invalid credentials");
    });
  });

  describe("signUp", () => {
    it("calls signUp with email, password, and name", async () => {
      mockSignUp.mockResolvedValue(undefined);
      const { result } = renderHook(() => useAuth());

      await result.current.signUp("test@example.com", "password123", "Test User");

      expect(mockSignUp).toHaveBeenCalledWith(
        "test@example.com",
        "password123",
        "Test User",
      );
    });

    it("includes invite_token when provided", async () => {
      mockSignUp.mockResolvedValue(undefined);
      const { result } = renderHook(() => useAuth());

      await result.current.signUp(
        "test@example.com",
        "password123",
        "Test User",
        "abc-invite-token",
      );

      expect(mockSignUp).toHaveBeenCalledWith(
        "test@example.com",
        "password123",
        "Test User",
        "abc-invite-token",
      );
    });

    it("throws on service error", async () => {
      mockSignUp.mockRejectedValue(new Error("Email already registered"));
      const { result } = renderHook(() => useAuth());

      await expect(
        result.current.signUp("taken@example.com", "password123", "Name"),
      ).rejects.toThrow("Email already registered");
    });
  });

  describe("signOut", () => {
    it("calls signOut", async () => {
      mockSignOut.mockResolvedValue(undefined);
      const { result } = renderHook(() => useAuth());

      await result.current.signOut();

      expect(mockSignOut).toHaveBeenCalled();
    });

    it("throws on service error", async () => {
      mockSignOut.mockRejectedValue(new Error("Network error"));
      const { result } = renderHook(() => useAuth());

      await expect(result.current.signOut()).rejects.toThrow("Network error");
    });
  });
});
