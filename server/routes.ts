import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchInventoryData } from "./lib/googleSheets";

export async function registerRoutes(app: Express): Promise<Server> {
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

  const httpServer = createServer(app);

  return httpServer;
}
