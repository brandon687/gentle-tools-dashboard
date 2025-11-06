import { db } from "../db";
import {
  inventoryItems,
  inventoryMovements,
  dailyInventorySnapshots,
  inventoryLocations,
} from "../db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

interface DailySnapshotOptions {
  date?: Date;
  locationId?: string;
}

interface DailySnapshotResult {
  date: string;
  locationId: string | null;
  locationName: string | null;
  totalDevices: number;
  totalValue?: number;
  byGrade: Record<string, number>;
  byModel: Record<string, number>;
  byLockStatus: Record<string, number>;
  dailyActivity: {
    added: number;
    shipped: number;
    transferred: number;
    statusChanges: number;
  };
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get start of day (00:00:00)
 */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day (23:59:59.999)
 */
function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Generate daily inventory snapshot
 * This should be run at the end of each day (or can be run manually for any date)
 */
export async function generateDailySnapshot(
  options: DailySnapshotOptions = {}
): Promise<DailySnapshotResult> {
  const { date = new Date(), locationId } = options;
  const snapshotDate = formatDate(date);

  console.log(`📊 Generating daily snapshot for ${snapshotDate}...`);

  try {
    // Get location info if specified
    let location = null;
    if (locationId) {
      const [loc] = await db
        .select()
        .from(inventoryLocations)
        .where(eq(inventoryLocations.id, locationId))
        .limit(1);
      location = loc;
    }

    // Get all items that are currently in stock (at end of day)
    const itemsQuery = db
      .select()
      .from(inventoryItems)
      .where(
        and(
          eq(inventoryItems.currentStatus, 'in_stock'),
          locationId ? eq(inventoryItems.currentLocationId, locationId) : sql`true`
        )
      );

    const items = await itemsQuery;

    console.log(`   Found ${items.length} items in stock`);

    // Calculate aggregations
    const gradeBreakdown: Record<string, number> = {};
    const modelBreakdown: Record<string, number> = {};
    const lockStatusBreakdown: Record<string, number> = {};

    for (const item of items) {
      // Grade breakdown
      const grade = item.currentGrade || 'Unknown';
      gradeBreakdown[grade] = (gradeBreakdown[grade] || 0) + 1;

      // Model breakdown
      const model = item.model || 'Unknown';
      modelBreakdown[model] = (modelBreakdown[model] || 0) + 1;

      // Lock status breakdown
      const lockStatus = item.currentLockStatus || 'Unknown';
      lockStatusBreakdown[lockStatus] = (lockStatusBreakdown[lockStatus] || 0) + 1;
    }

    // Get daily movements (for the entire day)
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const dailyMovementsQuery = db
      .select()
      .from(inventoryMovements)
      .where(
        and(
          gte(inventoryMovements.performedAt, dayStart),
          lte(inventoryMovements.performedAt, dayEnd),
          locationId
            ? sql`(${inventoryMovements.fromLocationId} = ${locationId} OR ${inventoryMovements.toLocationId} = ${locationId})`
            : sql`true`
        )
      );

    const dailyMovements = await dailyMovementsQuery;

    console.log(`   Found ${dailyMovements.length} movements for the day`);

    // Count movements by type
    const dailyAdded = dailyMovements.filter(m => m.movementType === 'added').length;
    const dailyShipped = dailyMovements.filter(m => m.movementType === 'shipped').length;
    const dailyTransferred = dailyMovements.filter(m => m.movementType === 'transferred').length;
    const dailyStatusChanges = dailyMovements.filter(m =>
      ['grade_changed', 'status_changed'].includes(m.movementType)
    ).length;

    // Insert or update snapshot
    await db
      .insert(dailyInventorySnapshots)
      .values({
        snapshotDate,
        locationId: locationId || null,
        totalDevices: items.length,
        gradeBreakdown,
        modelBreakdown,
        lockStatusBreakdown,
        dailyAdded,
        dailyShipped,
        dailyTransferred,
        dailyStatusChanges,
        fullSnapshot: items, // Store full details for queries
      })
      .onConflictDoUpdate({
        target: [
          dailyInventorySnapshots.snapshotDate,
          sql`COALESCE(${dailyInventorySnapshots.locationId}, 'null_location')`,
        ],
        set: {
          totalDevices: items.length,
          gradeBreakdown,
          modelBreakdown,
          lockStatusBreakdown,
          dailyAdded,
          dailyShipped,
          dailyTransferred,
          dailyStatusChanges,
          fullSnapshot: items,
        },
      });

    console.log(`✅ Snapshot generated successfully`);

    return {
      date: snapshotDate,
      locationId: locationId || null,
      locationName: location?.name || null,
      totalDevices: items.length,
      byGrade: gradeBreakdown,
      byModel: modelBreakdown,
      byLockStatus: lockStatusBreakdown,
      dailyActivity: {
        added: dailyAdded,
        shipped: dailyShipped,
        transferred: dailyTransferred,
        statusChanges: dailyStatusChanges,
      },
    };
  } catch (error) {
    console.error('Error generating daily snapshot:', error);
    throw error;
  }
}

/**
 * Get snapshot for a specific date
 */
export async function getSnapshotByDate(
  date: string,
  locationId?: string
): Promise<DailySnapshotResult | null> {
  try {
    const query = db
      .select()
      .from(dailyInventorySnapshots)
      .where(
        and(
          eq(dailyInventorySnapshots.snapshotDate, date),
          locationId
            ? eq(dailyInventorySnapshots.locationId, locationId)
            : sql`${dailyInventorySnapshots.locationId} IS NULL`
        )
      )
      .limit(1);

    const [snapshot] = await query;

    if (!snapshot) {
      return null;
    }

    // Get location name if applicable
    let locationName = null;
    if (snapshot.locationId) {
      const [location] = await db
        .select()
        .from(inventoryLocations)
        .where(eq(inventoryLocations.id, snapshot.locationId))
        .limit(1);
      locationName = location?.name || null;
    }

    return {
      date: snapshot.snapshotDate,
      locationId: snapshot.locationId,
      locationName,
      totalDevices: snapshot.totalDevices,
      totalValue: snapshot.totalValue ? Number(snapshot.totalValue) : undefined,
      byGrade: snapshot.gradeBreakdown as Record<string, number>,
      byModel: snapshot.modelBreakdown as Record<string, number>,
      byLockStatus: snapshot.lockStatusBreakdown as Record<string, number>,
      dailyActivity: {
        added: snapshot.dailyAdded,
        shipped: snapshot.dailyShipped,
        transferred: snapshot.dailyTransferred,
        statusChanges: snapshot.dailyStatusChanges,
      },
    };
  } catch (error) {
    console.error('Error getting snapshot by date:', error);
    throw error;
  }
}

/**
 * Get snapshots for a date range
 */
export async function getSnapshotsByDateRange(
  startDate: string,
  endDate: string,
  locationId?: string
): Promise<DailySnapshotResult[]> {
  try {
    const query = db
      .select()
      .from(dailyInventorySnapshots)
      .where(
        and(
          gte(dailyInventorySnapshots.snapshotDate, startDate),
          lte(dailyInventorySnapshots.snapshotDate, endDate),
          locationId
            ? eq(dailyInventorySnapshots.locationId, locationId)
            : sql`${dailyInventorySnapshots.locationId} IS NULL`
        )
      )
      .orderBy(dailyInventorySnapshots.snapshotDate);

    const snapshots = await query;

    // Get location names for all snapshots
    const locationIds = [...new Set(snapshots.map(s => s.locationId).filter(Boolean))];
    const locations = await db
      .select()
      .from(inventoryLocations)
      .where(sql`${inventoryLocations.id} IN (${sql.join(locationIds, sql`, `)})`);

    const locationMap = new Map(locations.map(l => [l.id, l.name]));

    return snapshots.map(snapshot => ({
      date: snapshot.snapshotDate,
      locationId: snapshot.locationId,
      locationName: snapshot.locationId ? locationMap.get(snapshot.locationId) || null : null,
      totalDevices: snapshot.totalDevices,
      totalValue: snapshot.totalValue ? Number(snapshot.totalValue) : undefined,
      byGrade: snapshot.gradeBreakdown as Record<string, number>,
      byModel: snapshot.modelBreakdown as Record<string, number>,
      byLockStatus: snapshot.lockStatusBreakdown as Record<string, number>,
      dailyActivity: {
        added: snapshot.dailyAdded,
        shipped: snapshot.dailyShipped,
        transferred: snapshot.dailyTransferred,
        statusChanges: snapshot.dailyStatusChanges,
      },
    }));
  } catch (error) {
    console.error('Error getting snapshots by date range:', error);
    throw error;
  }
}

/**
 * Get summary statistics for a date range
 */
export async function getDateRangeSummary(
  startDate: string,
  endDate: string,
  locationId?: string
): Promise<any> {
  try {
    const snapshots = await getSnapshotsByDateRange(startDate, endDate, locationId);

    if (snapshots.length === 0) {
      return {
        startDate,
        endDate,
        totalSnapshots: 0,
        summary: {
          totalAdded: 0,
          totalShipped: 0,
          totalTransferred: 0,
          totalStatusChanges: 0,
          netChange: 0,
          startingInventory: 0,
          endingInventory: 0,
        },
      };
    }

    const totalAdded = snapshots.reduce((sum, s) => sum + s.dailyActivity.added, 0);
    const totalShipped = snapshots.reduce((sum, s) => sum + s.dailyActivity.shipped, 0);
    const totalTransferred = snapshots.reduce((sum, s) => sum + s.dailyActivity.transferred, 0);
    const totalStatusChanges = snapshots.reduce((sum, s) => sum + s.dailyActivity.statusChanges, 0);

    const startingInventory = snapshots[0].totalDevices;
    const endingInventory = snapshots[snapshots.length - 1].totalDevices;
    const netChange = endingInventory - startingInventory;

    return {
      startDate,
      endDate,
      totalSnapshots: snapshots.length,
      dailySnapshots: snapshots,
      summary: {
        totalAdded,
        totalShipped,
        totalTransferred,
        totalStatusChanges,
        netChange,
        startingInventory,
        endingInventory,
      },
    };
  } catch (error) {
    console.error('Error getting date range summary:', error);
    throw error;
  }
}
