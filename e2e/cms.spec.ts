import { expect, test, type Page } from "@playwright/test";
import { leadIdByEmail, sql, tag, testEmail, testIp } from "./testdb";

/**
 * Website content and Settings. Test posts, questions and applicants start with
 * "E2E " and global-cleanup.ts deletes them. Settings are only validated, never
 * saved, so the live website's contact details are not touched.
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

test.describe("website content", () => {
  test("write a post, publish it, see it on the website, unpublish and delete it", async ({ page, browser }) => {
    test.setTimeout(240_000);
    const t = tag();
    const title = `E2E Post ${t} about the pool deck`;
    const slug = `e2e-post-${t}-about-the-pool-deck`;
    await signIn(page, "/admin/content?section=news");
    await expect(page.getByRole("navigation", { name: "Website sections" })).toBeVisible();
    await page.getByRole("button", { name: "New post" }).click();
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Give the post a title.").first()).toBeVisible();

    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Standfirst").fill("A short E2E standfirst.");
    await page.getByLabel("Category").selectOption("Construction");
    await page.getByLabel("Paragraph 1").fill("The podium waterproofing is complete and tiling has started.");
    await page.getByRole("button", { name: "Add section with heading" }).click();
    await page.getByLabel("Heading 2").fill("What comes next");
    await page.getByLabel("Paragraph 2").fill("Glazing on the pool pavilion follows in November.");
    await expect(page.getByText(/· 20 words · about 1 min read/)).toBeVisible();
    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/content-news.png`, fullPage: true });
    // Actions that invalidate website pages can take a while when the suite runs in parallel.
    await page.getByRole("button", { name: "Publish now" }).click();
    await expect(page.getByText("Published · live on the website")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("button", { name: new RegExp(`^${title}`) })).toBeVisible();

    const site = await browser.newPage();
    await site.goto(`/news/${slug}`);
    await expect(site.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(site.getByRole("heading", { name: "What comes next" })).toBeVisible();
    await site.goto("/news");
    await expect(site.getByText(title).first()).toBeVisible();

    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByText("Saved as draft")).toBeVisible({ timeout: 60_000 });
    await site.goto(`/news/${slug}`);
    await expect(site.getByRole("heading", { level: 1, name: title })).toHaveCount(0);
    await site.close();

    await page.getByRole("button", { name: "Delete post" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete post" }).click();
    await expect(page.getByText(`${title} deleted`)).toBeVisible({ timeout: 60_000 });
    const [{ n }] = (await sql!`select count(*)::int n from posts where slug = ${slug}`) as { n: number }[];
    expect(n).toBe(0);
  });

  test("add a question to the FAQ, see it on the website, remove it", async ({ page, browser }) => {
    test.setTimeout(120_000);
    const t = tag();
    const q = `E2E question ${t}: is parking included?`;
    const started = new Date();
    try {
      await signIn(page, "/admin/content?section=faq");
      await expect(page.getByRole("heading", { name: "FAQ", level: 1 })).toBeVisible();
      await page.getByRole("button", { name: "Add", exact: true }).click();
      const row = page.getByRole("listitem", { name: "New question" });
      await row.getByLabel("Question", { exact: true }).fill(q);
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByText(/enter the question and the answer/).first()).toBeVisible();
      await page.getByRole("listitem", { name: q }).getByLabel("Answer", { exact: true }).fill("Yes, one covered space per home.");
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByText("FAQ saved · live on the website")).toBeVisible({ timeout: 60_000 });
      await expect(page.getByText("All changes saved")).toBeVisible({ timeout: 60_000 });

      const site = await browser.newPage();
      await site.goto("/faq");
      await expect(site.getByText(q)).toBeVisible();

      await page.getByRole("button", { name: `Remove ${q}` }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
      await expect(page.getByText("Unsaved changes")).toBeVisible();
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(page.getByText("All changes saved")).toBeVisible({ timeout: 60_000 });
      // The first save's toast may still be showing, so wait for the database instead.
      await expect.poll(async () => ((await sql!`select count(*)::int n from faqs where q = ${q}`) as { n: number }[])[0].n).toBe(0);
      await site.reload();
      await expect(site.getByText(q)).toBeHidden();
      await site.close();
    } finally {
      await sql!`delete from faqs where q = ${q}`;
      // The list saves are logged as "FAQ updated"; drop this test's entries.
      await sql!`delete from activity where entity = 'content' and ref = 'faq' and actor = ${USER} and at >= ${started}`;
    }
  });

  test("move a job applicant through the hiring stages", async ({ page, request }) => {
    const t = tag();
    const name = `E2E Applicant ${t}`;
    const email = testEmail(`cv-${t}`);
    const res = await request.post("/api/leads", { headers: { "x-real-ip": testIp() }, data: { kind: "application", page: "/careers/e2e", name, email, mobile: "+94 77 555 0102", interest: "Site Engineer", url: "linkedin.com/in/e2e" } });
    expect(res.status()).toBe(201);
    const id = await leadIdByEmail(email);
    await signIn(page, "/admin/content?section=careers");
    await expect(page.getByRole("heading", { name: "Careers", level: 1 })).toBeVisible();
    const stage = page.getByLabel(`Stage for ${name}`);
    await expect(stage).toHaveValue("new");
    await stage.selectOption("shortlisted");
    await expect(page.getByText(`${name}: Shortlisted`)).toBeVisible();
    await page.getByLabel("Filter by stage").selectOption("shortlisted");
    await expect(stage).toBeVisible();
    const [row] = (await sql!`select hr_stage from leads where id = ${id}`) as { hr_stage: string }[];
    expect(row.hr_stage).toBe("shortlisted");
    await page.screenshot({ path: `${SHOTS}/content-careers.png`, fullPage: true });
  });

  test("a newsletter sign-up can be turned into a sales lead", async ({ page, request }) => {
    const t = tag();
    const name = `E2E Reader ${t}`;
    const email = testEmail(`news-${t}`);
    const res = await request.post("/api/leads", { headers: { "x-real-ip": testIp() }, data: { kind: "newsletter", page: "/e2e", name, email } });
    expect(res.status()).toBe(201);
    const id = await leadIdByEmail(email);
    await signIn(page, "/admin/content?section=forms");
    await expect(page.getByRole("heading", { name: "Form submissions", level: 1 })).toBeVisible();
    const row = page.getByRole("row").filter({ hasText: name });
    await row.getByRole("button", { name: "Convert to lead" }).click();
    await expect(page.getByText(`${name} is now in the Leads inbox`)).toBeVisible();
    await expect(row.getByRole("link", { name: "Open lead" })).toBeVisible();
    const [lead] = (await sql!`select kind, stage from leads where id = ${id}`) as { kind: string; stage: string }[];
    expect(lead).toEqual({ kind: "enquiry", stage: "new" });
  });
});

test.describe("settings", () => {
  test("invalid contact details are rejected and nothing is saved", async ({ page }) => {
    const before = await sql!`select key, value from settings where key in ('company', 'offices', 'fx') order by key`;
    await signIn(page, "/admin/settings");
    await expect(page.getByRole("heading", { name: "Company", level: 1 })).toBeVisible();
    await page.getByRole("navigation", { name: "Settings sections" }).getByRole("button", { name: "Contacts & social" }).click();
    const email = page.getByLabel("Sales email");
    await expect(email).not.toHaveValue("");
    await email.fill("not-an-email");
    await expect(page.getByText("Unsaved changes")).toBeVisible();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Check the sales email address.").first()).toBeVisible();
    await page.getByRole("navigation", { name: "Settings sections" }).getByRole("button", { name: "Exchange rates" }).click();
    await expect(page.getByLabel("USD rate")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/settings.png`, fullPage: true });
    await page.getByRole("button", { name: "Discard" }).click();
    await expect(page.getByText("Unsaved changes")).toBeHidden();
    expect(await sql!`select key, value from settings where key in ('company', 'offices', 'fx') order by key`).toEqual(before);
  });
});
