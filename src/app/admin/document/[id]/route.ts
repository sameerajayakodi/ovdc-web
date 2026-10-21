import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getAdmin } from "@/lib/admin/auth";
import { privateDownload } from "@/lib/cloudinary";

/** Customer documents are private Cloudinary assets: signed-in admins get a five-minute download link. */
export async function GET(req: Request, ctx: RouteContext<"/admin/document/[id]">) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.redirect(new URL("/admin/login", req.url));
  const id = Number((await ctx.params).id);
  if (!db || !Number.isInteger(id) || id <= 0) return new NextResponse("Not found", { status: 404 });
  const [doc] = await db.select().from(schema.customerDocuments).where(eq(schema.customerDocuments.id, id)).limit(1);
  if (!doc) return new NextResponse("Not found", { status: 404 });
  await db.insert(schema.activity).values({ actor: admin.username, entity: "customer", ref: String(doc.customerId), action: "document downloaded", detail: { name: doc.name } });
  const res = NextResponse.redirect(privateDownload(doc.publicId, doc.resourceType, doc.resourceType === "raw" ? "" : doc.format));
  res.headers.set("Cache-Control", "private, no-store");
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
