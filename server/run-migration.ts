import * as dotenv from 'dotenv';
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

// Load environment variables first
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import db after env is loaded
const { db } = await import("./db");

async function runMigration() {
  try {
    console.log("Running migration to add metadata columns to shipped_imeis table...");

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, "db", "alter_shipped_imeis.sql"),
      "utf8"
    );

    await db.execute(sql.raw(migrationSQL));

    console.log("✅ Migration completed successfully!");

    // Verify the columns were added
    const result = await db.execute(sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'shipped_imeis'
      ORDER BY ordinal_position
    `);

    console.log("\nCurrent shipped_imeis table structure:");
    console.table(result.rows);

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();