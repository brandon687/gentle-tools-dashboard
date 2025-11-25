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
    // Step 1: Fetch BOTH Physical and Raw Inventory from Google Sheets (with caching)
    console.log('[IMEI Validation] Fetching inventory data from Google Sheets...');

    let physicalInventory: any[] = [];
    let rawInventory: RawInventoryRow[] = [];
    let googleSheetsError = false;

    // Try cache first - use partial cache if available (don't require both)
    const cachedPhysicalInventory = inventoryCache.get('physical-inventory');
    const cachedRawInventory = inventoryCache.get('raw-inventory');

    const hasPhysicalCache = cachedPhysicalInventory && cachedPhysicalInventory.length > 0;
    const hasRawCache = cachedRawInventory && cachedRawInventory.length > 0;

    if (hasPhysicalCache && hasRawCache) {
      // Best case: both caches available
      physicalInventory = cachedPhysicalInventory;
      rawInventory = cachedRawInventory;
      console.log(`[IMEI Validation] ✅ Using fully cached data: ${physicalInventory.length} physical, ${rawInventory.length} raw`);
    } else if (hasPhysicalCache || hasRawCache) {
      // Partial cache: use what we have and fetch the rest
      console.log('[IMEI Validation] ⚡ Using partial cache, fetching missing data...');
      physicalInventory = cachedPhysicalInventory || [];
      rawInventory = cachedRawInventory || [];

      try {
        const inventoryData = await fetchInventoryData();

        if (!hasPhysicalCache && inventoryData.physicalInventory) {
          physicalInventory = inventoryData.physicalInventory;
          inventoryCache.set('physical-inventory', physicalInventory as any, 5 * 60 * 1000);
        }
        if (!hasRawCache && inventoryData.rawInventory) {
          rawInventory = inventoryData.rawInventory;
          inventoryCache.set('raw-inventory', rawInventory, 5 * 60 * 1000);
        }
        console.log(`[IMEI Validation] ✅ Fetched missing data: ${physicalInventory.length} physical, ${rawInventory.length} raw`);
      } catch (sheetsError) {
        console.error('[IMEI Validation] ⚠️  Failed to fetch missing inventory:', sheetsError);
        googleSheetsError = true;
      }
    } else {
      // No cache: fetch everything
      try {
        console.log('[IMEI Validation] ⚡ Cache miss - fetching fresh from Google Sheets...');
        const inventoryData = await fetchInventoryData();
        physicalInventory = inventoryData.physicalInventory || [];
        rawInventory = inventoryData.rawInventory || [];
        console.log(`[IMEI Validation] ✅ Successfully fetched: ${physicalInventory.length} physical, ${rawInventory.length} raw`);

        // Store in cache for future use (5 minute TTL)
        if (physicalInventory.length > 0) {
          inventoryCache.set('physical-inventory', physicalInventory as any, 5 * 60 * 1000);
        }
        if (rawInventory.length > 0) {
          inventoryCache.set('raw-inventory', rawInventory, 5 * 60 * 1000);
        }
      } catch (sheetsError) {
        console.error('[IMEI Validation] ⚠️  Failed to fetch inventory from Google Sheets:', sheetsError);
        googleSheetsError = true;
        // Continue with empty arrays - we'll mark these as unknown but still allow the dump
      }
    }

    // Step 2: Check Physical Inventory from Google Sheets
    console.log('[IMEI Validation] Checking physical inventory from Google Sheets...');
    const physicalImeiMap = new Map<string, typeof physicalInventory[0]>();
    physicalInventory.forEach(item => {
      if (item.imei) {
        physicalImeiMap.set(item.imei.trim(), item);
      }
    });

    console.log(`[IMEI Validation] Physical IMEI map contains ${physicalImeiMap.size} unique IMEIs`);

    // Update results for IMEIs found in physical inventory
    cleanedImeis.forEach(imei => {
      const physicalItem = physicalImeiMap.get(imei);
      if (physicalItem) {
        console.log(`[IMEI Validation] ✓ Found ${imei} in physical inventory`);
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

    // Step 3: Check Raw Inventory (for items not found in physical)
    console.log('[IMEI Validation] Checking raw inventory...');
    const rawImeiMap = new Map<string, RawInventoryRow>();
    rawInventory.forEach(item => {
      if (item.imei) {
        const cleanedImei = item.imei.trim();
        rawImeiMap.set(cleanedImei, item);
      }
    });

    console.log(`[IMEI Validation] Raw IMEI map contains ${rawImeiMap.size} unique IMEIs`);

    // Update results for IMEIs found in raw inventory (only if not already found in physical)
    cleanedImeis.forEach(imei => {
      const result = results.get(imei)!;
      if (!result.found) {
        const rawItem = rawImeiMap.get(imei);
        if (rawItem) {
          console.log(`[IMEI Validation] ✓ Found ${imei} in raw inventory`);
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
        } else {
          console.log(`[IMEI Validation] ✗ ${imei} not found in physical or raw inventory`);
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