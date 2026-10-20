import { readFile } from "node:fs/promises";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { leadIdByEmail, sql, tag, testEmail, testIp } from "./testdb";

/**
 * Leads inbox and Site visits. Every lead here is a test row ("E2E …" /
 * @e2e.ovdc.test) that global-cleanup.ts deletes, with its visits and log rows.
 */
const USER = process.env.ADMIN_USERNAME ?? "";
const PASS = process.env.ADMIN_PASSWORD ?? "";
const SHOTS = "test-results/admin";

test.skip(!USER || !PASS || !sql, "Admin credentials or DATABASE_URL not configured");

async function signIn(page: Page, next = "/admin") {
  await page.goto(next);
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Username").fill(USER);
  await page.getByLabel("Password", { exact: true }).fill(PASS);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/admin/login"));
}

/** A website enquiry, posted the way the site's forms post it. */
async function postLead(request: APIRequestContext, data: Record<string, unknown>, ip = testIp()) {
  const res = await request.post("/api/leads", { headers: { "x-real-ip": ip }, data: { kind: "enquiry", page: "/e2e", ...data } });
  expect(res.status(), await res.text()).toBe(201);
  return leadIdByEmail(String(data.email));
}

const mobile = () => `+94 77 ${String(Math.floor(1_000_000 + Math.random() * 8_999_999)).replace(/(\d{3})(\d{4})/, "$1 $2")}`;
/** "YYYY-MM-DD" in Colombo, n days from today. */
const colomboDay = (n: number) => new Date(Date.now() + n * 86_400_000 + 330 * 60_000).toISOString().slice(0, 10);

test.describe("lead intake API", () => {
  test("stores leads, drops honeypot spam and throttles floods", async ({ request }) => {
    const ip = testIp();
    const t = tag();
    const spam = await request.post("/api/leads", {
      headers: { "x-real-ip": ip },
      data: { kind: "enquiry", name: `E2E Spam ${t}`, mobile: mobile(), email: testEmail(`spam-${t}`), website: "https://spam.example" },
    });
    expect(spam.status()).toBe(201);
    expect(await leadIdByEmail(testEmail(`spam-${t}`))).toBeUndefined();

    for (let i = 0; i < 5; i++) await postLead(request, { name: `E2E Flood ${t} ${i}`, mobile: mobile(), email: testEmail(`flood-${t}-${i}`) }, ip);
    const blocked = await request.post("/api/leads", { headers: { "x-real-ip": ip }, data: { kind: "enquiry", name: `E2E Flood ${t} 5`, email: testEmail(`flood-${t}-5`) } });
    expect(blocked.status()).toBe(429);
    expect(blocked.headers()["retry-after"]).toBe("600");
    expect(await leadIdByEmail(testEmail(`flood-${t}-5`))).toBeUndefined();

    // Another sender is not affected.
    await postLead(request, { name: `E2E Other ${t}`, email: testEmail(`other-${t}`) });
  });

  test("a site-visit request with a date and time lands on the calendar", async ({ request }) => {
    const t = tag();
    const date = colomboDay(4);
    const id = await postLead(request, {
      kind: "site-visit",
      name: `E2E Visit Request ${t}`,
      mobile: mobile(),
      email: testEmail(`req-${t}`),
      project: "Ocean View Residences",
      date,
      slot: "11.00 am",
      visitType: "gallery",
    });
    const [lead] = (await sql!`select stage, kind, phone_key from leads where id = ${id}`) as { stage: string; kind: string; phone_key: string }[];
    expect(lead).toMatchObject({ stage: "visit", kind: "site-visit" });
    expect(lead.phone_key).toHaveLength(9);
    const visits = (await sql!`select status, location, starts_at from visits where lead_id = ${id}`) as { status: string; location: string; starts_at: string }[];
    expect(visits).toHaveLength(1);
    expect(visits[0]).toMatchObject({ status: "pending", location: "Colombo 03 sales gallery" });
    expect(new Date(visits[0].starts_at).toISOString()).toBe(new Date(`${date}T11:00:00+05:30`).toISOString());
  });
});

