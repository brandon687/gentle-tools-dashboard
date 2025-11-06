import { db } from "./server/db";
import { googleSheetsSyncLog, inventoryItems } from "./server/db/schema";
import { sql } from "drizzle-orm";

async function checkSync() {
  console.log("=== Sync Status Check ===\n");

  // Get latest sync log
  const [latestSync] = await db
    .select()
    .from(googleSheetsSyncLog)
    .orderBy(sql`${googleSheetsSyncLog.syncStartedAt} DESC`)
    .limit(1);

  if (!latestSync) {
    console.log("No sync log found");
    return;
  }

  console.log("Latest Sync:");
  console.log("  ID:", latestSync.id);
  console.log("  Status:", latestSync.status);
  console.log("  Started At:", latestSync.syncStartedAt);
  console.log("  Completed At:", latestSync.syncCompletedAt);
  console.log("  Items Processed:", latestSync.itemsProcessed);
  console.log("  Sheets Row Count:", latestSync.sheetsRowCount);
  console.log("  DB Item Count:", latestSync.dbItemCount);
  console.log("  Items Added:", latestSync.itemsAdded);
  console.log("  Items Updated:", latestSync.itemsUpdated);
  console.log("  Items Unchanged:", latestSync.itemsUnchanged);

  if (latestSync.errorMessage) {
    console.log("  Error:", latestSync.errorMessage);
  }

  // Get total items in inventory
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(inventoryItems);

  console.log("\nDatabase Stats:");
  console.log("  Total Inventory Items:", countResult.count);

  // Check if there's a stuck in-progress sync
  if (latestSync.status === "in_progress") {
    const minutesRunning = Math.floor(
      (Date.now() - new Date(latestSync.syncStartedAt).getTime()) / 60000
    );
    console.log("\n⚠️  WARNING: Sync is still in progress!");
    console.log("  Running for:", minutesRunning, "minutes");

    if (minutesRunning > 10) {
      console.log("  This sync appears to be stuck or hung.");
    }
  }
}

checkSync()
  .then(() => {
    console.log("\n✅ Check complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
