import { test, expect } from "@playwright/test";

test.describe("Invite agent flow", () => {
  test.beforeEach(async ({ page }) => {
    // Log in as admin
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@serverdesk.local");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Wait for redirect to authenticated area
    await page.waitForURL("**/");
    await expect(page.getByText("admin@serverdesk.local")).toBeVisible({
      timeout: 10000,
    });
  });

  test("admin can navigate to agents page", async ({ page }) => {
    await page.getByRole("link", { name: "Agents" }).click();
    await page.waitForURL("**/agents");
    await expect(
      page.getByRole("heading", { name: /agents/i }),
    ).toBeVisible();
  });

  test("admin can open invite agent dialog and generate invite link", async ({
    page,
  }) => {
    await page.getByRole("link", { name: "Agents" }).click();
    await page.waitForURL("**/agents");

    // Open invite dialog
    await page.getByRole("button", { name: /invite agent/i }).click();
    await expect(
      page.getByRole("heading", { name: /invite agent/i }),
    ).toBeVisible();

    // Fill in email
    await page.getByLabel("Email address").fill("newagent@example.com");

    // Submit the form
    await page.getByRole("button", { name: /generate invite link/i }).click();

    // Should show the invite link (proves gen_random_bytes works)
    await expect(page.getByText(/share this link/i)).toBeVisible({
      timeout: 10000,
    });
    const linkInput = page.getByRole("textbox");
    await expect(linkInput).toHaveValue(/\/signup\/.+/);
  });

  test("generated invite link leads to a valid signup page", async ({
    page,
  }) => {
    await page.getByRole("link", { name: "Agents" }).click();
    await page.waitForURL("**/agents");

    // Create an invite
    await page.getByRole("button", { name: /invite agent/i }).click();
    await page.getByLabel("Email address").fill("agenttest@example.com");
    await page.getByRole("button", { name: /generate invite link/i }).click();

    await expect(page.getByText(/share this link/i)).toBeVisible({
      timeout: 10000,
    });

    // Extract the invite link
    const linkInput = page.getByRole("textbox");
    const inviteLink = await linkInput.inputValue();

    // Sign out first
    await page.getByRole("button", { name: /done/i }).click();
    await page.getByRole("button", { name: /sign out/i }).click();
    await page.waitForURL("**/login");

    // Navigate to the invite link
    const url = new URL(inviteLink);
    await page.goto(url.pathname);

    // Should show the signup form with email pre-filled
    await expect(page.getByLabel("Email")).toHaveValue("agenttest@example.com", {
      timeout: 10000,
    });
    await expect(page.getByLabel("Email")).toHaveAttribute("readonly", "");
  });

  test("invite shows error in dialog on failure", async ({ page }) => {
    await page.getByRole("link", { name: "Agents" }).click();
    await page.waitForURL("**/agents");

    // Open dialog but submit with empty email should show validation error
    await page.getByRole("button", { name: /invite agent/i }).click();
    await page.getByRole("button", { name: /generate invite link/i }).click();

    await expect(
      page.getByText(/valid email/i),
    ).toBeVisible();
  });
});
