import { expect, test, type Page } from "@playwright/test";
import { png } from "./files";
import { sql, tag } from "./testdb";

/**
 * Media library, floor plans and 360° tours. Uploads go to the real Cloudinary
 * account; every test file is named "e2e-…" and every test layout or tour
 * starts with "E2E ", and global-cleanup.ts deletes them.
 */
const USER = process.env.ADMIN_USERNAME ?? "";
const PASS = process.env.ADMIN_PASSWORD ?? "";
const SHOTS = "test-results/admin";

test.skip(!USER || !PASS || !sql || !process.env.CLOUDINARY_API_SECRET, "Admin, database or Cloudinary credentials not configured");

async function signIn(page: Page, next = "/admin") {
  await page.goto(next);
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Username").fill(USER);
  await page.getByLabel("Password", { exact: true }).fill(PASS);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/admin/login"));
}

test.describe("media library", () => {
  test("upload, describe, filter, move and delete files", async ({ page }) => {
    test.setTimeout(120_000);
    const t = tag();
    await signIn(page, "/admin/media?folder=ocean-view-residences");
    await expect(page.getByRole("heading", { name: "Media library", level: 1 })).toBeVisible();

    await page.getByLabel(/^Upload files to /).setInputFiles([
      { name: `e2e-photo-${t}.png`, mimeType: "image/png", buffer: png(640, 480, 1) },
      { name: `e2e-pano-${t}.png`, mimeType: "image/png", buffer: png(4000, 2000, 2) },
    ]);
    await expect(page.getByText(`e2e-photo-${t}.png uploaded`)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(`e2e-pano-${t}.png uploaded`)).toBeVisible({ timeout: 60_000 });

    const photo = page.getByRole("button", { name: `e2e-photo-${t}.png` });
    const pano = page.getByRole("button", { name: `e2e-pano-${t}.png` });
    await expect(photo).toBeVisible();
    await expect(photo.getByText("No alt text")).toBeVisible();
    await expect(pano.getByText("360°")).toBeVisible();

    await photo.click();
    const detail = page.getByRole("complementary", { name: "File details" });
    await expect(detail).toContainText("640 × 480");
    await expect(detail.getByText(/smaller for visitors|Already optimised/)).toBeVisible({ timeout: 20_000 });
    await detail.getByLabel(/Alt text/).fill("E2E test gradient");
    await detail.getByLabel(/Alt text/).blur();
    await expect(page.getByText("Alt text saved")).toBeVisible();
    await expect(photo.getByText("No alt text")).toBeHidden();
    await page.screenshot({ path: `${SHOTS}/media.png` });

    await page.getByRole("button", { name: "360°", exact: true }).click();
    await expect(pano).toBeVisible();
    await expect(photo).toBeHidden();
    await page.getByRole("button", { name: "All", exact: true }).click();

    await page.getByRole("checkbox", { name: `Select e2e-photo-${t}.png` }).click();
    await page.getByLabel("Move selected to folder").selectOption("web");
    await expect(page.getByText("1 file moved")).toBeVisible();
    await expect(photo).toBeHidden();
    await page.getByRole("button", { name: /^Website & blog/ }).click();
    await expect(photo).toBeVisible();

    await photo.click();
    await detail.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("1 file deleted")).toBeVisible();
    await expect(photo).toBeHidden();
    const [{ n }] = (await sql!`select count(*)::int n from media where name = ${`e2e-photo-${t}.png`}`) as { n: number }[];
    expect(n).toBe(0);
  });
});

