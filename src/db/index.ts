import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Neon over HTTPS: stateless, so it suits serverless functions and works on
 * networks that block the Postgres port. Multi-statement writes use
 * `db.batch([...])`, which runs as one transaction.
 * When DATABASE_URL is missing (a fresh checkout) `db` is null and the site
 * falls back to the sample data in src/lib/data.
 */
const url = process.env.DATABASE_URL;

export const db = url ? drizzle({ client: neon(url), schema }) : null;
export { schema };
