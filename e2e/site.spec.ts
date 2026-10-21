import { expect, test, type Page } from "@playwright/test";
import { sql, testEmail, testIp } from "./testdb";

/** Fail a test on any uncaught page error or console error. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|tile\.openstreetmap|ERR_/i.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

test.describe("every page renders cleanly", () => {
  const pages = [
    ["/", /Homes that face/],
    ["/projects", /^Projects$/],
    ["/projects/ocean-view-residences", /Ocean View Residences/],
    ["/projects/kandy-hill-villas", /Kandy Hill Villas/],
    ["/projects/ocean-view-residences/explorer", /Choose your floor/],
    ["/projects/ocean-view-residences/units/A-14B", /3 Bed \+ study, sea view/],
    ["/3d-tours", /Walk through your home/],
    ["/book-a-visit", /See it/],
    ["/contact", /Talk to us/],
    ["/about", /We build homes/],
    ["/news", /News & insights/],
    ["/news/buying-an-apartment-in-sri-lanka-from-abroad", /Buying an apartment/],
    ["/gallery", /Gallery/],
    ["/construction-progress", /On site this month/],
    ["/faq", /Questions buyers ask/],
    ["/calculators", /Plan your purchase/],
    ["/buyers-guide", /From first visit/],
    ["/overseas-buyers", /Buy your home/],
    ["/awards", /Awards & certifications/],
    ["/careers", /Build the homes/],
    ["/careers/senior-site-engineer", /Senior Site Engineer/],
    ["/customer-portal", /Your home, in one place/],
    ["/legal", /Privacy, terms & cookies/],
    ["/credits", /Photo credits/],
    ["/shortlist", /Your shortlist/],
  ] as const;

  for (const [path, heading] of pages) {
    test(`${path}`, async ({ page }) => {
      const errors = watchErrors(page);
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("h1").first()).toHaveText(heading);
      await expect(page).toHaveTitle(/OVDC/);
      // One h1, and every image has alt text (decorative images use alt="").
      // Retrying: while a Suspense boundary streams in, its content waits in a hidden copy next to the fallback.
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("img:not([alt])")).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }

  test("unknown pages return a branded 404", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist");
    expect(res?.status()).toBe(404);
    await expect(page.getByText("This view is")).toBeVisible();
    await page.getByRole("link", { name: "View projects" }).click();
    await expect(page).toHaveURL(/\/projects$/);
  });
});

test.describe("navigation & preferences", () => {
  test("mega menu lists projects and navigates", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Projects" }).hover();
    const menu = page.locator("a", { hasText: "The Marine Crest" }).first();
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(page).toHaveURL(/\/projects\/the-marine-crest$/);
    await expect(page.getByRole("heading", { level: 1, name: "The Marine Crest" })).toBeVisible();
  });

  test("saved preferences hydrate without a mismatch", async ({ page }) => {
    // A returning visitor who picked USD but has not answered the cookie banner yet.
    await page.addInitScript(() => {
      localStorage.setItem("ovdc.currency", "USD");
      localStorage.removeItem("ovdc.cookies");
    });
    const errors = watchErrors(page);
    for (const path of ["/", "/projects/ocean-view-residences"]) {
      await page.goto(path);
      await expect(page.getByRole("region", { name: "Cookie consent" })).toBeVisible();
      await expect(page.getByText(/USD [\d.,]+/).first()).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test("currency switch converts prices and persists across pages", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByText("LKR 68.5 Mn").first()).toBeVisible();
    await page.getByRole("radio", { name: "USD" }).first().click();
    await expect(page.getByText("USD 228,000").first()).toBeVisible();
    await page.goto("/projects/ocean-view-residences");
    await expect(page.getByText("USD 228,000").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Currency: USD" })).toBeVisible();
  });

  test("breadcrumbs link back up the tree", async ({ page }) => {
    await page.goto("/projects/ocean-view-residences/units/A-14B");
    const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(crumbs.getByRole("link", { name: "Ocean View Residences" })).toBeVisible();
    await expect(crumbs.locator('[aria-current="page"]')).toHaveText("Unit 14B");
    await crumbs.getByRole("link", { name: "Tower A · Floor 14" }).click();
    await expect(page).toHaveURL(/explorer\?tower=A&floor=14/);
  });
});

/** Published projects, optionally in one area: admins add projects, so counts come from the database. */
async function projectCount(loc?: string) {
  if (!sql) return loc ? 1 : 7;
  const [{ n }] = (loc ? await sql`select count(*)::int n from projects where published and loc = ${loc}` : await sql`select count(*)::int n from projects where published`) as { n: number }[];
  return n;
}
const projectsText = (n: number) => new RegExp(`${n}\\s+projects?$`);

