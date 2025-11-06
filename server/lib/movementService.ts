import { db } from "../db";
import {
  inventoryItems,
  inventoryMovements,
  shippedImeis,
} from "../db/schema";
import { eq, inArray } from "drizzle-orm";

export interface ShipItemsRequest {
  imeis: string[];
  notes?: string;
  performedBy?: string;
}

export interface ShipItemsResult {
  success: boolean;
  itemsShipped: number;
  movements: Array<{
    imei: string;
    movementId: string;
    previousStatus: string;
  }>;
  errors?: Array<{
    imei: string;
    error: string;
  }>;
}

export interface TransferItemsRequest {
  imeis: string[];
  fromLocationId?: string;
  toLocationId: string;
  notes?: string;
  performedBy?: string;
}

export interface UpdateStatusRequest {
  imei: string;
  updates: {
    grade?: string;
    lockStatus?: string;
  };
  notes?: string;
  performedBy?: string;
}

/**
 * Ship items (mark as shipped and create movement records)
 */
export async function shipItems(request: ShipItemsRequest): Promise<ShipItemsResult> {
  const { imeis, notes, performedBy } = request;

  if (!Array.isArray(imeis) || imeis.length === 0) {
    throw new Error('IMEIs array is required and must not be empty');
  }

  const normalizedIMEIs = imeis.map(i => i.trim()).filter(i => i !== '');

  if (normalizedIMEIs.length === 0) {
    throw new Error('No valid IMEIs provided');
  }

  const movements: Array<{ imei: string; movementId: string; previousStatus: string }> = [];
  const errors: Array<{ imei: string; error: string }> = [];

  try {
    for (const imei of normalizedIMEIs) {
      try {
        const result = await db.transaction(async (tx) => {
          // Get item from database
          const [item] = await tx
            .select()
            .from(inventoryItems)
            .where(eq(inventoryItems.imei, imei))
            .limit(1);

          if (!item) {
            throw new Error(`Item with IMEI ${imei} not found in database`);
          }

          if (item.currentStatus === 'shipped') {
            throw new Error(`Item ${imei} is already shipped`);
          }

          const previousStatus = item.currentStatus;
          const previousLocation = item.currentLocationId;

          // Update item status
          await tx
            .update(inventoryItems)
            .set({
              currentStatus: 'shipped',
              lastSeenAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(inventoryItems.id, item.id));

          // Create movement record
          const [movement] = await tx
            .insert(inventoryMovements)
            .values({
              itemId: item.id,
              movementType: 'shipped',
              fromLocationId: previousLocation,
              fromStatus: previousStatus,
              toStatus: 'shipped',
              notes,
              source: 'manual',
              performedBy,
              performedAt: new Date(),
              snapshotData: {
                imei: item.imei,
                model: item.model,
                gb: item.gb,
                color: item.color,
                sku: item.sku,
                grade: item.currentGrade,
                lockStatus: item.currentLockStatus,
              },
            })
            .returning();

          // Also add to shipped_imeis for backward compatibility
          await tx
            .insert(shippedImeis)
            .values({ imei })
            .onConflictDoNothing();

          return { movementId: movement.id, previousStatus };
        });

        movements.push({
          imei,
          movementId: result.movementId,
          previousStatus: result.previousStatus,
        });

        console.log(`✓ Shipped item: ${imei}`);
      } catch (itemError: any) {
        console.error(`❌ Error shipping item ${imei}:`, itemError.message);
        errors.push({
          imei,
          error: itemError.message,
        });
      }
    }

    return {
      success: errors.length === 0,
      itemsShipped: movements.length,
      movements,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('Error in shipItems:', error);
    throw error;
  }
}

/**
 * Transfer items between locations
 */
export async function transferItems(request: TransferItemsRequest): Promise<any> {
  const { imeis, toLocationId, notes, performedBy } = request;

  if (!Array.isArray(imeis) || imeis.length === 0) {
    throw new Error('IMEIs array is required and must not be empty');
  }

  if (!toLocationId) {
    throw new Error('toLocationId is required');
  }

  const normalizedIMEIs = imeis.map(i => i.trim()).filter(i => i !== '');

  if (normalizedIMEIs.length === 0) {
    throw new Error('No valid IMEIs provided');
  }

  const movements: Array<any> = [];
  const errors: Array<{ imei: string; error: string }> = [];

  try {
    for (const imei of normalizedIMEIs) {
      try {
        const result = await db.transaction(async (tx) => {
          // Get item from database
          const [item] = await tx
            .select()
            .from(inventoryItems)
            .where(eq(inventoryItems.imei, imei))
            .limit(1);

          if (!item) {
            throw new Error(`Item with IMEI ${imei} not found in database`);
          }

          const fromLocationId = item.currentLocationId;

          if (fromLocationId === toLocationId) {
            throw new Error(`Item ${imei} is already at target location`);
          }

          // Update item location
          await tx
            .update(inventoryItems)
            .set({
              currentLocationId: toLocationId,
              lastSeenAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(inventoryItems.id, item.id));

          // Create movement record
          const [movement] = await tx
            .insert(inventoryMovements)
            .values({
              itemId: item.id,
              movementType: 'transferred',
              fromLocationId,
              toLocationId,
              fromStatus: item.currentStatus,
              toStatus: item.currentStatus,
              notes,
              source: 'manual',
              performedBy,
              performedAt: new Date(),
              snapshotData: {
                imei: item.imei,
                model: item.model,
                gb: item.gb,
                color: item.color,
                sku: item.sku,
                grade: item.currentGrade,
                lockStatus: item.currentLockStatus,
              },
            })
            .returning();

          return { movementId: movement.id, fromLocationId };
        });

        movements.push({
          imei,
          movementId: result.movementId,
          fromLocationId: result.fromLocationId,
          toLocationId,
        });

        console.log(`✓ Transferred item: ${imei}`);
      } catch (itemError: any) {
        console.error(`❌ Error transferring item ${imei}:`, itemError.message);
        errors.push({
          imei,
          error: itemError.message,
        });
      }
    }

    return {
      success: errors.length === 0,
      itemsTransferred: movements.length,
      movements,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('Error in transferItems:', error);
    throw error;
  }
}

/**
 * Update item status (grade, lock status, etc.)
 */
export async function updateItemStatus(request: UpdateStatusRequest): Promise<any> {
  const { imei, updates, notes, performedBy } = request;

  if (!imei || imei.trim() === '') {
    throw new Error('IMEI is required');
  }

  if (!updates || (typeof updates !== 'object')) {
    throw new Error('Updates object is required');
  }

  const normalizedIMEI = imei.trim();

  try {
    return await db.transaction(async (tx) => {
      // Get item from database
      const [item] = await tx
        .select()
        .from(inventoryItems)
        .where(eq(inventoryItems.imei, normalizedIMEI))
        .limit(1);

      if (!item) {
        throw new Error(`Item with IMEI ${normalizedIMEI} not found in database`);
      }

      const movements: Array<any> = [];

      // Handle grade change
      if (updates.grade && updates.grade !== item.currentGrade) {
        const [movement] = await tx
          .insert(inventoryMovements)
          .values({
            itemId: item.id,
            movementType: 'grade_changed',
            fromGrade: item.currentGrade,
            toGrade: updates.grade,
            notes,
            source: 'manual',
            performedBy,
            performedAt: new Date(),
            snapshotData: {
              imei: item.imei,
              model: item.model,
              gb: item.gb,
              color: item.color,
              sku: item.sku,
              grade: item.currentGrade,
              lockStatus: item.currentLockStatus,
            },
          })
          .returning();

        movements.push(movement);
        console.log(`✓ Grade changed: ${item.currentGrade} → ${updates.grade}`);
      }

      // Handle lock status change
      if (updates.lockStatus && updates.lockStatus !== item.currentLockStatus) {
        const [movement] = await tx
          .insert(inventoryMovements)
          .values({
            itemId: item.id,
            movementType: 'status_changed',
            fromLockStatus: item.currentLockStatus,
            toLockStatus: updates.lockStatus,
            notes,
            source: 'manual',
            performedBy,
            performedAt: new Date(),
            snapshotData: {
              imei: item.imei,
              model: item.model,
              gb: item.gb,
              color: item.color,
              sku: item.sku,
              grade: item.currentGrade,
              lockStatus: item.currentLockStatus,
            },
          })
          .returning();

        movements.push(movement);
        console.log(`✓ Lock status changed: ${item.currentLockStatus} → ${updates.lockStatus}`);
      }

      // Update the item if there were any changes
      if (movements.length > 0) {
        await tx
          .update(inventoryItems)
          .set({
            currentGrade: updates.grade || item.currentGrade,
            currentLockStatus: updates.lockStatus || item.currentLockStatus,
            lastSeenAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(inventoryItems.id, item.id));
      }

      return {
        success: true,
        imei: normalizedIMEI,
        updatesApplied: movements.length,
        movements,
      };
    });
  } catch (error) {
    console.error('Error updating item status:', error);
    throw error;
  }
}
