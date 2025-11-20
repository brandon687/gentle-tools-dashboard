import { db } from "../db";
import { inventoryItems } from "../db/schema";
import { eq } from "drizzle-orm";
import { fetchInventoryData } from "./googleSheets";
import type { RawInventoryRow } from "./googleSheets";

export interface IMEIValidationResult {
  imei: string;
  found: boolean;
  source: 'physical' | 'raw' | 'unknown';
  model?: string;
  grade?: string;
  supplier?: string;
  gb?: string;
  color?: string;
  lockStatus?: string;
}

/**
 * Validate IMEIs against both physical and raw inventory
 * Returns detailed information about each IMEI including its source
 */
export async function validateIMEIs(imeis: string[]): Promise<IMEIValidationResult[]> {
  if (!imeis || imeis.length === 0) {
    return [];
  }

  // Clean and deduplicate IMEIs
  const cleanedImeis = [...new Set(imeis.map(imei => imei.trim()))];

  console.log(`[IMEI Validation] Validating ${cleanedImeis.length} unique IMEIs`);

  // Initialize results with 'unknown' source
  const results = new Map<string, IMEIValidationResult>();
  cleanedImeis.forEach(imei => {
    results.set(imei, {
      imei,
      found: false,
      source: 'unknown',
    });
  });

  try {
    // Step 1: Check Physical Inventory (database)
    console.log('[IMEI Validation] Checking physical inventory...');
    const physicalItems = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.isActive, true));

    const physicalImeiMap = new Map<string, typeof physicalItems[0]>();
    physicalItems.forEach(item => {
      if (item.imei) {
        physicalImeiMap.set(item.imei, item);
      }
    });

    // Update results for IMEIs found in physical inventory
    cleanedImeis.forEach(imei => {
      const physicalItem = physicalImeiMap.get(imei);
      if (physicalItem) {
        results.set(imei, {
          imei,
          found: true,
          source: 'physical',
          model: physicalItem.model || undefined,
          grade: physicalItem.grade || undefined,
          gb: physicalItem.gb || undefined,
          color: physicalItem.color || undefined,
          lockStatus: physicalItem.lockStatus || undefined,
          // Physical inventory doesn't have supplier info
        });
      }
    });

    // Step 2: Check Raw Inventory (Google Sheets)
    console.log('[IMEI Validation] Fetching raw inventory from Google Sheets...');
    const inventoryData = await fetchInventoryData();
    const rawInventory = inventoryData.rawInventory || [];

    const rawImeiMap = new Map<string, RawInventoryRow>();
    rawInventory.forEach(item => {
      if (item.imei) {
        rawImeiMap.set(item.imei, item);
      }
    });

    // Update results for IMEIs found in raw inventory (only if not already found in physical)
    cleanedImeis.forEach(imei => {
      const result = results.get(imei)!;
      if (!result.found) {
        const rawItem = rawImeiMap.get(imei);
        if (rawItem) {
          results.set(imei, {
            imei,
            found: true,
            source: 'raw',
            model: rawItem.model || undefined,
            grade: rawItem.grade || undefined,
            supplier: rawItem.supplier || undefined,
            gb: rawItem.gb || undefined,
            color: rawItem.color || undefined,
            lockStatus: rawItem.lockStatus || undefined,
          });
        }
      }
    });

    const foundCount = Array.from(results.values()).filter(r => r.found).length;
    const physicalCount = Array.from(results.values()).filter(r => r.source === 'physical').length;
    const rawCount = Array.from(results.values()).filter(r => r.source === 'raw').length;
    const unknownCount = Array.from(results.values()).filter(r => r.source === 'unknown').length;

    console.log(`[IMEI Validation] Results: ${foundCount} found (${physicalCount} physical, ${rawCount} raw), ${unknownCount} not found`);

    return Array.from(results.values());
  } catch (error) {
    console.error('[IMEI Validation] Error during validation:', error);
    // Return partial results even if there's an error
    return Array.from(results.values());
  }
}

/**
 * Get detailed information about a single IMEI
 */
export async function getIMEIInfo(imei: string): Promise<IMEIValidationResult> {
  const results = await validateIMEIs([imei]);
  return results[0] || {
    imei,
    found: false,
    source: 'unknown',
  };
}