test.describe("projects", () => {
  test("filters narrow results and show an empty state", async ({ page }) => {
    const all = await projectCount();
    await page.goto("/projects");
    await expect(page.getByText(projectsText(all))).toBeVisible();
    await page.getByLabel("Location").first().selectOption("Negombo");
    await expect(page.getByText(/1\s+project$/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Lagoon Terraces" })).toBeVisible();
    await page.getByLabel(/Max price/).first().selectOption("50");
    await expect(page.getByText("No projects match these filters")).toBeVisible();
    await page.getByRole("button", { name: /Clear filters/ }).click();
    await expect(page.getByText(projectsText(all))).toBeVisible();
  });

  test("home search carries filters to the listing", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Location").selectOption("Kandy");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/projects\?loc=Kandy/);
    await expect(page.getByRole("heading", { name: "Kandy Hill Villas" })).toBeVisible();
    await expect(page.getByText(projectsText(await projectCount("Kandy")))).toBeVisible();
  });

  test("map view shows pins and a project card", async ({ page }) => {
    await page.goto("/projects?view=map");
    await expect(page.locator(".leaflet-container")).toBeVisible();
    await expect(page.locator(".leaflet-marker-icon > div").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "View project →" })).toBeVisible();
  });
});

test.describe("project detail", () => {
  test("unit types switch the floor plan", async ({ page }) => {
    await page.goto("/projects/ocean-view-residences");
    await page.getByRole("button", { name: "Type D" }).click();
    await expect(page.getByText("Type D · 4 Bed").first()).toBeVisible();
    await expect(page.getByRole("img", { name: /Type D · 4 Bed floor plan/ })).toBeVisible();
  });

  test("brochure form validates, then submits a lead", async ({ page }) => {
    // Leads are stored: use a test identity (removed after the run) and a test client IP (own throttle bucket).
    await page.setExtraHTTPHeaders({ "x-real-ip": testIp() });
    await page.goto("/projects/ocean-view-residences");
    const form = page.locator('[data-sec="brochure"]');
    await form.getByRole("button", { name: /Get the brochure/ }).click();
    await expect(form.getByText("Please enter your name")).toBeVisible();
    await form.getByLabel("Full name").fill("E2E Test Buyer");
    await form.getByLabel("Mobile").fill("+94 77 123 4567");
    await form.getByLabel("Email").fill(testEmail("buyer"));
    const lead = page.waitForResponse((r) => r.url().endsWith("/api/leads") && r.request().method() === "POST");
    await form.getByRole("button", { name: /Get the brochure/ }).click();
    expect((await lead).status()).toBe(201);
    await expect(form.getByText("Request received")).toBeVisible();
  });

  test("specification accordion opens one item at a time", async ({ page }) => {
    await page.goto("/projects/ocean-view-residences");
    const bathroom = page.getByRole("button", { name: "Bathroom" });
    await bathroom.click();
    await expect(bathroom).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("button", { name: "Structure" })).toHaveAttribute("aria-expanded", "false");
  });
});

