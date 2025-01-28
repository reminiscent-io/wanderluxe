
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const dbURL = process.env.DATABASE_URL;
if (!dbURL) {
  throw new Error("DATABASE_URL environment variable is required");
}

export const db = drizzle({
  connection: dbURL,
  schema,
  ws: ws,
});
