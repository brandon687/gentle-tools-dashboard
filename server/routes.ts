import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchInventoryData } from "./lib/googleSheets";
import { db, shippedImeis } from "./db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

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

  const httpServer = createServer(app);

  return httpServer;
}