test.describe("building explorer", () => {
  test("pick a floor, then a unit, then open its page", async ({ page }) => {
    await page.goto("/projects/ocean-view-residences/explorer");
    await page.getByRole("option", { name: /^14/ }).click();
    await expect(page.getByText("Tower A · Floor 14").first()).toBeVisible();
    await page.getByRole("button", { name: /Unit 14B, 3 Bed \+ study, Available/ }).click();
    await expect(page.getByText("LKR 94.2 Mn").first()).toBeVisible();
    await page.getByRole("link", { name: /View unit details/ }).click();
    await expect(page).toHaveURL(/\/units\/A-14B$/);
  });

  test("filters dim floors without matches and the URL stays shareable", async ({ page }) => {
    await page.goto("/projects/ocean-view-residences/explorer?tower=B&floor=9&type=Type%20D");
    await expect(page.getByRole("radio", { name: "Tower B" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("combobox")).toHaveValue("Type D");
    await page.getByRole("group", { name: "View" }).getByRole("button", { name: "Sea view" }).click();
    await expect(page.getByRole("button", { name: "Clear" })).toBeVisible();
    await expect(page.getByText(/matching homes available in Tower B/)).toBeVisible();
    // the selected floor is scrolled into view in the floor list
    await expect(page.getByRole("option", { name: /^09/ })).toBeInViewport();
  });

  test("fits the screen: no page scroll needed to reach the tower and floor plate", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/projects/ocean-view-residences/explorer");
    await expect(page.getByRole("img", { name: /Tower A elevation/ })).toBeInViewport({ ratio: 0.9 });
    await expect(page.getByRole("group", { name: "Floor plate" })).toBeInViewport();
    await page.getByRole("radio", { name: "Night" }).click();
    await expect(page.getByRole("radio", { name: "Night" })).toHaveAttribute("aria-checked", "true");
  });
});

test.describe("shortlist & compare", () => {
  test("save two units and compare them", async ({ page }) => {
    await page.goto("/projects/ocean-view-residences/units/A-14B");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toContainText("saved to your shortlist");
    await page.goto("/projects/ocean-view-residences/units/A-14C");
    await page.getByRole("button", { name: "Save" }).click();
    await page.getByRole("link", { name: /Shortlist, 2 saved/ }).click();
    await expect(page.getByText("2 units")).toBeVisible();
    for (const cb of await page.getByRole("checkbox").all()) await cb.check();
    await expect(page.getByRole("table")).toContainText("Price / sqft");
    await expect(page.getByRole("table")).toContainText("A-14C");
  });
});

test.describe("lead flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.setExtraHTTPHeaders({ "x-real-ip": testIp() });
  });

  test("book a site visit end to end", async ({ page }) => {
    await page.goto("/book-a-visit?project=ocean-view-residences&unit=A-14B");
    await expect(page.getByText("unit A-14B", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: /Live video tour/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator(".field-error", { hasText: "Choose a date" })).toBeVisible(); // validation message
    await page.getByRole("radio").filter({ hasNot: page.locator("[disabled]") }).first().click();
    await page.getByRole("radio", { name: "11.00 am" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Full name").fill("E2E Nadeesha Perera");
    await page.getByLabel("Mobile / WhatsApp").fill("+61 412 345 678");
    await page.getByLabel(/OVDC may contact me/).check();
    const lead = page.waitForResponse((r) => r.url().endsWith("/api/leads"));
    await page.getByRole("button", { name: /Request this visit/ }).click();
    expect((await lead).status()).toBe(201);
    await expect(page.getByRole("heading", { name: "Your visit is requested." })).toBeVisible();
    await expect(page.getByRole("link", { name: /Add to calendar/ })).toHaveAttribute("href", /^data:text\/calendar/);
  });

  test("contact form", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel("Full name").fill("E2E Test");
    await page.getByLabel("Email").fill(testEmail("contact"));
    await page.getByLabel("Message").fill("Please send the price list for Type C.");
    await page.getByRole("button", { name: /Send message/ }).click();
    await expect(page.getByRole("heading", { name: /Thank you, E2E/ })).toBeVisible();
  });

  test("lead API rejects bad input", async ({ request }) => {
    const headers = { "x-real-ip": testIp() };
    expect((await request.post("/api/leads", { headers, data: { kind: "nope" } })).status()).toBe(400);
    expect((await request.post("/api/leads", { headers, data: { kind: "enquiry", name: "x" } })).status()).toBe(422);
    expect((await request.post("/api/leads", { headers, data: { kind: "newsletter", email: "bad" } })).status()).toBe(422);
    expect((await request.post("/api/leads", { headers, data: { kind: "newsletter", email: testEmail("news") } })).status()).toBe(201);
  });
});

test.describe("tools", () => {
  test("loan calculator updates the instalment", async ({ page }) => {
    await page.goto("/calculators?price=100");
    const emi = page.locator('[aria-live="polite"]').first();
    const before = await emi.textContent();
    await page.getByLabel("Tenure").fill("10");
    await expect(emi).not.toHaveText(before ?? "");
    await expect(emi).toContainText("LKR");
  });

  test("FAQ search filters questions", async ({ page }) => {
    await page.goto("/faq");
    await page.getByPlaceholder(/Search/).fill("deed");
    await expect(page.getByRole("button", { name: "When do I get the deed?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "How do I reserve a home?" })).toHaveCount(0);
  });

  test("gallery lightbox opens, steps and closes", async ({ page }) => {
    await page.goto("/gallery");
    await page.getByRole("button", { name: /Open photo/ }).first().click();
    const dialog = page.getByRole("dialog", { name: "Photo viewer" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("1 /");
    await page.keyboard.press("ArrowRight");
    await expect(dialog).toContainText("2 /");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});

test.describe("360° tour", () => {
  test("loads the panorama and moves between rooms", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/tours/ovr-type-c");
    await expect(page.locator("canvas")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("status").filter({ hasText: "Preparing" })).toBeHidden({ timeout: 20_000 });
    await expect(page.getByText("Living Room").first()).toBeVisible();
    await page.getByRole("button", { name: "Go to Kitchen & Dining" }).last().click();
    await expect(page.getByText("02 / 05")).toBeVisible();
    await page.getByRole("button", { name: "Night", exact: true }).click();
    await expect(page.getByRole("button", { name: "Night", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page).not.toHaveURL(/\/tours\//);
    expect(errors).toEqual([]);
  });
});
