import { db } from "../db";
import {
  inventoryItems,
  inventoryMovements,
  inventoryLocations,
} from "../db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";

export interface IMEISearchResult {
  found: boolean;
  imei: string;
  currentStatus?: string;
  currentLocation?: {
    id: string;
    name: string;
    code: string;
  } | null;
  currentGrade?: string | null;
  currentLockStatus?: string | null;
  model?: string | null;
  gb?: string | null;
  color?: string | null;
  sku?: string | null;
  lastMovement?: {
    type: string;
    date: Date;
    notes?: string | null;
  } | null;
  daysInInventory?: number;
  firstSeenAt?: Date;
  lastSeenAt?: Date;
}

export interface BatchSearchResult {
  results: IMEISearchResult[];
  summary: {
    total: number;
    found: number;
    notFound: number;
  };
}

/**
 * Search for a device by IMEI
 * Returns whether the device is currently in inventory and its details
 */
export async function searchByIMEI(imei: string): Promise<IMEISearchResult> {
  if (!imei || imei.trim() === '') {
    throw new Error('IMEI is required');
  }

  const normalizedIMEI = imei.trim();

  try {
    // Query the database for the item
    const [item] = await db
      .select({
        item: inventoryItems,
        location: inventoryLocations,
      })
      .from(inventoryItems)
      .leftJoin(
        inventoryLocations,
        eq(inventoryItems.currentLocationId, inventoryLocations.id)
      )
      .where(eq(inventoryItems.imei, normalizedIMEI))
      .limit(1);

    if (!item) {
      // Item not found in database
      return {
        found: false,
        imei: normalizedIMEI,
      };
    }

    // Get the last movement for this item
    const [lastMovement] = await db
      .select()
      .from(inventoryMovements)
      .where(eq(inventoryMovements.itemId, item.item.id))
      .orderBy(desc(inventoryMovements.performedAt))
      .limit(1);

    // Calculate days in inventory
    const firstSeen = item.item.firstSeenAt;
    const now = new Date();
    const daysInInventory = Math.floor(
      (now.getTime() - firstSeen.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Determine if item is currently "in inventory"
    const isInInventory = item.item.currentStatus === 'in_stock';

    return {
      found: true,
      imei: normalizedIMEI,
      currentStatus: item.item.currentStatus,
      currentLocation: item.location
        ? {
            id: item.location.id,
            name: item.location.name,
            code: item.location.code,
          }
        : null,
      currentGrade: item.item.currentGrade,
      currentLockStatus: item.item.currentLockStatus,
      model: item.item.model,
      gb: item.item.gb,
      color: item.item.color,
      sku: item.item.sku,
      lastMovement: lastMovement
        ? {
            type: lastMovement.movementType,
            date: lastMovement.performedAt,
            notes: lastMovement.notes,
          }
        : null,
      daysInInventory: isInInventory ? daysInInventory : undefined,
      firstSeenAt: item.item.firstSeenAt,
      lastSeenAt: item.item.lastSeenAt,
    };
  } catch (error) {
    console.error('Error searching for IMEI:', error);
    throw error;
  }
}

/**
 * Batch search for multiple IMEIs
 * Useful for bulk operations like scanning multiple devices
 */
export async function batchSearchIMEIs(imeis: string[]): Promise<BatchSearchResult> {
  if (!Array.isArray(imeis) || imeis.length === 0) {
    throw new Error('IMEIs array is required');
  }

  // Normalize IMEIs
  const normalizedIMEIs = imeis.map(imei => imei.trim()).filter(imei => imei !== '');

  if (normalizedIMEIs.length === 0) {
    return {
      results: [],
      summary: {
        total: 0,
        found: 0,
        notFound: 0,
      },
    };
  }

  try {
    // Query all items at once for efficiency
    const items = await db
      .select({
        item: inventoryItems,
        location: inventoryLocations,
      })
      .from(inventoryItems)
      .leftJoin(
        inventoryLocations,
        eq(inventoryItems.currentLocationId, inventoryLocations.id)
      )
      .where(inArray(inventoryItems.imei, normalizedIMEIs));

    // Create a map of IMEI to item for quick lookup
    const itemMap = new Map(
      items.map(item => [item.item.imei, item])
    );

    // Get last movements for all found items
    const foundItemIds = items.map(item => item.item.id);
    let lastMovements: any[] = [];

    if (foundItemIds.length > 0) {
      // Get the most recent movement for each item
      lastMovements = await db
        .select()
        .from(inventoryMovements)
        .where(inArray(inventoryMovements.itemId, foundItemIds))
        .orderBy(desc(inventoryMovements.performedAt));
    }

    // Create a map of itemId to last movement
    const movementMap = new Map<string, any>();
    for (const movement of lastMovements) {
      if (!movementMap.has(movement.itemId)) {
        movementMap.set(movement.itemId, movement);
      }
    }

    // Build results for each IMEI
    const results: IMEISearchResult[] = normalizedIMEIs.map(imei => {
      const item = itemMap.get(imei);

      if (!item) {
        return {
          found: false,
          imei,
        };
      }

      const lastMovement = movementMap.get(item.item.id);
      const now = new Date();
      const daysInInventory = Math.floor(
        (now.getTime() - item.item.firstSeenAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isInInventory = item.item.currentStatus === 'in_stock';

      return {
        found: true,
        imei,
        currentStatus: item.item.currentStatus,
        currentLocation: item.location
          ? {
              id: item.location.id,
              name: item.location.name,
              code: item.location.code,
            }
          : null,
        currentGrade: item.item.currentGrade,
        currentLockStatus: item.item.currentLockStatus,
        model: item.item.model,
        gb: item.item.gb,
        color: item.item.color,
        sku: item.item.sku,
        lastMovement: lastMovement
          ? {
              type: lastMovement.movementType,
              date: lastMovement.performedAt,
              notes: lastMovement.notes,
            }
          : null,
        daysInInventory: isInInventory ? daysInInventory : undefined,
        firstSeenAt: item.item.firstSeenAt,
        lastSeenAt: item.item.lastSeenAt,
      };
    });

    // Calculate summary
    const foundCount = results.filter(r => r.found).length;

    return {
      results,
      summary: {
        total: normalizedIMEIs.length,
        found: foundCount,
        notFound: normalizedIMEIs.length - foundCount,
      },
    };
  } catch (error) {
    console.error('Error in batch IMEI search:', error);
    throw error;
  }
}

/**
 * Get movement history for an IMEI
 */
export async function getIMEIHistory(imei: string, limit: number = 50) {
  if (!imei || imei.trim() === '') {
    throw new Error('IMEI is required');
  }

  const normalizedIMEI = imei.trim();

  try {
    // Get the item
    const [item] = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.imei, normalizedIMEI))
      .limit(1);

    if (!item) {
      return {
        found: false,
        imei: normalizedIMEI,
        movements: [],
      };
    }

    // Get all movements for this item
    const movements = await db
      .select({
        movement: inventoryMovements,
        fromLocation: inventoryLocations,
        toLocation: inventoryLocations,
      })
      .from(inventoryMovements)
      .leftJoin(
        inventoryLocations,
        eq(inventoryMovements.fromLocationId, inventoryLocations.id)
      )
      .leftJoin(
        inventoryLocations,
        eq(inventoryMovements.toLocationId, inventoryLocations.id)
      )
      .where(eq(inventoryMovements.itemId, item.id))
      .orderBy(desc(inventoryMovements.performedAt))
      .limit(limit);

    return {
      found: true,
      imei: normalizedIMEI,
      currentStatus: item.currentStatus,
      currentGrade: item.currentGrade,
      currentLockStatus: item.currentLockStatus,
      model: item.model,
      gb: item.gb,
      color: item.color,
      movements: movements.map(m => ({
        id: m.movement.id,
        movementType: m.movement.movementType,
        fromStatus: m.movement.fromStatus,
        toStatus: m.movement.toStatus,
        fromGrade: m.movement.fromGrade,
        toGrade: m.movement.toGrade,
        fromLockStatus: m.movement.fromLockStatus,
        toLockStatus: m.movement.toLockStatus,
        fromLocation: m.fromLocation
          ? {
              id: m.fromLocation.id,
              name: m.fromLocation.name,
              code: m.fromLocation.code,
            }
          : null,
        toLocation: m.toLocation
          ? {
              id: m.toLocation.id,
              name: m.toLocation.name,
              code: m.toLocation.code,
            }
          : null,
        notes: m.movement.notes,
        source: m.movement.source,
        performedBy: m.movement.performedBy,
        performedAt: m.movement.performedAt,
        snapshotData: m.movement.snapshotData,
      })),
    };
  } catch (error) {
    console.error('Error getting IMEI history:', error);
    throw error;
  }
}
