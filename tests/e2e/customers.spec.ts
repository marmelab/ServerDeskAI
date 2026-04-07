import { test, expect } from "@playwright/test";

// All tests log in as the seeded customer manager (Diana Patel, assigned to Acme Corp)
test.describe("Customers — customer manager flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("cm@serverdesk.local");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("**/");
    await expect(page.getByText("cm@serverdesk.local")).toBeVisible({
      timeout: 10000,
    });
  });

  test("customer manager can navigate to customers page", async ({ page }) => {
    await page.getByRole("link", { name: /customers/i }).click();
    await page.waitForURL("**/customers");
    await expect(page.getByText("Customers")).toBeVisible();
  });

  test("customers page lists seeded customers for the CM company", async ({ page }) => {
    await page.goto("/customers");
    // Acme Corp has John Smith and Sarah Jones in seed data
    await expect(page.getByText("John Smith")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Sarah Jones")).toBeVisible();
  });

  test("customer manager can create a new customer", async ({ page }) => {
    await page.goto("/customers");
    // Wait for the New Customer button to be enabled (companyId resolved)
    const newBtn = page.getByRole("button", { name: /new customer/i });
    await expect(newBtn).toBeEnabled({ timeout: 10000 });
    await newBtn.click();

    await page.getByLabel("Name").fill("Test Customer");
    await page.getByLabel("Email").fill("testcustomer@acmecorp.com");
    await page.getByRole("button", { name: /create/i }).click();

    // After creation, the new customer appears in the list
    await expect(page.getByText("Test Customer")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("testcustomer@acmecorp.com")).toBeVisible();
  });

  test("customer manager can edit an existing customer", async ({ page }) => {
    await page.goto("/customers");
    await expect(page.getByText("John Smith")).toBeVisible({ timeout: 10000 });

    // Click Edit on the first row
    const editButtons = page.getByRole("button", { name: /edit/i });
    await editButtons.first().click();

    // Form should pre-fill with existing data
    await expect(page.getByLabel("Name")).not.toHaveValue("");

    // Update the name
    await page.getByLabel("Name").fill("John Smith Updated");
    await page.getByRole("button", { name: /save/i }).click();

    // Updated name appears in the list
    await expect(page.getByText("John Smith Updated")).toBeVisible({ timeout: 10000 });
  });

  test("create form shows validation errors for invalid input", async ({ page }) => {
    await page.goto("/customers");
    const newBtn = page.getByRole("button", { name: /new customer/i });
    await expect(newBtn).toBeEnabled({ timeout: 10000 });
    await newBtn.click();

    // Submit without filling anything
    await page.getByRole("button", { name: /create/i }).click();
    await expect(page.getByText(/name is required/i)).toBeVisible();
  });
});

test.describe("Customers — access control", () => {
  test("admin cannot access /customers (role guard)", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("admin@serverdesk.local");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("**/");

    await page.goto("/customers");
    // RoleGuard should redirect or show access denied — not show the customers UI
    await expect(page.getByText("Customers")).not.toBeVisible({ timeout: 5000 });
  });
});
