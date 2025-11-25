import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as dbSchema from "./db/schema";

// Railway-compatible PostgreSQL connection
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn('⚠️  DATABASE_URL not set. Database features will be disabled.');
  console.warn('⚠️  Some functionality may be limited.');
}

// Create a standard PostgreSQL pool with connection limits and timeouts
export const pool = DATABASE_URL ? new Pool({
  connectionString: DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Timeout new connections after 10 seconds
  statement_timeout: 30000, // Timeout queries after 30 seconds
  query_timeout: 30000, // Alternative query timeout
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // Railway's PostgreSQL uses self-signed certificates
  } : false
}) : null;

// Add connection error handling
if (pool) {
  pool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err);
  });

  // Test the connection on startup but don't block
  pool.query('SELECT 1', (err) => {
    if (err) {
      console.error('⚠️  Failed to connect to PostgreSQL:', err.message);
    } else {
      console.log('✅ PostgreSQL connection established');
    }
  });
}

export const db = pool ? drizzle(pool, { schema: dbSchema }) : null as any;
export * from "./db/schema";