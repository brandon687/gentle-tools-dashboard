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
  grade?: string;
  model?: string;
  gb?: string;
  color?: string;
  lockStatus?: string;
  date?: string;
  concat?: string;
  age?: string;
  [key: string]: any;
}

export interface InventoryStats {
  totalDevices: number;
  byGrade: { grade: string; count: number }[];
  byModel: { model: string; count: number }[];
  byLockStatus: { status: string; count: number }[];
}
