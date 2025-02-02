import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL missing - check Replit database provisioning");
}

export default defineConfig({
  out: "./migrations",
  schema: "./db/schema.ts",
  driver: "pg", // Changed from 'dialect'
  dbCredentials: {
    connectionString: process.env.DATABASE_URL + "?sslmode=require" // SSL requirement
  },
  strict: true
});
