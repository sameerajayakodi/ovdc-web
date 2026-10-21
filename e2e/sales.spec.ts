import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { png } from "./files";
import { leadIdByEmail, sql, tag, testEmail, testIp } from "./testdb";

/**
 * Reservations & sales and Customers. The buyer is a test lead ("E2E …"); the unit
 * it reserves goes back on sale at the end, and global-cleanup.ts removes the
 * customer, reservation, payments and private documents if a run stops halfway.
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

const unitStatus = async (id: number) => ((await sql!`select status from units where id = ${id}`) as { status: string }[])[0].status;

test.describe("reservations and sales", () => {
  test("reserve a unit for a lead, take the booking fee, sell it, see the customer, then cancel", async ({ page, request, browser }) => {
    test.setTimeout(180_000);
    const t = tag();
    const name = `E2E Buyer ${t}`;
    const email = testEmail(`buyer-${t}`);
    const res = await request.post("/api/leads", { headers: { "x-real-ip": testIp() }, data: { kind: "enquiry", page: "/e2e", name, email, mobile: "+94 77 555 0101", project: "Ocean View Residences" } });
    expect(res.status()).toBe(201);
    const leadId = await leadIdByEmail(email);

    // An available unit that no other test edits (admin.spec flips B-5A).
    const [unit] = (await sql!`select id, code, tower, project_slug from units where status = 'A' and project_slug = 'ocean-view-residences' and tower = 'A' order by floor desc, letter limit 1`) as { id: number; code: string; tower: string; project_slug: string }[];
    test.skip(!unit, "No available unit to reserve");

    try {
      await signIn(page, `/admin/sales?lead=${leadId}`);
      const dialog = page.getByRole("dialog", { name: "Reserve a unit" });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByLabel("Customer")).toHaveValue(`lead:${leadId}`);
      await dialog.getByRole("button", { name: "Reserve unit" }).click();
      await expect(dialog.getByText("Choose an available unit.").first()).toBeVisible();
      await dialog.getByLabel("Project").selectOption(unit.project_slug);
      await dialog.getByLabel(/^Available unit/).selectOption(String(unit.id));
      await expect(dialog.getByLabel("Agreed price (LKR Mn)")).not.toHaveValue("");
      await dialog.getByLabel("Payment plan").selectOption("30-70");
      await expect(dialog.getByText(/30% with the agreement/)).toBeVisible();
      await dialog.getByLabel("Payment plan").selectOption("construction");
      await page.screenshot({ path: `${SHOTS}/sales-new.png` });
      await dialog.getByRole("button", { name: "Reserve unit" }).click();
      await expect(page.getByText(`Unit ${unit.code} reserved for ${name}`)).toBeVisible({ timeout: 20_000 });
      await expect(dialog).toBeHidden();
      expect(await unitStatus(unit.id)).toBe("R");
      const [lead] = (await sql!`select stage from leads where id = ${leadId}`) as { stage: string }[];
      expect(lead.stage).toBe("reserved");

      // The website shows the unit as reserved.
      const site = await browser.newPage();
      await site.goto(`/projects/${unit.project_slug}/units/${unit.tower}-${unit.code}`);
      await expect(site.getByRole("link", { name: "Join the waiting list" }).first()).toBeVisible();
      await site.close();

      // Hold countdown and extension
      await expect(page.getByText(/^1[34]d \d\dh \d\dm \d\ds$/)).toBeVisible();
      await page.getByRole("button", { name: "Extend 7 days" }).click();
      await expect(page.getByText(/^Hold extended to /)).toBeVisible();
      await expect(page.getByText(/^2[01]d \d\dh \d\dm \d\ds$/)).toBeVisible();

      // Booking fee: the reference is required, then a receipt number is issued.
      await page.getByRole("button", { name: "Record payment" }).first().click();
      const pay = page.getByRole("dialog", { name: "Record payment" });
      await expect(pay.getByLabel("Amount received (LKR)")).toHaveValue("500,000");
      await pay.getByRole("button", { name: "Save and create receipt" }).click();
      await expect(pay.getByText("Add the bank or cheque reference.")).toBeVisible();
      await pay.getByLabel("Reference").fill(`E2E FT ${t}`);
      await pay.getByRole("button", { name: "Save and create receipt" }).click();
      await expect(page.getByText(/^Payment recorded · receipt RC-\d{4}-\d{4}$/)).toBeVisible();
      const receipt = page.getByRole("link", { name: /^RC-\d{4}-\d{4}$/ });
      await expect(receipt).toBeVisible();
      const receiptNo = (await receipt.textContent())!.trim();
      await expect(page.getByText(`Paid · receipt ${receiptNo}`)).toBeVisible();

      const slip = await page.context().newPage();
      await slip.goto((await receipt.getAttribute("href"))!);
      await expect(slip.getByText("Official receipt")).toBeVisible();
      await expect(slip.getByText(receiptNo)).toBeVisible();
      await expect(slip.getByText(name)).toBeVisible();
      await expect(slip.getByText("Five hundred thousand rupees only.")).toBeVisible();
      await slip.screenshot({ path: `${SHOTS}/receipt.png` });
      await slip.close();

      // Agreement, then the sale
      const sold = page.getByRole("button", { name: "Mark as sold" });
      await expect(sold).toBeDisabled();
      for (const step of ["draft agreement", "sent to customer", "signed"]) {
        await page.getByRole("button", { name: `Mark as ${step}` }).click();
        await expect(page.getByText(`Agreement marked as ${step}`)).toBeVisible();
      }
      await expect(sold).toBeEnabled();
      await sold.click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Mark as sold" }).click();
      await expect(page.getByText(`Unit ${unit.code} sold · shows as Sold on the website`)).toBeVisible();
      expect(await unitStatus(unit.id)).toBe("S");
      const [won] = (await sql!`select stage from leads where id = ${leadId}`) as { stage: string }[];
      expect(won.stage).toBe("won");
      await page.getByRole("button", { name: "Sales", exact: true }).click();
      await expect(page.getByRole("button", { name: new RegExp(`${name}`) })).toBeVisible();
      await page.screenshot({ path: `${SHOTS}/sales.png`, fullPage: true });

      // Collections report
      const [csv] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Collections report" }).click()]);
      const text = await readFile((await csv.path())!, "utf8");
      expect(text).toContain(name);
      expect(text).toContain(receiptNo);

      // The buyer is now a customer.
      await page.getByRole("link", { name, exact: true }).click();
      await expect(page).toHaveURL(/\/admin\/customers\?c=\d+/);
      const customerId = Number(new URL(page.url()).searchParams.get("c"));
      await expect(page.getByRole("heading", { name: "Customers", level: 1 })).toBeVisible();
      await expect(page.getByText(`Ocean View Residences · ${unit.code}`).first()).toBeVisible();
      await expect(page.getByRole("region", { name: "Payment history" }).getByRole("link", { name: receiptNo })).toBeVisible();

      await page.getByRole("button", { name: "Edit" }).click();
      await page.getByLabel("NIC").fill("123");
      await page.getByRole("button", { name: "Save customer" }).click();
      await expect(page.getByText("Use 12 digits, or 9 digits and V.").first()).toBeVisible();
      await page.getByLabel("NIC").fill("200012345678");
      await page.getByLabel("Postal address").fill("No. 1, E2E Lane, Colombo 03");
      await page.getByRole("button", { name: "Save customer" }).click();
      await expect(page.getByText("Customer saved")).toBeVisible();
      await expect(page.getByText("NIC 200012345678")).toBeVisible();

      // Private document: uploaded as an authenticated asset, downloaded through a signed link.
      if (process.env.CLOUDINARY_API_SECRET) {
        await page.getByLabel("Upload document").setInputFiles({ name: `e2e-nic-${t}.png`, mimeType: "image/png", buffer: png(320, 200, 3) });
        await expect(page.getByText(`e2e-nic-${t}.png added`)).toBeVisible({ timeout: 60_000 });
        const doc = page.getByRole("link", { name: `e2e-nic-${t}.png` });
        const href = (await doc.getAttribute("href"))!;
        const go = await page.request.get(href, { maxRedirects: 0 });
        expect(go.status()).toBe(307);
        const signed = go.headers().location;
        expect(signed).toMatch(/^https:\/\/api\.cloudinary\.com\/v1_1\/[^/]+\/image\/download\?/);
        const file = await page.request.get(signed);
        expect(file.status()).toBe(200);
        expect(file.headers()["content-type"]).toContain("image");
        // Not reachable without the signature
        const [row] = (await sql!`select public_id from customer_documents where customer_id = ${customerId}`) as { public_id: string }[];
        const open = await page.request.get(`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${row.public_id}.png`);
        expect(open.status()).toBeGreaterThanOrEqual(400);
        // Signed-out visitors are sent to the login page.
        const anon = await browser.newContext();
        const blocked = await anon.request.get(href, { maxRedirects: 0 });
        expect(blocked.status()).toBe(307);
        expect(blocked.headers().location).toContain("/admin/login");
        await anon.close();
        await page.screenshot({ path: `${SHOTS}/customers.png`, fullPage: true });

        await page.getByRole("button", { name: `Delete e2e-nic-${t}.png` }).click();
        await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
        await expect(page.getByText(`e2e-nic-${t}.png deleted`)).toBeVisible();
        await expect(doc).toBeHidden();
      }

      // Cancel the sale: the unit goes back on sale.
      await page.goto(`/admin/sales`);
      await page.getByRole("button", { name: "Sales", exact: true }).click();
      await page.getByRole("button", { name: new RegExp(name) }).click();
      await page.getByRole("button", { name: "Cancel sale" }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Cancel sale" }).click();
      await expect(page.getByText(`Unit ${unit.code} released · shows as Available on the website`)).toBeVisible();
      expect(await unitStatus(unit.id)).toBe("A");
      await page.getByRole("button", { name: "Closed", exact: true }).click();
      await expect(page.getByRole("button", { name: new RegExp(name) })).toBeVisible();

      // Every step is in the activity log.
      const acts = (await sql!`select action from activity where entity = 'sale' and detail->>'name' = ${name} order by id`) as { action: string }[];
      expect(acts.map((a) => a.action)).toEqual(
        expect.arrayContaining([expect.stringMatching(/^reserved A-/), "hold extended 7 days", "payment received · Booking fee", "agreement · signed", expect.stringMatching(/^sold A-/), expect.stringMatching(/^cancelled A-/)]),
      );
    } finally {
      // Never leave a production unit reserved or sold by a test.
      await sql!`update units set status = 'A', updated_at = now() where id = ${unit.id} and status in ('R', 'S') and exists (select 1 from reservations r join customers c on c.id = r.customer_id where r.unit_id = ${unit.id} and c.name = ${name})`;
    }
  });

  test("reserved and sold units are not offered for a new reservation", async ({ page, request }) => {
    const t = tag();
    const name = `E2E Second ${t}`;
    const email = testEmail(`second-${t}`);
    expect((await request.post("/api/leads", { headers: { "x-real-ip": testIp() }, data: { kind: "enquiry", page: "/e2e", name, email } })).status()).toBe(201);
    const leadId = await leadIdByEmail(email);
    // A unit that is already reserved or sold is never offered.
    const [taken] = (await sql!`select id from units where status <> 'A' limit 1`) as { id: number }[];
    await signIn(page, `/admin/sales?lead=${leadId}`);
    const dialog = page.getByRole("dialog", { name: "Reserve a unit" });
    await expect(dialog).toBeVisible();
    if (taken) await expect(dialog.locator(`#nr-u option[value="${taken.id}"]`)).toHaveCount(0);
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  });
});
