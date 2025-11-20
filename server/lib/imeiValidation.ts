import { db } from "../db";
import { inventoryItems } from "../db/schema";
import { eq } from "drizzle-orm";
import { fetchInventoryData } from "./googleSheets";
import type { RawInventoryRow } from "./googleSheets";
import { inventoryCache } from "./inventoryCache";

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

    let physicalItems: any[] = [];
    try {
      if (db) {
        physicalItems = await db
          .select()
          .from(inventoryItems)
          .where(eq(inventoryItems.isActive, true));
        console.log(`[IMEI Validation] Found ${physicalItems.length} active items in physical inventory database`);
      } else {
        console.warn('[IMEI Validation] Database is null, skipping physical inventory check');
      }
    } catch (dbError) {
      console.error('[IMEI Validation] Error querying physical inventory database:', dbError);
      // Continue to raw inventory check even if DB fails
    }

    const physicalImeiMap = new Map<string, typeof physicalItems[0]>();
    physicalItems.forEach(item => {
      if (item.imei) {
        physicalImeiMap.set(item.imei.trim(), item);
      }
    });

    console.log(`[IMEI Validation] Physical IMEI map contains ${physicalImeiMap.size} unique IMEIs`);

    // Update results for IMEIs found in physical inventory
    cleanedImeis.forEach(imei => {
      const physicalItem = physicalImeiMap.get(imei);
      if (physicalItem) {
        console.log(`[IMEI Validation] Found ${imei} in physical inventory`);
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

    // Step 2: Check Raw Inventory (Google Sheets with caching)
    console.log('[IMEI Validation] Fetching raw inventory from Google Sheets...');

    let rawInventory: RawInventoryRow[] = [];
    let googleSheetsError = false;
    let usedCache = false;

    // Try cache first
    const cachedRawInventory = inventoryCache.get('raw-inventory');
    if (cachedRawInventory && cachedRawInventory.length > 0) {
      rawInventory = cachedRawInventory;
      usedCache = true;
      console.log(`[IMEI Validation] ✅ Using cached raw inventory: ${rawInventory.length} items`);
    } else {
      // Cache miss or empty - fetch fresh
      try {
        console.log('[IMEI Validation] Cache miss - fetching fresh from Google Sheets...');
        const inventoryData = await fetchInventoryData();
        rawInventory = inventoryData.rawInventory || [];
        console.log(`[IMEI Validation] ✅ Successfully fetched raw inventory: ${rawInventory.length} items`);

        // Store in cache for future use (5 minute TTL)
        if (rawInventory.length > 0) {
          inventoryCache.set('raw-inventory', rawInventory, 5 * 60 * 1000);
        }
      } catch (sheetsError) {
        console.error('[IMEI Validation] ⚠️  Failed to fetch raw inventory from Google Sheets:', sheetsError);
        googleSheetsError = true;
        // Continue with empty array - we'll mark these as unknown but still allow the dump
      }
    }

    console.log(`[IMEI Validation] Raw inventory contains ${rawInventory.length} total items`);

    const rawImeiMap = new Map<string, RawInventoryRow>();
    rawInventory.forEach(item => {
      if (item.imei) {
        const cleanedImei = item.imei.trim();
        rawImeiMap.set(cleanedImei, item);
      }
    });

    console.log(`[IMEI Validation] Raw IMEI map contains ${rawImeiMap.size} unique IMEIs`);
    if (rawImeiMap.size > 0) {
      console.log(`[IMEI Validation] Sample IMEIs from raw:`, Array.from(rawImeiMap.keys()).slice(0, 5));
    }
    console.log(`[IMEI Validation] Looking for IMEIs:`, cleanedImeis);

    // Update results for IMEIs found in raw inventory (only if not already found in physical)
    cleanedImeis.forEach(imei => {
      const result = results.get(imei)!;
      if (!result.found) {
        const rawItem = rawImeiMap.get(imei);
        console.log(`[IMEI Validation] Checking raw for ${imei}: ${rawItem ? 'FOUND' : 'NOT FOUND'}`);
        if (rawItem) {
          console.log(`[IMEI Validation] Raw item data:`, {
            imei: rawItem.imei,
            model: rawItem.model,
            grade: rawItem.grade,
            supplier: rawItem.supplier,
          });
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

    if (googleSheetsError && unknownCount > 0) {
      console.warn(`[IMEI Validation] ⚠️  WARNING: Could not verify ${unknownCount} IMEIs against raw inventory due to Google Sheets fetch failure. These IMEIs may actually exist in raw inventory but couldn't be validated.`);
    }

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