import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as dbSchema from "./db/schema";

neonConfig.webSocketConstructor = ws;

// Make DATABASE_URL optional - will use in-memory storage as fallback
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL not set. Using in-memory storage for shipped IMEIs.');
}

export const pool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL }) : null;
export const db = pool ? drizzle({ client: pool, schema: dbSchema }) : null as any;
export * from "./db/schema";
