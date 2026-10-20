import { cleanupTestMedia, cleanupTestRows } from "./testdb";

/** Runs before and after the suite: removes every lead, visit and log row the tests created. */
export default async function cleanup() {
  try {
    await cleanupTestRows();
    await cleanupTestMedia();
  } catch (e) {
    console.warn("[e2e] could not clean up test rows:", e);
  }
}
