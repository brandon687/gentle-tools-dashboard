import { db } from "../db";
import {
  inventoryItems,
  inventoryMovements,
  inventoryLocations,
  googleSheetsSyncLog,
  type NewInventoryItem,
  type NewInventoryMovement,
  type NewGoogleSheetsSyncLog,
} from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { fetchInventoryData } from "./googleSheets";
import type { InventoryDataResponse } from "@shared/schema";

interface SyncResult {
  itemsProcessed: number;
  itemsAdded: number;
  itemsUpdated: number;
  itemsUnchanged: number;
  movements: number;
  syncLogId: string;
}

interface BatchInsertItem {
  item: NewInventoryItem;
  movement: Omit<NewInventoryMovement, 'itemId'>;
  sheetItem: any;
}

interface BatchUpdateItem {
  existingItem: any;
  sheetItem: any;
  changes: Change[];
}

interface Change {
  type: 'grade' | 'lock_status';
  oldValue: string | null;
  newValue: string | null;
}

/**
 * Get or create the default "Main Warehouse" location
 */
async function getOrCreateMainLocation() {
  try {
    const [existing] = await db
      .select()
      .from(inventoryLocations)
      .where(eq(inventoryLocations.code, 'MAIN'))
      .limit(1);

    if (existing) {
      return existing;
    }

    // Create default location
    const [newLocation] = await db
      .insert(inventoryLocations)
      .values({
        name: 'Main Warehouse',
        code: 'MAIN',
        address: null,
        isActive: true,
      })
      .returning();

    console.log('✓ Created default location: Main Warehouse');
    return newLocation;
  } catch (error) {
    console.error('Error getting/creating main location:', error);
    throw error;
  }
}

/**
 * Create a new sync log entry
 */
async function createSyncLog(): Promise<NewGoogleSheetsSyncLog & { id: string }> {
  const [syncLog] = await db
    .insert(googleSheetsSyncLog)
    .values({
      syncStartedAt: new Date(),
      status: 'in_progress',
      itemsProcessed: 0,
      itemsAdded: 0,
      itemsUpdated: 0,
      itemsUnchanged: 0,
    })
    .returning();

  return syncLog as NewGoogleSheetsSyncLog & { id: string };
}

/**
 * Update sync log progress (incremental updates)
 */
async function updateSyncProgress(syncLogId: string, result: Partial<SyncResult>) {
  await db
    .update(googleSheetsSyncLog)
    .set({
      itemsProcessed: result.itemsProcessed,
      itemsAdded: result.itemsAdded,
      itemsUpdated: result.itemsUpdated,
      itemsUnchanged: result.itemsUnchanged,
    })
    .where(eq(googleSheetsSyncLog.id, syncLogId));
}

/**
 * Complete sync log with results
 */
async function completeSyncLog(syncLogId: string, result: SyncResult) {
  await db
    .update(googleSheetsSyncLog)
    .set({
      syncCompletedAt: new Date(),
      status: 'completed',
      itemsProcessed: result.itemsProcessed,
      itemsAdded: result.itemsAdded,
      itemsUpdated: result.itemsUpdated,
      itemsUnchanged: result.itemsUnchanged,
    })
    .where(eq(googleSheetsSyncLog.id, syncLogId));
}

/**
 * Mark sync log as failed
 */
async function failSyncLog(syncLogId: string, error: any) {
  await db
    .update(googleSheetsSyncLog)
    .set({
      syncCompletedAt: new Date(),
      status: 'failed',
      errorMessage: error.message || String(error),
      errorDetails: {
        stack: error.stack,
        name: error.name,
      },
    })
    .where(eq(googleSheetsSyncLog.id, syncLogId));
}

/**
 * Batch insert new items to inventory (optimized for bulk operations)
 */
async function batchInsertNewItems(
  batchItems: BatchInsertItem[]
) {
  if (batchItems.length === 0) return [];

  return await db.transaction(async (tx) => {
    // Batch insert all items
    const newItems = await tx
      .insert(inventoryItems)
      .values(batchItems.map(b => b.item))
      .returning();

    // Map IMEIs to IDs for movement records
    const imeiToId = new Map(newItems.map(item => [item.imei, item.id]));

    // Create movement records for all items
    const movements = batchItems.map(b => ({
      ...b.movement,
      itemId: imeiToId.get(b.item.imei)!,
    }));

    await tx.insert(inventoryMovements).values(movements);

    return newItems;
  });
}

/**
 * Detect changes between database item and sheet item
 */
