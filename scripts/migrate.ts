/** Applies ./drizzle migrations over Neon's WebSocket driver. */
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { db, pool } from "./db";

migrate(db, { migrationsFolder: "./drizzle" })
  .then(() => console.log("Migrations applied."))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
