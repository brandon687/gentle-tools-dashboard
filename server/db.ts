import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as dbSchema from "./db/schema";

// Make DATABASE_URL optional - will use in-memory storage as fallback
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL not set. Using in-memory storage for shipped IMEIs.');
} else {
  console.log('✅ DATABASE_URL configured for Railway PostgreSQL');
}

export const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL }) : null;
export const db = pool ? drizzle({ client: pool, schema: dbSchema }) : null as any;
export * from "./db/schema";