function detectChanges(dbItem: any, sheetItem: any): Change[] {
  const changes: Change[] = [];

  if (dbItem.currentGrade !== sheetItem.grade && sheetItem.grade) {
    changes.push({
      type: 'grade',
      oldValue: dbItem.currentGrade,
      newValue: sheetItem.grade,
    });
  }

  if (dbItem.currentLockStatus !== sheetItem.lockStatus && sheetItem.lockStatus) {
    changes.push({
      type: 'lock_status',
      oldValue: dbItem.currentLockStatus,
      newValue: sheetItem.lockStatus,
    });
  }

  return changes;
}

/**
 * Batch update items and create movement records (optimized for bulk operations)
 */
async function batchUpdateItems(
  batchUpdates: BatchUpdateItem[]
) {
  if (batchUpdates.length === 0) return;

  return await db.transaction(async (tx) => {
    const now = new Date();

    // Batch update all items using individual updates in parallel
    // Note: Drizzle doesn't support bulk updates with different values per row,
    // so we batch the operations in a transaction
    const updatePromises = batchUpdates.map(({ existingItem, sheetItem }) =>
      tx
        .update(inventoryItems)
        .set({
          model: sheetItem.model || existingItem.model,
          gb: sheetItem.gb || existingItem.gb,
          color: sheetItem.color || existingItem.color,
          sku: sheetItem.sku || existingItem.sku,
          currentGrade: sheetItem.grade || existingItem.currentGrade,
          currentLockStatus: sheetItem.lockStatus || existingItem.currentLockStatus,
          lastSeenAt: now,
          updatedAt: now,
        })
        .where(eq(inventoryItems.id, existingItem.id))
    );

    await Promise.all(updatePromises);

    // Collect all movement records
    const movements: NewInventoryMovement[] = [];
    for (const { existingItem, sheetItem, changes } of batchUpdates) {
      for (const change of changes) {
        if (change.type === 'grade') {
          movements.push({
            itemId: existingItem.id,
            movementType: 'grade_changed',
            fromGrade: change.oldValue,
            toGrade: change.newValue,
            source: 'google_sheets_sync',
            performedAt: now,
            snapshotData: sheetItem,
          });
        } else if (change.type === 'lock_status') {
          movements.push({
            itemId: existingItem.id,
            movementType: 'status_changed',
            fromLockStatus: change.oldValue,
            toLockStatus: change.newValue,
            source: 'google_sheets_sync',
            performedAt: now,
            snapshotData: sheetItem,
          });
        }
      }
    }

    // Batch insert all movements
    if (movements.length > 0) {
      await tx.insert(inventoryMovements).values(movements);
    }
  });
}

/**
 * Main sync function: Sync Google Sheets data to database (OPTIMIZED)
 */