test.describe("leads inbox", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, "/admin/leads");
  });

  test("add a lead, work it through the pipeline and export it", async ({ page }) => {
    const t = tag();
    const name = `E2E Kasun ${t}`;
    await expect(page.getByRole("heading", { name: "Leads", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Add lead" }).click();
    const add = page.getByRole("dialog", { name: "Add lead" });
    await add.getByRole("button", { name: "Add lead" }).click();
    await expect(add.getByText("Enter the lead's name.")).toBeVisible();
    await add.getByLabel("Full name").fill(name);
    await add.getByLabel("Mobile").fill(mobile());
    await add.getByLabel("Email").fill(testEmail(`kasun-${t}`));
    await add.getByLabel("Project").selectOption("Ocean View Residences");
    await add.getByLabel("Budget").fill("LKR 85–95 Mn");
    await add.getByLabel("Note").fill("Walked in at the Colombo 03 gallery.");
    await add.getByRole("button", { name: "Add lead" }).click();
    await expect(page.getByText(`${name} added`)).toBeVisible();

    const drawer = page.getByRole("dialog", { name: `Lead ${name}` });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText("Walked in at the Colombo 03 gallery.")).toBeVisible();
    await expect(page).toHaveURL(/\?lead=\d+/);

    await drawer.getByLabel("Add a note").fill("Wants a sea-facing unit above level 12.");
    await drawer.getByRole("button", { name: "Add note" }).click();
    await expect(page.getByText(`Note added to ${name}`)).toBeVisible();
    await expect(drawer.getByText("Wants a sea-facing unit above level 12.")).toBeVisible();

    await drawer.getByLabel("Stage").selectOption("contacted");
    await expect(page.getByText(`${name} moved to Contacted`)).toBeVisible();
    await drawer.getByLabel("Assigned agent").fill("E2E Agent");
    await drawer.getByLabel("Assigned agent").press("Enter");
    await expect(page.getByText(`${name} assigned to E2E Agent`)).toBeVisible();
    await drawer.getByRole("button", { name: "Tomorrow 10:00" }).click();
    await expect(drawer.getByText("Next: Tomorrow 10:00 AM")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/lead-drawer.png` });
    await drawer.getByRole("button", { name: "Close" }).click();
    await expect(drawer).toBeHidden();

    await page.getByRole("button", { name: "Pipeline" }).click();
    const card = page.getByRole("region", { name: /^Contacted, \d+ leads$/ }).getByRole("button", { name: `Open lead ${name}` });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Tomorrow");
    await page.screenshot({ path: `${SHOTS}/leads-board.png` });

    await page.getByRole("button", { name: "Table" }).click();
    await page.getByLabel("Search leads").fill(t);
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody tr")).toContainText("E2E Agent");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^ovdc-leads-\d{4}-\d{2}-\d{2}\.csv$/);
    const csv = await readFile((await file.path())!, "utf8");
    expect(csv).toContain("created_at,name,mobile");
    expect(csv).toContain(name);

    await page.locator("tbody tr").first().click();
    await drawer.getByLabel("Stage").selectOption("lost");
    await page.getByRole("alertdialog").getByRole("button", { name: "Mark as lost" }).click();
    await expect(drawer.getByLabel("Why was it lost?")).toBeVisible();
    await drawer.getByLabel("Why was it lost?").fill("Budget below range");
    await drawer.getByLabel("Why was it lost?").press("Enter");
    await expect(page.getByText("Lead updated")).toBeVisible();

    await drawer.getByRole("button", { name: "Delete lead" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete lead" }).click();
    await expect(page.getByText(`${name} deleted`)).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(0);
  });

  test("duplicates are flagged and can be merged", async ({ page, request }) => {
    const t = tag();
    const phone = mobile();
    const a = await postLead(request, { name: `E2E Dup A ${t}`, mobile: phone, email: testEmail(`dup-a-${t}`) });
    const b = await postLead(request, { kind: "brochure", name: `E2E Dup B ${t}`, mobile: phone.replace("+94 ", "0"), email: testEmail(`dup-b-${t}`) });

    await page.goto(`/admin/leads?lead=${b}`);
    const drawer = page.getByRole("dialog", { name: `Lead E2E Dup B ${t}` });
    await expect(drawer.getByText("Possible duplicate:")).toBeVisible();
    await drawer.getByRole("button", { name: "Merge" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Merge leads" }).click();
    await expect(page.getByText(`Leads merged into E2E Dup A ${t}`)).toBeVisible();
    await expect(page.getByRole("dialog", { name: `Lead E2E Dup A ${t}` }).getByText(/Merged with E2E Dup B/)).toBeVisible();
    const rows = (await sql!`select id from leads where id in (${a}, ${b})`) as { id: number }[];
    expect(rows.map((r) => r.id)).toEqual([a]);
  });

  test("bulk stage change from the table", async ({ page, request }) => {
    const t = tag();
    await postLead(request, { name: `E2E Bulk ${t} 1`, mobile: mobile(), email: testEmail(`bulk1-${t}`) });
    await postLead(request, { name: `E2E Bulk ${t} 2`, mobile: mobile(), email: testEmail(`bulk2-${t}`) });
    await page.reload();
    await page.getByRole("button", { name: "Table" }).click();
    await page.getByLabel("Search leads").fill(`E2E Bulk ${t}`);
    await expect(page.locator("tbody tr")).toHaveCount(2);
    await page.getByLabel("Select all").check();
    await expect(page.getByText("2 selected")).toBeVisible();
    await page.getByLabel("Move selected to stage").selectOption("negotiation");
    await expect(page.getByText("2 leads updated")).toBeVisible();
    await expect(page.locator("tbody tr").getByText("Negotiation")).toHaveCount(2);
  });

  test("the dashboard tile opens new leads", async ({ page }) => {
    await page.goto("/admin");
    const tile = page.getByRole("link", { name: /New leads/ });
    await expect(tile).toContainText(/\d+ this week · \d+ visits? today/);
    await tile.click();
    await expect(page).toHaveURL(/\/admin\/leads\?stage=new$/);
    await expect(page.getByLabel("Stage", { exact: true })).toHaveValue("new");
  });

  test("works on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/leads");
    await expect(page.getByRole("heading", { name: "Leads", level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `${SHOTS}/mobile-leads.png` });
  });
});

test.describe("site visits", () => {
  test("book a visit for a lead, then confirm, reschedule and complete it", async ({ page, request }) => {
    const t = tag();
    const name = `E2E Visitor ${t}`;
    const where = `E2E gallery ${t}`;
    const id = await postLead(request, { name, mobile: mobile(), email: testEmail(`visitor-${t}`), project: "Ocean View Residences" });
    const date = colomboDay(5);

    await signIn(page, `/admin/visits?book=${id}`);
    const dialog = page.getByRole("dialog", { name: "Book a site visit" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Choose lead")).toHaveValue(String(id));
    await expect(dialog.getByLabel("Where")).toHaveValue("Ocean View Residences show apartment");
    await dialog.getByLabel("Where").fill(where);
    await dialog.getByLabel("Date").fill(date);
    await dialog.getByLabel("Time").selectOption("11:00");
    await dialog.getByLabel("People").fill("3");
    await dialog.getByRole("button", { name: "Book visit" }).click();
    await expect(page.getByText(`Visit booked for ${name}`)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`d=${date}.*visit=\\d+`));

    const panel = page.getByRole("complementary", { name: "Visit details" });
    await expect(panel.getByText(name, { exact: true })).toBeVisible();
    await expect(panel.locator(".ad-vs").first()).toHaveText("Confirmed");
    await expect(page.getByRole("button", { name: new RegExp(`^11:00 AM ${name}`) })).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/visits-week.png`, fullPage: true });

    await panel.getByRole("button", { name: "Reschedule" }).click();
    await panel.getByLabel("Time").selectOption("14:00");
    await panel.getByRole("button", { name: "Move visit" }).click();
    await expect(panel.locator(".ad-vs").first()).toHaveText("Rescheduled");
    await expect(page.getByRole("button", { name: new RegExp(`^2:00 PM ${name}`) })).toBeVisible();

    await panel.getByRole("button", { name: "Confirm" }).click();
    await expect(panel.locator(".ad-vs").first()).toHaveText("Confirmed");
    await panel.getByRole("button", { name: "Completed" }).click();
    await expect(page.getByText("Visit marked completed")).toBeVisible();
    await expect(panel.locator(".ad-vs").first()).toHaveText("Completed");

    // Capacity for this (test-only) location
    await panel.getByRole("button", { name: `Increase capacity for ${where}` }).click();
    await expect(panel.getByRole("group", { name: where })).toContainText("3");
    await panel.getByRole("button", { name: `Decrease capacity for ${where}` }).click();
    await expect(panel.getByRole("group", { name: where })).toContainText("2");

    await page.getByRole("navigation", { name: "Calendar view" }).getByRole("link", { name: "List" }).click();
    await expect(page.locator("tbody")).toContainText(name);
    await page.getByRole("navigation", { name: "Calendar view" }).getByRole("link", { name: "Month" }).click();
    await expect(page.locator(`a[href*="d=${date}"]`).filter({ hasText: /\d+ visits?/ })).toBeVisible();

    // The lead moved to "Site visit" and shows the visit.
    await page.goto(`/admin/leads?lead=${id}`);
    const drawer = page.getByRole("dialog", { name: `Lead ${name}` });
    await expect(drawer.locator(".ad-stage").first()).toHaveText("Site visit");
    await expect(drawer.getByRole("link", { name: /Completed$/ })).toBeVisible();
    await expect(drawer.getByText(/Site visit completed/)).toBeVisible();
  });

  test("week, day and phone layouts render", async ({ page }) => {
    await signIn(page, "/admin/visits");
    await expect(page.getByRole("heading", { name: "Site visits", level: 1 })).toBeVisible();
    const views = page.getByRole("navigation", { name: "Calendar view" });
    await expect(views.getByRole("link", { name: "Week" })).toHaveAttribute("aria-current", "true");
    await views.getByRole("link", { name: "Day" }).click();
    await expect(page).toHaveURL(/view=day/);
    await page.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/view=day&d=\d{4}-\d{2}-\d{2}/);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/admin/visits");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `${SHOTS}/mobile-visits.png` });
  });

  test("activity log lists lead and visit changes", async ({ page }) => {
    await signIn(page, "/admin/activity?type=lead");
    await expect(page.getByRole("navigation", { name: "Filter activity" }).getByRole("link", { name: "Leads" })).toHaveAttribute("aria-current", "true");
    await expect(page.getByRole("navigation", { name: "Filter activity" }).getByRole("link", { name: "Visits" })).toBeVisible();
  });
});
