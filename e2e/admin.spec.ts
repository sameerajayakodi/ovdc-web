import { expect, test, type Page } from "@playwright/test";

/**
 * Admin console. Signs in with ADMIN_USERNAME / ADMIN_PASSWORD from .env.local,
 * so the credentials never live in the test file. One test changes a unit's
 * status on the shared database and always puts it back.
 */
try {
  process.loadEnvFile(".env.local");
} catch {}

const USER = process.env.ADMIN_USERNAME ?? "";
const PASS = process.env.ADMIN_PASSWORD ?? "";
const SHOTS = "test-results/admin";

test.skip(!USER || !PASS || !process.env.DATABASE_URL, "Admin credentials or DATABASE_URL not configured");

async function signIn(page: Page, next = "/admin") {
  await page.goto(next);
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Username").fill(USER);
  await page.getByLabel("Password", { exact: true }).fill(PASS);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/admin/login"));
}

test.describe("admin auth", () => {
  test("signed-out visitors are sent to the login page", async ({ page }) => {
    const res = await page.goto("/admin/units");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Funits/);
    expect(res?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await page.screenshot({ path: `${SHOTS}/login.png` });
  });

  test("wrong password is rejected", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Username").fill(USER);
    await page.getByLabel("Password", { exact: true }).fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("#lg-err")).toContainText("incorrect");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("a forged session cookie is ignored", async ({ page, context }) => {
    await context.addCookies([{ name: "ovdc_admin", value: "eyJ1IjoiYWRtaW4iLCJleHAiOjk5OTk5OTk5OTl9.forged", url: "http://localhost:3100" }]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("sign in, return to the requested page, sign out", async ({ page }) => {
    await signIn(page, "/admin/projects");
    await expect(page).toHaveURL(/\/admin\/projects$/);
    await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

test.describe("admin console", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("dashboard shows live inventory", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Good (morning|afternoon|evening)/);
    await expect(page.getByText(/Units · \d+/)).toBeVisible();
    await expect(page.getByText("Availability by tower")).toBeVisible();
    await expect(page.getByText("Ocean View Residences · Tower A")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/dashboard.png`, fullPage: true });
  });

  test("units grid, filters and table", async ({ page }) => {
    await page.getByRole("link", { name: "Units", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Units", level: 1 })).toBeVisible();
    await expect(page.getByRole("gridcell", { name: /^Unit 14B,/ })).toBeVisible();
    await page.getByRole("button", { name: /Available \d+/ }).click();
    await page.getByRole("gridcell", { name: /^Unit 14B,/ }).click();
    await expect(page.getByText("Unit 14B", { exact: true })).toBeVisible();
    await expect(page.getByText("Price history")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/units.png`, fullPage: true });

    await page.getByRole("button", { name: "Table" }).click();
    await expect(page.locator("table:visible")).toContainText("14B");
    await page.getByRole("button", { name: "Select floor 14" }).waitFor({ state: "detached" });
    await page.getByRole("button", { name: "Floor grid" }).click();
    await page.getByRole("button", { name: "Select floor 14" }).click();
    await expect(page.getByText("Bulk edit")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/units-bulk.png` });
  });

  test("quick search jumps to a unit", async ({ page }) => {
    await page.getByLabel("Search units or projects").fill("A-14C");
    await page.getByLabel("Search units or projects").press("Enter");
    await expect(page).toHaveURL(/\/admin\/units\?unit=A-14C/);
    await expect(page.getByText("Unit 14C", { exact: true })).toBeVisible();
  });

  test("a status change goes live on the website, then is reverted", async ({ page, browser }) => {
    const ref = "B-5A";
    await page.goto(`/admin/units?unit=${ref}`);
    const pill = page.getByRole("complementary", { name: "Unit details" }).getByText(/^[ARSB] · (Available|Reserved|Sold|Not released)$/);
    const original = (await pill.textContent())!.trim()[0] as "A" | "R" | "S" | "B";
    const target = original === "A" ? "Reserved" : "Available";
    const back = { A: "Available", R: "Reserved", S: "Sold", B: "Not released" }[original];

    try {
      await page.getByRole("complementary", { name: "Unit details" }).getByRole("button", { name: target }).click();
      if (await page.getByRole("alertdialog").isVisible().catch(() => false)) await page.getByRole("button", { name: "Apply" }).click();
      await expect(page.getByText(`Unit ${ref} updated`)).toBeVisible();
      await expect(pill).toHaveText(new RegExp(`· ${target}$`));

      const site = await browser.newPage();
      await site.goto(`/projects/ocean-view-residences/units/${ref}`);
      await expect(site.getByRole("link", { name: target === "Reserved" ? "Join the waiting list" : "Book a site visit" }).first()).toBeVisible();
      await site.close();
    } finally {
      await page.getByRole("complementary", { name: "Unit details" }).getByRole("button", { name: back }).click();
      if (await page.getByRole("alertdialog").isVisible().catch(() => false)) await page.getByRole("button", { name: "Apply" }).click();
      await expect(pill).toHaveText(new RegExp(`· ${back}$`));
    }
  });

  test("projects list and editor", async ({ page }) => {
    await page.getByRole("link", { name: "Projects", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ocean View Residences", exact: true })).toBeVisible();
    await page.getByLabel("Search projects").fill("kandy");
    await expect(page.locator("tbody:visible tr")).toHaveCount(1);
    await page.screenshot({ path: `${SHOTS}/projects.png` });

    await page.getByRole("link", { name: "Kandy Hill Villas", exact: true }).click();
    await expect(page.getByLabel("Project name")).toHaveValue("Kandy Hill Villas");
    await page.screenshot({ path: `${SHOTS}/project-editor.png`, fullPage: true });
    await page.getByRole("button", { name: "Save changes" }).first().click();
    await expect(page.getByText("No changes to save")).toBeVisible();

    await page.getByLabel("Project name").fill("");
    await page.getByRole("button", { name: "Save changes" }).first().click();
    await expect(page.getByText("Enter the project name.")).toBeVisible();
  });

  test("new project form validates", async ({ page }) => {
    await page.goto("/admin/projects/new");
    await page.getByRole("button", { name: "Create project" }).first().click();
    await expect(page.getByText("Enter the project name.")).toBeVisible();
    await expect(page.getByText("Enter the area, e.g. Mount Lavinia.")).toBeVisible();
  });

  test("activity log lists changes", async ({ page }) => {
    await page.getByRole("link", { name: "Activity log" }).first().click();
    await expect(page.getByRole("heading", { name: "Activity log" })).toBeVisible();
    await expect(page.locator("ol li").first()).toBeVisible();
  });

  test("works on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/units");
    await page.getByRole("button", { name: "Toggle navigation" }).click();
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/mobile-nav.png` });
    await page.getByRole("link", { name: "Dashboard" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Good/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `${SHOTS}/mobile-dashboard.png`, fullPage: true });
  });
});
