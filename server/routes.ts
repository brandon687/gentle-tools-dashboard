import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchInventoryData } from "./lib/googleSheets";
import { db, shippedImeis, googleSheetsSyncLog, inventoryItems } from "./db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { syncGoogleSheetsToDatabase, getLatestSyncStatus } from "./lib/inventorySync";
import { syncOutboundImeis } from "./lib/outboundSync";
import { searchByIMEI, batchSearchIMEIs, getIMEIHistory, getAllMovements } from "./lib/searchService";
import { shipItems, transferItems, updateItemStatus } from "./lib/movementService";
import {
  generateDailySnapshot,
  getSnapshotByDate,
  getSnapshotsByDateRange,
  getDateRangeSummary,
} from "./lib/reportGenerator";

// In-memory fallback if database isn't available
let inMemoryShippedIMEIs: string[] = [];
let useInMemory = false;

// Try to create the table if it doesn't exist
async function ensureTableExists() {
  if (!db) {
    console.log('📦 Using in-memory storage for shipped IMEIs (no database configured)');
    useInMemory = true;
    return;
  }

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS shipped_imeis (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        imei TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✅ shipped_imeis table ready');
  } catch (error) {
    console.warn('⚠️  Database table creation failed, using in-memory storage:', error);
    useInMemory = true;
  }
}

/**
 * Clean up stale "in_progress" syncs on server startup
 * Marks syncs older than 1 hour as failed to prevent UI confusion
 */
