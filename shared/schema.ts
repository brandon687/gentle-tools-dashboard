import { z } from "zod";

export const inventoryItemSchema = z.object({
  imei: z.string().optional(),
  grade: z.string().optional(),
  model: z.string().optional(),
  gb: z.string().optional(),
  color: z.string().optional(),
  lockStatus: z.string().optional(),
  date: z.string().optional(),
  concat: z.string().optional(),
  age: z.string().optional(),
});

export type InventoryItem = z.infer<typeof inventoryItemSchema>;

export const rawInventoryItemSchema = z.object({
  label: z.string().optional(),
  imei: z.string().optional(),
  model: z.string().optional(),
  gb: z.string().optional(),
  color: z.string().optional(),
  lockStatus: z.string().optional(),
  date: z.string().optional(),
  grade: z.string().optional(),
  supplier: z.string().optional(),
});

export type RawInventoryItem = z.infer<typeof rawInventoryItemSchema>;

export interface InventoryStats {
  totalDevices: number;
  byGrade: Array<{ grade: string; count: number }>;
  byModel: Array<{ model: string; count: number }>;
  byLockStatus: Array<{ status: string; count: number }>;
}

export interface InventoryDataResponse {
  physicalInventory: InventoryItem[];
  gradedToFallout: InventoryItem[];
  rawInventory?: RawInventoryItem[];
}
