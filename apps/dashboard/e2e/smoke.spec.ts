import { expect, test } from "@playwright/test";

test.skip(
  process.env.E2E_ENABLE_SMOKE !== "1",
  "Set E2E_ENABLE_SMOKE=1 with valid Clerk/Supabase env and authenticated state to run smoke flows."
);

async function skipIfUnauthenticated(page: import("@playwright/test").Page) {
  await page.goto("/");
  const bodyText = await page.locator("body").innerText();
  if (/publishablekey passed to clerk is invalid/i.test(bodyText)) {
    test.skip(
      true,
      "Smoke flows require a valid Clerk publishable key in the test environment."
    );
  }
  if (page.url().includes("/sign-in")) {
    test.skip(
      true,
      "Smoke flows require an authenticated browser context. Set PLAYWRIGHT_STORAGE_STATE to a signed-in session file."
    );
  }
}

test.beforeEach(async ({ page }) => {
  await skipIfUnauthenticated(page);
});

test("@smoke dashboard loads", async ({ page }) => {
  await expect(
    page.getByRole("heading", { name: "Dashboard", level: 1 })
  ).toBeVisible();
  await expect(page.getByText("Total Invoices")).toBeVisible();
});

test("@smoke invoices table navigates to review", async ({ page }) => {
  await page.goto("/invoices");
  await expect(
    page.getByRole("heading", { name: "All Invoices", level: 1 })
  ).toBeVisible();

  const firstInvoiceLink = page.locator("a[href^='/invoices/']").first();
  if ((await firstInvoiceLink.count()) === 0) {
    test.skip(true, "Requires at least one invoice row in the test environment.");
  }

  await firstInvoiceLink.click();
  await expect(page).toHaveURL(/\/invoices\/.+/);
  await expect(page.getByText("Line Items")).toBeVisible();
});

test("@smoke invoice review actions are available", async ({ page }) => {
  await page.goto("/invoices");

  const firstInvoiceLink = page.locator("a[href^='/invoices/']").first();
  if ((await firstInvoiceLink.count()) === 0) {
    test.skip(true, "Requires at least one invoice row in the test environment.");
  }

  await firstInvoiceLink.click();
  await expect(page).toHaveURL(/\/invoices\/.+/);
  await expect(
    page.getByRole("button", { name: /approve|retry processing|check duplicate/i })
  ).toBeVisible();
});