export async function syncGoogleSheetsToDatabase(): Promise<SyncResult> {
  console.log('🔄 Starting Google Sheets to Database sync...');

  const BATCH_SIZE = 500; // Process items in batches of 500
  const PROGRESS_UPDATE_INTERVAL = 1000; // Update progress every 1000 items

  // 1. Create sync log FIRST (before potentially failing operations)
  const syncLog = await createSyncLog();
  console.log(`📝 Created sync log: ${syncLog.id}`);

  try {
    // 2. Fetch current data from Google Sheets with timeout
    console.log('📊 Fetching data from Google Sheets...');
    const fetchPromise = fetchInventoryData();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Google Sheets fetch timeout after 60 seconds')), 60000)
    );
    const sheetsData: InventoryDataResponse = await Promise.race([fetchPromise, timeoutPromise]);
    console.log(`📊 Fetched ${sheetsData.physicalInventory.length} items from Google Sheets`);

    // 3. Update sync log with row count
    await db.update(googleSheetsSyncLog)
      .set({ sheetsRowCount: sheetsData.physicalInventory.length })
      .where(eq(googleSheetsSyncLog.id, syncLog.id));

    // 4. Get default location (create if not exists)
    const mainLocation = await getOrCreateMainLocation();
    console.log(`📍 Using location: ${mainLocation.name} (${mainLocation.code})`);

    const result: SyncResult = {
      itemsProcessed: 0,
      itemsAdded: 0,
      itemsUpdated: 0,
      itemsUnchanged: 0,
      movements: 0,
      syncLogId: syncLog.id,
    };

    // 4. Filter out items with missing IMEIs
    const validItems = sheetsData.physicalInventory.filter(item =>
      item.imei && item.imei.trim() !== ''
    );
    console.log(`📋 Processing ${validItems.length} valid items (${sheetsData.physicalInventory.length - validItems.length} skipped due to missing IMEI)`);

    // 5. Batch lookup: Get all existing items in one query
    console.log('🔍 Looking up existing items in database...');
    const allImeis = validItems.map(item => item.imei!);
    const existingItemsArray = await db
      .select()
      .from(inventoryItems)
      .where(sql`${inventoryItems.imei} = ANY(${allImeis})`);

    // Create a map for O(1) lookup
    const existingItemsMap = new Map(
      existingItemsArray.map(item => [item.imei, item])
    );
    console.log(`✓ Found ${existingItemsArray.length} existing items in database`);

    // 6. Process items in batches
    const totalBatches = Math.ceil(validItems.length / BATCH_SIZE);
    console.log(`⚙️  Processing ${totalBatches} batches of up to ${BATCH_SIZE} items each...`);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStart = batchIndex * BATCH_SIZE;
      const batchEnd = Math.min(batchStart + BATCH_SIZE, validItems.length);
      const batch = validItems.slice(batchStart, batchEnd);

      const newItems: BatchInsertItem[] = [];
      const updateItems: BatchUpdateItem[] = [];
      let unchangedCount = 0;

      // Categorize items in this batch
      for (const sheetItem of batch) {
        const existingItem = existingItemsMap.get(sheetItem.imei!);

        if (!existingItem) {
          // NEW ITEM
          newItems.push({
            item: {
              imei: sheetItem.imei!,
              model: sheetItem.model || null,
              gb: sheetItem.gb || null,
              color: sheetItem.color || null,
              sku: sheetItem.sku || null,
              currentGrade: sheetItem.grade || null,
              currentLockStatus: sheetItem.lockStatus || null,
              currentLocationId: mainLocation.id,
              currentStatus: 'in_stock',
              firstSeenAt: new Date(),
              lastSeenAt: new Date(),
            },
            movement: {
              movementType: 'added',
              toLocationId: mainLocation.id,
              toStatus: 'in_stock',
              toGrade: sheetItem.grade || null,
              toLockStatus: sheetItem.lockStatus || null,
              source: 'google_sheets_sync',
              performedAt: new Date(),
              snapshotData: sheetItem,
            },
            sheetItem,
          });
        } else {
          // EXISTING ITEM - Check for changes
          const changes = detectChanges(existingItem, sheetItem);

          if (changes.length > 0) {
            updateItems.push({
              existingItem,
              sheetItem,
              changes,
            });
          } else {
            unchangedCount++;
          }
        }
      }

      // Execute batch operations
      try {
        if (newItems.length > 0) {
          await batchInsertNewItems(newItems);
          result.itemsAdded += newItems.length;
          result.movements += newItems.length;
        }

        if (updateItems.length > 0) {
          await batchUpdateItems(updateItems);
          result.itemsUpdated += updateItems.length;
          result.movements += updateItems.reduce((sum, item) => sum + item.changes.length, 0);
        }

        result.itemsUnchanged += unchangedCount;
        result.itemsProcessed += batch.length;

        // Update progress in database every N items
        if (result.itemsProcessed % PROGRESS_UPDATE_INTERVAL === 0 || batchIndex === totalBatches - 1) {
          await updateSyncProgress(syncLog.id, result);
        }

        // Log progress
        const progressPercent = ((batchIndex + 1) / totalBatches * 100).toFixed(1);
        console.log(`⏳ Progress: ${progressPercent}% (${result.itemsProcessed}/${validItems.length} items) - Batch ${batchIndex + 1}/${totalBatches}: +${newItems.length} added, ~${updateItems.length} updated, =${unchangedCount} unchanged`);
      } catch (batchError: any) {
        console.error(`❌ Error processing batch ${batchIndex + 1}:`, batchError.message);
        // Continue with next batch
      }
    }

    // 7. Mark sync as completed
    await completeSyncLog(syncLog.id, result);

    console.log('✅ Sync completed successfully:');
    console.log(`   - Processed: ${result.itemsProcessed}`);
    console.log(`   - Added: ${result.itemsAdded}`);
    console.log(`   - Updated: ${result.itemsUpdated}`);
    console.log(`   - Unchanged: ${result.itemsUnchanged}`);
    console.log(`   - Movements created: ${result.movements}`);

    return result;
  } catch (error: any) {
    console.error('❌ Sync failed:', error);

    // Mark sync log as failed
    await failSyncLog(syncLog.id, error);

    throw error;
  }
}

/**
 * Get latest sync status
 */
export async function getLatestSyncStatus() {
  const [latestSync] = await db
    .select()
    .from(googleSheetsSyncLog)
    .orderBy(sql`${googleSheetsSyncLog.syncStartedAt} DESC`)
    .limit(1);

  return latestSync || null;
}
