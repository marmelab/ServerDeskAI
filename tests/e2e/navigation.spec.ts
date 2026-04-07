import { test, expect } from "@playwright/test";

test.describe("Navigation and routing", () => {
  test("app loads with correct title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ServerDesk/);
  });

  test("login page is accessible", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("signup page is accessible", async ({ page }) => {
    await page.goto("/signup");
    await expect(
      page.getByRole("heading", { name: /create.*account/i }),
    ).toBeVisible();
  });

  test("login form shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("nonexistent@test.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should show an error message (Supabase will return invalid credentials)
    await expect(
      page.getByText(/invalid|error|failed/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test("signup form validates required fields", async ({ page }) => {
    await page.goto("/signup");

    // Try to submit with only email filled (missing name and password)
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByRole("button", { name: /create account/i }).click();

    // Should show validation errors for missing fields
    await expect(page.getByText(/name is required/i)).toBeVisible();
  });
});
