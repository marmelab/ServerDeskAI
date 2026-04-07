import { test, expect } from "@playwright/test";

test.describe("Authentication flows", () => {
  test("shows login page with form fields", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText(/sign in to serverdesk/i)).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("shows validation errors on empty login submit", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: /sign in/i }).click();

    // Form validation should prevent submission with empty fields
    await expect(page.getByLabel("Email")).toBeFocused();
  });

  test("shows signup page for first admin", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.getByText(/create admin account/i)).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Name")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });

  test("shows invite signup page with token", async ({ page }) => {
    await page.goto("/signup/test-token-123");

    // Should show validating state initially
    await expect(
      page.getByText(/validating invite/i).or(
        page.getByText(/invalid|expired/i),
      ),
    ).toBeVisible();
  });

  test("redirects unauthenticated user to login", async ({ page }) => {
    await page.goto("/");

    // ProtectedRoute should redirect to /login
    await page.waitForURL("**/login");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects unauthenticated user from /companies to login", async ({
    page,
  }) => {
    await page.goto("/companies");

    await page.waitForURL("**/login");
    await expect(page).toHaveURL(/\/login/);
  });
});
