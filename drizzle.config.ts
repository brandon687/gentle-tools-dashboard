import { defineConfig } from "drizzle-kit";

// Don't throw during build - let runtime handle missing DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://placeholder:5432/db';

if (!process.env.DATABASE_URL) {
  console.warn('⚠️ DATABASE_URL not set in drizzle.config.ts - using placeholder');
}

export default defineConfig({
  out: "./migrations",
  schema: "./server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
  },
});