async function cleanupStaleSyncs() {
  if (useInMemory || !db) return;

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const result = await db
      .update(googleSheetsSyncLog)
      .set({
        status: 'failed',
        syncCompletedAt: new Date(),
        errorMessage: 'Sync was interrupted or timed out (cleaned up on server restart)',
      })
      .where(
        sql`${googleSheetsSyncLog.status} = 'in_progress' AND ${googleSheetsSyncLog.syncStartedAt} < ${oneHourAgo}`
      )
      .returning();

    if (result.length > 0) {
      console.log(`🧹 Cleaned up ${result.length} stale in-progress sync(s)`);
    }
  } catch (error) {
    console.warn('⚠️  Failed to clean up stale syncs:', error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize table on startup
  await ensureTableExists();

  // Clean up stale syncs
  await cleanupStaleSyncs();

  app.get('/api/inventory', async (req, res) => {
    try {
      const data = await fetchInventoryData();
      res.json(data);
    } catch (error: any) {
      console.error('Error in /api/inventory:', error);
      res.status(500).json({
        error: 'Failed to fetch inventory data',
        message: error.message
      });
    }
  });

  // Get all shipped IMEIs
  app.get('/api/shipped-imeis', async (req, res) => {
    try {
      if (useInMemory) {
        res.json(inMemoryShippedIMEIs);
      } else {
        const imeis = await db.select().from(shippedImeis);
        res.json(imeis.map(row => row.imei));
      }
    } catch (error: any) {
      console.error('Error in /api/shipped-imeis GET:', error);
      res.status(500).json({
        error: 'Failed to fetch shipped IMEIs',
        message: error.message
      });
    }
  });

  // Add shipped IMEIs (bulk)
  app.post('/api/shipped-imeis', async (req, res) => {
    try {
      const { imeis } = req.body;

      if (!Array.isArray(imeis) || imeis.length === 0) {
        return res.status(400).json({ error: 'Invalid imeis array' });
      }

      if (useInMemory) {
        // In-memory storage
        const newImeis = imeis.map(i => i.trim());
        inMemoryShippedIMEIs = [...new Set([...inMemoryShippedIMEIs, ...newImeis])];
        res.json(inMemoryShippedIMEIs);
      } else {
        // Database storage - batch insert with chunking for large datasets
        const values = imeis.map(imei => ({ imei: imei.trim() }));

        // Chunk into batches of 500 to avoid parameter limits
        const BATCH_SIZE = 500;
        const chunks = [];
        for (let i = 0; i < values.length; i += BATCH_SIZE) {
          chunks.push(values.slice(i, i + BATCH_SIZE));
        }

        // Insert each chunk in a transaction
        await db.transaction(async (tx) => {
          for (const chunk of chunks) {
            await tx.insert(shippedImeis)
              .values(chunk)
              .onConflictDoNothing(); // Ignore duplicates
          }
        });

        // Return updated list
        const allImeis = await db.select().from(shippedImeis);
        res.json(allImeis.map(row => row.imei));
      }
    } catch (error: any) {
      console.error('Error in /api/shipped-imeis POST:', error);
      res.status(500).json({
        error: 'Failed to add shipped IMEIs',
        message: error.message
      });
    }
  });

  // Delete all shipped IMEIs
  app.delete('/api/shipped-imeis', async (req, res) => {
    try {
      if (useInMemory) {
        inMemoryShippedIMEIs = [];
      } else {
        await db.delete(shippedImeis);
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error in /api/shipped-imeis DELETE:', error);
      res.status(500).json({
        error: 'Failed to clear shipped IMEIs',
        message: error.message
      });
    }
  });

  // Delete specific IMEI
  app.delete('/api/shipped-imeis/:imei', async (req, res) => {
    try {
      const { imei } = req.params;
      if (useInMemory) {
        inMemoryShippedIMEIs = inMemoryShippedIMEIs.filter(i => i !== imei);
      } else {
        await db.delete(shippedImeis).where(eq(shippedImeis.imei, imei));
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error in /api/shipped-imeis/:imei DELETE:', error);
      res.status(500).json({
        error: 'Failed to delete IMEI',
        message: error.message
      });
    }
  });

  // ============================================================================
  // NEW DATABASE-BACKED ENDPOINTS
  // ============================================================================

  // -----------------------------
  // INVENTORY SYNC ENDPOINTS
  // -----------------------------

  // Manually trigger Google Sheets sync
  app.post('/api/sync/sheets', async (req, res) => {
    if (useInMemory || !db) {
      return res.status(503).json({
        error: 'Database not available',
        message: 'Sync functionality requires database connection'
      });
    }

    try {
      console.log('🔄 Manual sync triggered');
      const result = await syncGoogleSheetsToDatabase();
      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error('Error in /api/sync/sheets:', error);
      res.status(500).json({
        error: 'Sync failed',
        message: error.message
      });
    }
  });

  // Get latest sync status
  app.get('/api/sync/status', async (req, res) => {
    if (useInMemory || !db) {
      return res.status(503).json({
        error: 'Database not available'
      });
    }

    try {
      const status = await getLatestSyncStatus();
      res.json(status || { message: 'No sync has been run yet' });
    } catch (error: any) {
      console.error('Error in /api/sync/status:', error);
      res.status(500).json({
        error: 'Failed to get sync status',
        message: error.message
      });
    }
  });

  // Fix stuck sync records - updates frozen "in_progress" syncs
  app.post('/api/sync/fix-stuck', async (req, res) => {
    if (useInMemory || !db) {
      return res.status(503).json({
        error: 'Database not available',
        message: 'Fix functionality requires database connection'
      });
    }

    try {
      console.log('🔧 Fixing stuck sync records...');

      // Find stuck sync records (in_progress for more than 10 minutes)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const stuckSyncs = await db
        .select()
        .from(googleSheetsSyncLog)
        .where(
          sql`${googleSheetsSyncLog.status} = 'in_progress' AND ${googleSheetsSyncLog.syncStartedAt} < ${tenMinutesAgo}`
        );

      if (stuckSyncs.length === 0) {
        return res.json({
          success: true,
          message: 'No stuck syncs found',
          fixed: 0
        });
      }

      console.log(`📊 Found ${stuckSyncs.length} stuck sync(s)`);

      // Get actual item counts from database
      const [itemCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(inventoryItems);

      const totalItems = Number(itemCount.count);
      console.log(`📦 Database contains ${totalItems} items`);

      // Update each stuck sync
      for (const stuckSync of stuckSyncs) {
        console.log(`🔄 Fixing sync ${stuckSync.id}...`);

        await db
          .update(googleSheetsSyncLog)
          .set({
            status: 'completed',
            syncCompletedAt: new Date(),
            itemsProcessed: totalItems,
            itemsAdded: stuckSync.itemsAdded || 0,
            itemsUpdated: stuckSync.itemsUpdated || 0,
            itemsUnchanged: totalItems - (stuckSync.itemsAdded || 0) - (stuckSync.itemsUpdated || 0),
            sheetsRowCount: totalItems,
            dbItemCount: totalItems,
            errorMessage: 'Auto-completed by fix-stuck endpoint after timeout',
          })
          .where(eq(googleSheetsSyncLog.id, stuckSync.id));

        console.log(`✓ Fixed sync ${stuckSync.id}`);
      }

      res.json({
        success: true,
        message: `Fixed ${stuckSyncs.length} stuck sync(s)`,
        fixed: stuckSyncs.length,
        totalItemsInDatabase: totalItems,
        fixedSyncs: stuckSyncs.map(s => ({
          id: s.id,
          startedAt: s.syncStartedAt,
          wasProcessed: s.itemsProcessed || 0,
          nowProcessed: totalItems
        }))
      });
    } catch (error: any) {
      console.error('Error in /api/sync/fix-stuck:', error);
      res.status(500).json({
        error: 'Failed to fix stuck syncs',
        message: error.message
      });
    }
  });

  // Get outbound IMEIs with server-side search and pagination
  app.get('/api/outbound-imeis', async (req, res) => {
    try {
      const { fetchOutboundData } = await import('./lib/googleSheets');
      const { search, limit = '50', offset = '0' } = req.query;

      console.log('📦 Fetching outbound IMEIs from Google Sheets...');
      const allItems = await fetchOutboundData();

      // Server-side filtering
      let filteredItems = allItems;
      if (search && typeof search === 'string' && search.trim().length >= 3) {
        const searchLower = search.toLowerCase().trim();
        filteredItems = allItems.filter(item =>
          item.imei?.toLowerCase().includes(searchLower) ||
          item.model?.toLowerCase().includes(searchLower) ||
          item.invno?.toLowerCase().includes(searchLower)
        );
        console.log(`🔍 Filtered ${filteredItems.length} items matching "${search}"`);
      }

      // Pagination
      const limitNum = parseInt(limit as string);
      const offsetNum = parseInt(offset as string);
      const paginatedItems = filteredItems.slice(offsetNum, offsetNum + limitNum);

      res.json({
        success: true,
        items: paginatedItems,
        pagination: {
          total: filteredItems.length,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < filteredItems.length
        }
      });
    } catch (error: any) {
      console.error('Error fetching outbound IMEIs:', error);
      res.status(500).json({
        error: 'Failed to fetch outbound IMEIs',
        message: error.message
      });
    }
  });

  // Sync outbound IMEIs from Google Sheets
  app.post('/api/sync/outbound', async (req, res) => {
    if (useInMemory || !db) {
      return res.status(503).json({
        error: 'Database not available',
        message: 'Outbound sync functionality requires database connection'
      });
    }

    try {
      console.log('📦 Outbound IMEIs sync triggered');
      const result = await syncOutboundImeis();
      res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error('Error in /api/sync/outbound:', error);
      res.status(500).json({
        error: 'Outbound sync failed',
        message: error.message
      });
    }
  });

  // -----------------------------
  // IMEI SEARCH ENDPOINTS
  // -----------------------------

  // Search for single IMEI
  app.get('/api/search/imei/:imei', async (req, res) => {
    if (useInMemory || !db) {
      return res.status(503).json({
        error: 'Database not available',
        message: 'Search functionality requires database connection'
      });
    }

    try {
      const { imei } = req.params;
      const result = await searchByIMEI(imei);
      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/search/imei/:imei:', error);
      res.status(500).json({
        error: 'Search failed',
        message: error.message
      });
    }
  });

  // Batch search for multiple IMEIs
  app.post('/api/search/imei/batch', async (req, res) => {
    if (useInMemory || !db) {
      return res.status(503).json({
        error: 'Database not available',
        message: 'Search functionality requires database connection'
      });
    }

    try {
      const { imeis } = req.body;

      if (!Array.isArray(imeis)) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'imeis must be an array'
        });
      }

      const result = await batchSearchIMEIs(imeis);
      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/search/imei/batch:', error);
      res.status(500).json({
        error: 'Batch search failed',
        message: error.message
      });
    }
  });

  // Get movement history for an IMEI
  app.get('/api/movements/:imei/history', async (req, res) => {
    if (useInMemory || !db) {
      return res.status(503).json({
        error: 'Database not available',
        message: 'Movement history requires database connection'
      });
    }

    try {
      const { imei } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const result = await getIMEIHistory(imei, limit);
      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/movements/:imei/history:', error);
      res.status(500).json({
        error: 'Failed to get movement history',
        message: error.message
      });
    }
  });

  // Get all movements with optional filters
  app.get('/api/movements', async (req, res) => {
    if (useInMemory || !db) {
      return res.status(503).json({
        error: 'Database not available',
        message: 'Movement history requires database connection'
      });
    }

    try {
      const { movementType, startDate, endDate, limit, offset, imei } = req.query;

      const params = {
        movementType: movementType as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        imei: imei as string | undefined,
      };

      const result = await getAllMovements(params);
      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/movements:', error);
      res.status(500).json({
        error: 'Failed to get movements',
        message: error.message
      });
    }
  });

  // -----------------------------
  // MOVEMENT ENDPOINTS
  // -----------------------------

  // Ship items (creates movement records)
  app.post('/api/movements/ship', async (req, res) => {
    if (useInMemory || !db) {
      return res.status(503).json({
        error: 'Database not available',
        message: 'Movement tracking requires database connection'
      });
    }

    try {
      const { imeis, notes, performedBy } = req.body;

      if (!Array.isArray(imeis) || imeis.length === 0) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'imeis array is required'
        });
      }

      const result = await shipItems({ imeis, notes, performedBy });
      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/movements/ship:', error);
      res.status(500).json({
        error: 'Failed to ship items',
        message: error.message
      });
    }
  });

  // Transfer items between locations
  app.post('/api/movements/transfer', async (req, res) => {
    if (useInMemory || !db) {
      return res.status(503).json({
        error: 'Database not available',
        message: 'Movement tracking requires database connection'
      });
    }

    try {
      const { imeis, fromLocationId, toLocationId, notes, performedBy } = req.body;

      if (!Array.isArray(imeis) || imeis.length === 0) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'imeis array is required'
        });
      }

      if (!toLocationId) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'toLocationId is required'
        });
      }

      const result = await transferItems({
        imeis,
        fromLocationId,
        toLocationId,
        notes,
        performedBy,
      });
      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/movements/transfer:', error);
      res.status(500).json({
        error: 'Failed to transfer items',
        message: error.message
      });
    }
  });

  // Update item status (grade, lock status)
  app.post('/api/movements/update-status', async (req, res) => {
    if (useInMemory || !db) {
      return res.status(503).json({
        error: 'Database not available',
        message: 'Movement tracking requires database connection'
      });
    }

    try {
      const { imei, updates, notes, performedBy } = req.body;

      if (!imei) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'imei is required'
        });
      }

      if (!updates || typeof updates !== 'object') {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'updates object is required'
        });
      }

      const result = await updateItemStatus({
        imei,
        updates,
        notes,
        performedBy,
      });
      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/movements/update-status:', error);
      res.status(500).json({
        error: 'Failed to update status',
        message: error.message
      });
    }
  });

  // -----------------------------
  // DAILY REPORT ENDPOINTS
  // -----------------------------

  // Generate daily snapshot (manual trigger)
  app.post('/api/reports/generate-snapshot', async (req, res) => {
    if (useInMemory || !db) {
      return res.status(503).json({
        error: 'Database not available',
        message: 'Reports require database connection'
      });
    }

    try {
      const { date, locationId } = req.body;
      const snapshotDate = date ? new Date(date) : new Date();

      const result = await generateDailySnapshot({
        date: snapshotDate,
        locationId,
      });
      res.json({
        success: true,
        snapshot: result,
      });
    } catch (error: any) {
      console.error('Error in /api/reports/generate-snapshot:', error);
      res.status(500).json({
        error: 'Failed to generate snapshot',
        message: error.message
      });
    }
  });

  // Get snapshot for specific date
  app.get('/api/reports/daily/:date', async (req, res) => {
    if (useInMemory || !db) {
      return res.status(503).json({
        error: 'Database not available',
        message: 'Reports require database connection'
      });
    }

    try {
      const { date } = req.params;
      const locationId = req.query.locationId as string | undefined;

      const snapshot = await getSnapshotByDate(date, locationId);

      if (!snapshot) {
        return res.status(404).json({
          error: 'Snapshot not found',
          message: `No snapshot found for date ${date}`
        });
      }

      res.json(snapshot);
    } catch (error: any) {
      console.error('Error in /api/reports/daily/:date:', error);
      res.status(500).json({
        error: 'Failed to get snapshot',
        message: error.message
      });
    }
  });

  // Get snapshots for date range
  app.get('/api/reports/daily/range', async (req, res) => {
    if (useInMemory || !db) {
      return res.status(503).json({
        error: 'Database not available',
        message: 'Reports require database connection'
      });
    }

    try {
      const { startDate, endDate, locationId } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'startDate and endDate query parameters are required'
        });
      }

      const snapshots = await getSnapshotsByDateRange(
        startDate as string,
        endDate as string,
        locationId as string | undefined
      );

      res.json({
        startDate,
        endDate,
        snapshots,
      });
    } catch (error: any) {
      console.error('Error in /api/reports/daily/range:', error);
      res.status(500).json({
        error: 'Failed to get snapshots',
        message: error.message
      });
    }
  });

  // Get summary for date range
  app.get('/api/reports/summary', async (req, res) => {
    if (useInMemory || !db) {
      return res.status(503).json({
        error: 'Database not available',
        message: 'Reports require database connection'
      });
    }

    try {
      const { startDate, endDate, locationId } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'startDate and endDate query parameters are required'
        });
      }

      const summary = await getDateRangeSummary(
        startDate as string,
        endDate as string,
        locationId as string | undefined
      );

      res.json(summary);
    } catch (error: any) {
      console.error('Error in /api/reports/summary:', error);
      res.status(500).json({
        error: 'Failed to get summary',
        message: error.message
      });
    }
  });

  // -----------------------------
  // HEALTH CHECK
  // -----------------------------

  app.get('/api/health', async (req, res) => {
    try {
      const health: any = {
        status: 'healthy',
        database: useInMemory ? 'in-memory' : 'connected',
        timestamp: new Date(),
      };

      if (!useInMemory && db) {
        const syncStatus = await getLatestSyncStatus();
        health.lastSync = syncStatus?.syncCompletedAt || null;
      }

      res.json(health);
    } catch (error: any) {
      console.error('Error in /api/health:', error);
      res.status(500).json({
        status: 'unhealthy',
        error: error.message
      });
    }
  });

  // Debug endpoint to check environment variables
  app.get('/api/debug/env', (req, res) => {
    const dbUrl = process.env.DATABASE_URL;
    res.json({
      hasDatabaseUrl: !!dbUrl,
      databaseUrlLength: dbUrl?.length || 0,
      databaseUrlPrefix: dbUrl?.substring(0, 20) || 'not set',
      useInMemory,
      dbExists: !!db,
      nodeEnv: process.env.NODE_ENV,
    });
  });

  const httpServer = createServer(app);

  return httpServer;
}
