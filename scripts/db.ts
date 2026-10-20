/** Shared connection for the CLI scripts (migrate, seed). */
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "../src/db/schema";

try {
  process.loadEnvFile(".env.local");
} catch {
  // CI / Vercel provide the variables directly.
}

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set (see .env.local)");

export const pool = new Pool({ connectionString: url });
export const db = drizzle(pool, { schema });
export { schema };
