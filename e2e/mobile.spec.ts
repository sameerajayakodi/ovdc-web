import { expect, test } from "@playwright/test";

const PAGES = [
  "/",
  "/projects",
  "/projects/ocean-view-residences",
  "/projects/ocean-view-residences/explorer",
  "/projects/ocean-view-residences/units/A-14B",
  "/3d-tours",
  "/book-a-visit",
  "/contact",
  "/about",
  "/news",
  "/news/ocean-view-residences-17th-floor",
  "/gallery",
  "/construction-progress",
  "/faq",
  "/calculators",
  "/buyers-guide",
  "/overseas-buyers",
  "/careers",
  "/customer-portal",
  "/legal",
];

test.describe("phone layout", () => {
  for (const path of PAGES) {
    test(`no horizontal scroll on ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test("menu drawer opens, shows projects and navigates", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /Menu/ }).click();
    const drawer = page.getByRole("dialog", { name: "Menu" });
    await expect(drawer).toBeVisible();
    await drawer.getByRole("link", { name: /Ocean View Residences/ }).click();
    await expect(page).toHaveURL(/\/projects\/ocean-view-residences$/);
    await expect(drawer).toBeHidden();
  });

  test("breadcrumbs collapse to a back link", async ({ page }) => {
    await page.goto("/projects/ocean-view-residences/units/A-14B");
    const back = page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Tower A · Floor 14" });
    await expect(back).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("list")).toBeHidden();
  });

  test("project page has the sticky call / WhatsApp / enquire bar", async ({ page }) => {
    await page.goto("/projects/ocean-view-residences");
    await expect(page.getByRole("link", { name: "Enquire", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Chat with sales on WhatsApp" })).toBeHidden();
  });

  test("explorer opens the floor sheet when a floor is picked", async ({ page }) => {
    await page.goto("/projects/ocean-view-residences/explorer");
    await page.getByRole("option", { name: /^14/ }).click();
    await expect(page.getByRole("button", { name: "Close floor plan" })).toBeVisible();
    await page.getByRole("button", { name: /Unit 14B/ }).click();
    await expect(page.getByRole("link", { name: /View unit details/ })).toBeVisible();
  });
});
