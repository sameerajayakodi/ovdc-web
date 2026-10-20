import "server-only";
import { neon, neonConfig } from "@neondatabase/serverless";
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

/** True when every statement in a Neon HTTP request body is a SELECT. */
function readOnly(body: unknown) {
  if (typeof body !== "string") return false;
  try {
    const j = JSON.parse(body) as { query?: string; queries?: { query: string }[] };
    const qs = j.queries ?? (j.query ? [{ query: j.query }] : []);
    return qs.length > 0 && qs.every((q) => /^\s*select\b/i.test(q.query));
  } catch {
    return false;
  }
}

/** A read that has not answered by then is abandoned and sent again. */
const READ_TIMEOUT_MS = 8_000;
/** A write is never repeated; after this long the caller gets an error instead of waiting forever. */
const WRITE_TIMEOUT_MS = 25_000;

/**
 * A request to Neon can fail ("fetch failed") or stall on a busy or flaky
 * connection, and one lost query cuts a page's stream short or leaves an admin
 * action spinning. Reads get a timeout and up to two retries with a short
 * backoff. Writes are never retried, so a statement can't be applied twice;
 * they only get a longer timeout. HTTP error responses pass straight through.
 */
neonConfig.fetchFunction = async (input: RequestInfo | URL, init?: RequestInit) => {
  const read = readOnly(init?.body);
  for (let attempt = 0; ; attempt++) {
    const timeout = AbortSignal.timeout(read ? READ_TIMEOUT_MS : WRITE_TIMEOUT_MS);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    try {
      return await fetch(input, { ...init, signal });
    } catch (e) {
      if (!read || attempt >= 2 || init?.signal?.aborted) throw e;
      await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
    }
  }
};

export const db = url ? drizzle({ client: neon(url), schema }) : null;
export { schema };
