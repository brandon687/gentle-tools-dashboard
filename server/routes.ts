import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchInventoryData } from "./lib/googleSheets";
import { db, shippedImeis } from "./db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { syncGoogleSheetsToDatabase, getLatestSyncStatus } from "./lib/inventorySync";
import { searchByIMEI, batchSearchIMEIs, getIMEIHistory } from "./lib/searchService";
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize table on startup
  await ensureTableExists();

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
        // Database storage
        const values = imeis.map(imei => ({ imei: imei.trim() }));

        // Using a transaction to ensure atomicity
        await db.transaction(async (tx) => {
          for (const value of values) {
            await tx.insert(shippedImeis)
              .values(value)
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

  const httpServer = createServer(app);

  return httpServer;
}
