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
 * Add new item to inventory
 */
async function addNewItemToInventory(
  sheetItem: any,
  locationId: string,
  syncLogId: string
) {
  if (!sheetItem.imei) {
    throw new Error('IMEI is required');
  }

  return await db.transaction(async (tx) => {
    // Insert into inventory_items
    const [newItem] = await tx
      .insert(inventoryItems)
      .values({
        imei: sheetItem.imei,
        model: sheetItem.model || null,
        gb: sheetItem.gb || null,
        color: sheetItem.color || null,
        sku: sheetItem.sku || null,
        currentGrade: sheetItem.grade || null,
        currentLockStatus: sheetItem.lockStatus || null,
        currentLocationId: locationId,
        currentStatus: 'in_stock',
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      })
      .returning();

    // Create movement record
    await tx.insert(inventoryMovements).values({
      itemId: newItem.id,
      movementType: 'added',
      toLocationId: locationId,
      toStatus: 'in_stock',
      toGrade: sheetItem.grade || null,
      toLockStatus: sheetItem.lockStatus || null,
      source: 'google_sheets_sync',
      performedAt: new Date(),
      snapshotData: sheetItem,
    });

    return newItem;
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
 * Update item and create movement records
 */
async function updateItemAndCreateMovements(
  existingItem: any,
  sheetItem: any,
  changes: Change[],
  syncLogId: string
) {
  return await db.transaction(async (tx) => {
    // Update inventory_items
    await tx
      .update(inventoryItems)
      .set({
        model: sheetItem.model || existingItem.model,
        gb: sheetItem.gb || existingItem.gb,
        color: sheetItem.color || existingItem.color,
        sku: sheetItem.sku || existingItem.sku,
        currentGrade: sheetItem.grade || existingItem.currentGrade,
        currentLockStatus: sheetItem.lockStatus || existingItem.currentLockStatus,
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(inventoryItems.id, existingItem.id));

    // Create movement records for each change
    for (const change of changes) {
      if (change.type === 'grade') {
        await tx.insert(inventoryMovements).values({
          itemId: existingItem.id,
          movementType: 'grade_changed',
          fromGrade: change.oldValue,
          toGrade: change.newValue,
          source: 'google_sheets_sync',
          performedAt: new Date(),
          snapshotData: sheetItem,
        });
      } else if (change.type === 'lock_status') {
        await tx.insert(inventoryMovements).values({
          itemId: existingItem.id,
          movementType: 'status_changed',
          fromLockStatus: change.oldValue,
          toLockStatus: change.newValue,
          source: 'google_sheets_sync',
          performedAt: new Date(),
          snapshotData: sheetItem,
        });
      }
    }
  });
}

/**
 * Main sync function: Sync Google Sheets data to database
 */
export async function syncGoogleSheetsToDatabase(): Promise<SyncResult> {
  console.log('🔄 Starting Google Sheets to Database sync...');

  try {
    // 1. Fetch current data from Google Sheets
    const sheetsData: InventoryDataResponse = await fetchInventoryData();
    console.log(`📊 Fetched ${sheetsData.physicalInventory.length} items from Google Sheets`);

    // 2. Get default location (create if not exists)
    const mainLocation = await getOrCreateMainLocation();
    console.log(`📍 Using location: ${mainLocation.name} (${mainLocation.code})`);

    // 3. Start sync log
    const syncLog = await createSyncLog();
    console.log(`📝 Created sync log: ${syncLog.id}`);

    const result: SyncResult = {
      itemsProcessed: 0,
      itemsAdded: 0,
      itemsUpdated: 0,
      itemsUnchanged: 0,
      movements: 0,
      syncLogId: syncLog.id,
    };

    // 4. Process each item from Google Sheets
    for (const sheetItem of sheetsData.physicalInventory) {
      if (!sheetItem.imei || sheetItem.imei.trim() === '') {
        console.warn('⚠️  Skipping item with missing IMEI');
        continue;
      }

      result.itemsProcessed++;

      try {
        // Check if item exists in database
        const [existingItem] = await db
          .select()
          .from(inventoryItems)
          .where(eq(inventoryItems.imei, sheetItem.imei))
          .limit(1);

        if (!existingItem) {
          // NEW ITEM - Add to inventory
          await addNewItemToInventory(sheetItem, mainLocation.id, syncLog.id);
          result.itemsAdded++;
          result.movements++;
          console.log(`✓ Added new item: ${sheetItem.imei} (${sheetItem.model})`);
        } else {
          // EXISTING ITEM - Check for changes
          const changes = detectChanges(existingItem, sheetItem);

          if (changes.length > 0) {
            await updateItemAndCreateMovements(
              existingItem,
              sheetItem,
              changes,
              syncLog.id
            );
            result.itemsUpdated++;
            result.movements += changes.length;
            console.log(`↻ Updated item: ${sheetItem.imei} (${changes.length} changes)`);
          } else {
            result.itemsUnchanged++;
          }
        }
      } catch (itemError: any) {
        console.error(`❌ Error processing item ${sheetItem.imei}:`, itemError.message);
        // Continue processing other items
      }
    }

    // 5. Mark sync as completed
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

    // Try to mark sync as failed if we have a sync log
    try {
      if ((error as any).syncLogId) {
        await failSyncLog((error as any).syncLogId, error);
      }
    } catch (logError) {
      console.error('Failed to update sync log:', logError);
    }

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
