import { db } from "../db";
import {
  inventoryItems,
  inventoryMovements,
  type NewInventoryMovement,
} from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { fetchOutboundData, type OutboundSheetRow } from "./googleSheets";

interface OutboundSyncResult {
  itemsProcessed: number;
  itemsShipped: number;
  itemsAlreadyShipped: number;
  itemsNotFound: number;
  errors: Array<{ imei: string; error: string }>;
}

/**
 * Sync outbound IMEIs from Google Sheets and create shipped movement records
 */
export async function syncOutboundImeis(): Promise<OutboundSyncResult> {
  console.log('📦 Starting outbound IMEIs sync...');

  const result: OutboundSyncResult = {
    itemsProcessed: 0,
    itemsShipped: 0,
    itemsAlreadyShipped: 0,
    itemsNotFound: 0,
    errors: [],
  };

  try {
    // Fetch outbound data from Google Sheets
    console.log('📡 Fetching outbound data from Google Sheets...');
    const outboundItems = await fetchOutboundData();
    console.log(`✓ Fetched ${outboundItems.length} outbound items from Google Sheets`);

    if (outboundItems.length > 0) {
      console.log('📋 First outbound item sample:', JSON.stringify(outboundItems[0], null, 2));
    }

    if (outboundItems.length === 0) {
      console.log('⚠ No outbound items found in sheet');
      console.log('📊 Sync result (no items):', result);
      return result;
    }

    result.itemsProcessed = outboundItems.length;

    // Process in batches to avoid database query limits
    const BATCH_SIZE = 500; // Process 500 IMEIs at a time
    const imeis = outboundItems.map(item => item.imei!).filter(Boolean);

    console.log(`📊 Processing ${imeis.length} IMEIs in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < outboundItems.length; i += BATCH_SIZE) {
      const batch = outboundItems.slice(i, i + BATCH_SIZE);
      const batchImeis = batch.map(item => item.imei!).filter(Boolean);

      if (batchImeis.length === 0) continue;

      console.log(`⚙️  Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batchImeis.length} items)...`);

      // Fetch existing items for this batch
      const existingItems = await db
        .select()
        .from(inventoryItems)
        .where(inArray(inventoryItems.imei, batchImeis));

      const existingImeiMap = new Map(existingItems.map(item => [item.imei, item]));

      // Process each outbound item in this batch
      const now = new Date();
      const movementsToCreate: NewInventoryMovement[] = [];
      const itemsToUpdate: Array<{ id: string; imei: string }> = [];

      for (const outboundItem of batch) {
      const imei = outboundItem.imei;
      if (!imei) continue;

      const existingItem = existingImeiMap.get(imei);

      if (!existingItem) {
        // Item not found in inventory
        result.itemsNotFound++;
        result.errors.push({
          imei,
          error: 'IMEI not found in inventory',
        });
        continue;
      }

      // Check if already shipped
      if (existingItem.currentStatus === 'shipped') {
        result.itemsAlreadyShipped++;
        console.log(`⏭ ${imei} already marked as shipped`);
        continue;
      }

      // Prepare movement record
      movementsToCreate.push({
        itemId: existingItem.id,
        movementType: 'shipped',
        fromStatus: existingItem.currentStatus,
        toStatus: 'shipped',
        fromLocationId: existingItem.currentLocationId,
        toLocationId: null, // Items leave inventory when shipped
        source: 'google_sheets_sync',
        performedAt: now,
        notes: `Synced from outbound IMEIs sheet (invno: ${outboundItem.invno}, invtype: ${outboundItem.invtype})`,
        snapshotData: {
          imei: outboundItem.imei,
          model: outboundItem.model,
          capacity: outboundItem.capacity,
          color: outboundItem.color,
          lockStatus: outboundItem.lockStatus,
          graded: outboundItem.graded,
          price: outboundItem.price,
          updatedAt: outboundItem.updatedAt,
          invno: outboundItem.invno,
          invtype: outboundItem.invtype,
        },
      });

        itemsToUpdate.push({
          id: existingItem.id,
          imei: existingItem.imei,
        });
      }

      // Execute updates in a transaction for this batch
      if (movementsToCreate.length > 0) {
        await db.transaction(async (tx) => {
          // Update items status to shipped
          const updatePromises = itemsToUpdate.map(({ id }) =>
            tx
              .update(inventoryItems)
              .set({
                currentStatus: 'shipped',
                updatedAt: now,
              })
              .where(eq(inventoryItems.id, id))
          );

          await Promise.all(updatePromises);

          // Insert movement records
          await tx.insert(inventoryMovements).values(movementsToCreate);

          result.itemsShipped += movementsToCreate.length;
          console.log(`✓ Batch complete: ${movementsToCreate.length} items marked as shipped`);
        });
      }
    }

    console.log('📦 Outbound sync completed:', {
      processed: result.itemsProcessed,
      shipped: result.itemsShipped,
      alreadyShipped: result.itemsAlreadyShipped,
      notFound: result.itemsNotFound,
      errors: result.errors.length,
    });

    console.log('📊 Final result object:', JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ Error syncing outbound IMEIs:', error);
    console.error('❌ Error details:', error.stack);
    throw new Error(`Failed to sync outbound IMEIs: ${error.message}`);
  }
}
