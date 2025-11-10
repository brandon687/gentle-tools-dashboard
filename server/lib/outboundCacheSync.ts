import { db } from "../db";
import { outboundImeis, outboundSyncLog, type NewOutboundImei, type NewOutboundSyncLog } from "../db/schema";
import { fetchOutboundData, type OutboundSheetRow } from "./googleSheets";
import { eq, sql } from "drizzle-orm";

interface SyncResult {
  success: boolean;
  rowsProcessed: number;
  rowsInserted: number;
  timeTaken: number;
  error?: string;
  lastSyncTime?: Date;
}

/**
 * Sync outbound IMEIs from Google Sheets to database cache
 * Uses a truncate-and-repopulate approach for simplicity and data consistency
 */
export async function syncOutboundCache(): Promise<SyncResult> {
  const startTime = Date.now();
  let syncLogId: string | undefined;

  try {
    console.log("🔄 Starting outbound cache sync...");

    // Create sync log entry
    const [syncLog] = await db.insert(outboundSyncLog).values({
      status: 'in_progress',
      rowsProcessed: 0,
      rowsInserted: 0,
    }).returning();

    syncLogId = syncLog.id;

    // Fetch data from Google Sheets
    console.log("📊 Fetching data from Google Sheets...");
    const sheetData = await fetchOutboundData();
    console.log(`✅ Fetched ${sheetData.length} rows from Google Sheets`);

    // Clear existing cache (truncate approach for simplicity)
    console.log("🗑️ Clearing existing cache...");
    await db.delete(outboundImeis);

    // Prepare data for insertion
    const dataToInsert: NewOutboundImei[] = sheetData
      .filter(row => row.imei) // Only process rows with IMEI
      .map((row: OutboundSheetRow) => ({
        imei: row.imei!,
        model: row.model || null,
        capacity: row.capacity || null,
        color: row.color || null,
        lockStatus: row.lockStatus || null,
        graded: row.graded || null,
        price: row.price || null,
        updatedAt: row.updatedAt || null,
        invno: row.invno || null,
        invtype: row.invtype || null,
      }));

    console.log(`📝 Preparing to insert ${dataToInsert.length} rows...`);

    // Batch insert in chunks to avoid memory issues
    const BATCH_SIZE = 1000;
    let totalInserted = 0;

    for (let i = 0; i < dataToInsert.length; i += BATCH_SIZE) {
      const batch = dataToInsert.slice(i, i + BATCH_SIZE);
      await db.insert(outboundImeis).values(batch);
      totalInserted += batch.length;

      if ((i + BATCH_SIZE) % 5000 === 0) {
        console.log(`  Inserted ${totalInserted} / ${dataToInsert.length} rows...`);
      }
    }

    const timeTaken = Date.now() - startTime;

    // Update sync log with success
    await db.update(outboundSyncLog)
      .set({
        status: 'completed',
        syncCompletedAt: new Date(),
        rowsProcessed: sheetData.length,
        rowsInserted: totalInserted,
        timeTaken: timeTaken,
      })
      .where(eq(outboundSyncLog.id, syncLogId));

    console.log(`✅ Sync completed successfully in ${timeTaken}ms`);
    console.log(`   - Rows processed: ${sheetData.length}`);
    console.log(`   - Rows inserted: ${totalInserted}`);

    return {
      success: true,
      rowsProcessed: sheetData.length,
      rowsInserted: totalInserted,
      timeTaken,
      lastSyncTime: new Date(),
    };

  } catch (error) {
    const timeTaken = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error("❌ Sync failed:", errorMessage);

    // Update sync log with failure
    if (syncLogId) {
      await db.update(outboundSyncLog)
        .set({
          status: 'failed',
          syncCompletedAt: new Date(),
          timeTaken: timeTaken,
          errorMessage: errorMessage,
          errorDetails: error instanceof Error ? { stack: error.stack } : null,
        })
        .where(eq(outboundSyncLog.id, syncLogId));
    }

    return {
      success: false,
      rowsProcessed: 0,
      rowsInserted: 0,
      timeTaken,
      error: errorMessage,
    };
  }
}

/**
 * Get the last successful sync information
 */
export async function getLastSyncInfo() {
  const lastSync = await db
    .select({
      syncedAt: outboundSyncLog.syncCompletedAt,
      rowsInserted: outboundSyncLog.rowsInserted,
      timeTaken: outboundSyncLog.timeTaken,
    })
    .from(outboundSyncLog)
    .where(eq(outboundSyncLog.status, 'completed'))
    .orderBy(sql`${outboundSyncLog.syncCompletedAt} DESC`)
    .limit(1);

  if (lastSync.length === 0) {
    return null;
  }

  // Also get the current count in the cache
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(outboundImeis);

  return {
    ...lastSync[0],
    currentCacheSize: count,
  };
}

/**
 * Check if cache needs refresh (older than specified minutes)
 */
export async function isCacheStale(maxAgeMinutes: number = 60): Promise<boolean> {
  const lastSync = await getLastSyncInfo();

  if (!lastSync || !lastSync.syncedAt) {
    return true; // No sync or no successful sync
  }

  const ageInMinutes = (Date.now() - new Date(lastSync.syncedAt).getTime()) / (1000 * 60);
  return ageInMinutes > maxAgeMinutes;
}