test.describe("floor plans", () => {
  test("create a layout with rooms, upload its drawing, see it on the website, delete it", async ({ page, browser }) => {
    test.setTimeout(120_000);
    const t = tag();
    const type = `E2E Type ${t}`;
    // A project without unit inventory, so no live unit pages change.
    await signIn(page, "/admin/floor-plans?project=battaramulla-park");
    await expect(page.getByRole("heading", { name: "Floor plans", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "New layout" }).first().click();
    await page.getByLabel("Unit type").fill(type);
    await page.getByLabel("Short code").fill("Z9");
    await page.getByLabel("Bedrooms").fill("2 Bed");
    await page.getByLabel("Interior (sqft)").fill("1250");
    await page.getByLabel("Balcony (sqft)").fill("120");
    await page.getByLabel("Room 1 name").fill("Living & dining");
    await page.getByLabel("Width of Living & dining").fill("6.2");
    await page.getByLabel("Length of Living & dining").fill("4.5");
    await page.getByLabel("Length of Living & dining").blur();
    await page.getByRole("button", { name: "Add room" }).click();
    await page.getByLabel("Room 2 name").fill("Bedroom");
    await page.getByLabel("Width of Bedroom").fill("4");
    await page.getByLabel("Length of Bedroom").fill("3.5");
    await page.getByLabel("Length of Bedroom").blur();
    await expect(page.getByRole("cell", { name: "27.9 m²" })).toBeVisible();
    await page.getByRole("button", { name: "Create layout" }).click();
    await expect(page.getByText(`${type} · 2 Bed added`)).toBeVisible();

    // Feet view converts, the database keeps metres.
    await page.getByRole("button", { name: "Feet" }).click();
    await expect(page.getByLabel("Width of Bedroom")).toHaveValue("13.1");
    await page.getByRole("button", { name: "Metres" }).click();

    // Enabled once the new layout is back from the server.
    await expect(page.getByLabel("Upload floor plan")).toBeEnabled();
    await page.getByLabel("Upload floor plan").setInputFiles({ name: `e2e-plan-${t}.png`, mimeType: "image/png", buffer: png(800, 600, 3) });
    await expect(page.getByText("Floor plan updated · live on the website")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Uploaded drawing", { exact: true })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/floor-plans.png`, fullPage: true });

    const site = await browser.newPage();
    await site.goto("/projects/battaramulla-park");
    const plans = site.locator('[data-sec="plans"]');
    await expect(plans.getByRole("button", { name: type })).toBeVisible();
    await expect(plans.getByRole("img", { name: `${type} · 2 Bed floor plan` })).toHaveAttribute("src", /res\.cloudinary\.com/);
    await expect(plans.getByText("6.2 × 4.5 m")).toBeVisible();
    await site.close();

    await page.getByRole("button", { name: "Delete layout" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete layout" }).click();
    await expect(page.getByText(`${type} · 2 Bed deleted`)).toBeVisible();
    const left = (await sql!`select count(*)::int n from floor_plans where type = ${type}`) as { n: number }[];
    expect(left[0].n).toBe(0);
  });
});

test.describe("360° tours", () => {
  test("build a tour: panoramas, hotspots, starting view, publish, embed, delete", async ({ page, browser }) => {
    test.setTimeout(180_000);
    const t = tag();
    const title = `E2E Tour ${t}`;
    await signIn(page, "/admin/tours");
    await expect(page.getByRole("heading", { name: "360° Tours", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Edit Three-bedroom sea-view residence/ })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/tours.png` });

    await page.getByRole("button", { name: "New tour" }).click();
    const dialog = page.getByRole("dialog", { name: "New 360° tour" });
    await dialog.getByLabel("Project").selectOption("battaramulla-park");
    await dialog.getByLabel("Title").fill(title);
    await dialog.getByRole("button", { name: "Create tour" }).click();
    await page.waitForURL(/\/admin\/tours\/bp-/);
    const id = new URL(page.url()).pathname.split("/").pop()!;
    await expect(page.getByText("Add the first panorama")).toBeVisible();

    await page.getByLabel("Add panoramas").setInputFiles([
      { name: `e2e-living-${t}.png`, mimeType: "image/png", buffer: png(4000, 2000, 4) },
      { name: `e2e-kitchen-${t}.png`, mimeType: "image/png", buffer: png(4000, 2000, 5) },
      { name: `e2e-wrong-${t}.png`, mimeType: "image/png", buffer: png(3000, 2000, 6) },
    ]);
    const scenes = page.getByRole("complementary", { name: "Scenes" });
    await expect(scenes.getByText(/must be equirectangular, exactly 2:1/)).toBeVisible({ timeout: 90_000 });
    await expect(scenes.getByRole("listitem")).toHaveCount(2);
    await scenes.getByRole("button", { name: /^E2e Living/ }).click();

    const canvas = page.getByRole("application");
    const box = (await canvas.boundingBox())!;
    // The unwrapped panorama runs yaw 0° (left edge) → 360°: x = 75 % is 270°, kept as -90°; y = 55 % is pitch -9°.
    await page.getByRole("button", { name: "Room link" }).click();
    await canvas.click({ position: { x: box.width * 0.75, y: box.height * 0.55 } });
    const inspector = page.getByRole("complementary", { name: "Inspector" });
    await expect(inspector.getByLabel("Go to scene")).toHaveValue(/^e2e-kitchen/);
    await expect(inspector.getByLabel("Yaw °")).toHaveValue("-90");
    await expect(inspector.getByLabel("Pitch °")).toHaveValue("-9");

    await page.getByRole("button", { name: "Info point" }).first().click();
    await canvas.click({ position: { x: box.width * 0.25, y: box.height * 0.7 } });
    await inspector.getByLabel("Title", { exact: true }).fill("Engineered oak flooring");
    await inspector.getByLabel("Text", { exact: true }).fill("Wide-plank oak across living and dining.");
    await expect(canvas.getByRole("button", { name: "Info: Engineered oak flooring" })).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Set starting view" }).click();
    await canvas.click({ position: { x: box.width * 0.25, y: box.height * 0.5 } });
    await expect(page.getByText(/Starting view set for E2e Living/)).toBeVisible();
    await expect(inspector.getByLabel("Starting view (yaw °)")).toHaveValue("90");
    await inspector.getByLabel("Room name").fill("Living Room");
    await page.screenshot({ path: `${SHOTS}/tour-editor.png` });

    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved as draft")).toBeVisible();
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText(`${title} is live on the website`)).toBeVisible();
    const rows = (await sql!`select key, hotspots, yaw from tour_scenes where tour_id = ${id} order by sort`) as { key: string; hotspots: { t: string; to?: string; yaw: number; pitch: number }[]; yaw: number }[];
    expect(rows).toHaveLength(2);
    expect(rows[0].hotspots.find((h) => h.t === "nav")).toMatchObject({ to: rows[1].key, yaw: -90, pitch: -9 });
    expect(rows[0].yaw).toBe(90);
    expect(rows[0].hotspots.some((h) => h.t === "info")).toBe(true);

    await page.getByRole("button", { name: "Preview" }).click();
    await expect(page.getByRole("dialog", { name: "Tour preview" })).toBeVisible();
    await page.getByRole("button", { name: "Close preview" }).click();

    const site = await browser.newPage();
    await site.goto(`/tours/${id}`);
    await expect(site.getByRole("heading", { name: new RegExp(`${title}, Battaramulla Park`) })).toBeAttached();
    await site.close();

    // Switch to a Kuula embed
    await page.getByRole("button", { name: "Matterport / Kuula" }).click();
    await page.getByLabel("Tour URL").fill("https://example.com/tour");
    await expect(page.getByText(/Paste a my\.matterport\.com/)).toBeVisible();
    await page.getByLabel("Tour URL").fill("https://kuula.co/share/collection/7Fv1Q");
    await expect(page.getByText(/Kuula tour found/)).toBeVisible();
    await expect(page.locator('iframe[title="Embedded tour preview"]')).toHaveAttribute("src", /kuula\.co\/share/);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Saved · live on the website")).toBeVisible();
    const embed = await browser.newPage();
    await embed.goto(`/tours/${id}`);
    await expect(embed.locator(`iframe[title="${title}, 360° tour"]`)).toHaveAttribute("src", /kuula\.co/);
    await embed.close();

    await page.getByRole("button", { name: "Delete tour" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete tour" }).click();
    await page.waitForURL(/\/admin\/tours$/);
    const left = (await sql!`select count(*)::int n from tours where id = ${id}`) as { n: number }[];
    expect(left[0].n).toBe(0);
  });
});
