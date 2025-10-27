import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export interface InventoryItem {
  id: string;
  imei?: string;
  deviceModel?: string;
  brand?: string;
  status?: string;
  location?: string;
  condition?: string;
  stockLevel?: number;
  category?: string;
  serialNumber?: string;
  purchaseDate?: string;
  price?: number;
  supplier?: string;
  notes?: string;
  [key: string]: any;
}

export interface InventoryStats {
  totalDevices: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  categories: { name: string; count: number }[];
}
